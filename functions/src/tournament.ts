import * as admin from "firebase-admin";

// Lazy getter — avoids calling admin.firestore() before initializeApp() runs in index.ts
const db = () => admin.firestore();

// ─── Types ──────────────────────────────────────────────────────────────────

type MatchTier = "standard" | "semiFinals" | "finals";

interface TournamentPlayer {
  uid: string;
  displayName: string;
}

interface TournamentConfig {
  roundRobin: {bestOf: number};
  bracket: {
    type: string;
    sets: {standard: number; semiFinals: number; finals: number};
  };
}

interface Tournament {
  players: TournamentPlayer[];
  config: TournamentConfig;
  createdBy: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function winCon(bestOf: number): number {
  return Math.ceil(bestOf / 2);
}

function tierFromRound(round: number): MatchTier {
  if (round === 1) return "finals";
  if (round === 2) return "semiFinals";
  return "standard";
}

/**
 * Standard bracket seeding for `slots` positions (must be a power of 2).
 * Returns seed numbers (1-indexed) for each slot position.
 */
function bracketSeeding(slots: number): number[] {
  if (slots === 1) return [1];
  const half = bracketSeeding(slots / 2);
  const result: number[] = [];
  for (const s of half) {
    result.push(s, slots + 1 - s);
  }
  return result;
}

// ─── Round Robin ─────────────────────────────────────────────────────────────

export async function generateRRMatches(
  tournamentId: string,
  tournament: Tournament
): Promise<void> {
  const {players, config} = tournament;
  const wc = winCon(config.roundRobin.bestOf);
  const matchesRef = db().collection(`tournaments/${tournamentId}/matches`);
  const batch = db().batch();

  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const p1 = players[i].uid;
      const p2 = players[j].uid;
      const matchRef = matchesRef.doc();
      batch.set(matchRef, {
        phase: "round_robin",
        state: "pending",
        depends_on: [],
        win_con: wc,
        p1_id: p1,
        p2_id: p2,
        p1_wins: 0,
        p2_wins: 0,
        winner: null,
        next_winner_match_id: null,
        metadata: {
          rr_pair: [p1, p2].sort(),
        },
      });
    }
  }

  await batch.commit();
}

// ─── Standings ───────────────────────────────────────────────────────────────

interface Standing {
  uid: string;
  wins: number;
  losses: number;
  setsWon: number;
  setsLost: number;
}

async function computeStandings(
  tournamentId: string,
  players: TournamentPlayer[]
): Promise<Standing[]> {
  const snap = await db()
    .collection(`tournaments/${tournamentId}/matches`)
    .where("phase", "==", "round_robin")
    .get();

  const map = new Map<string, Standing>(
    players.map((p) => [
      p.uid,
      {uid: p.uid, wins: 0, losses: 0, setsWon: 0, setsLost: 0},
    ])
  );

  for (const doc of snap.docs) {
    const m = doc.data();
    if (m.state !== "completed" || !m.winner || !m.p1_id || !m.p2_id) continue;
    const loser = m.winner === m.p1_id ? m.p2_id : m.p1_id;
    const w = map.get(m.winner);
    const l = map.get(loser);
    if (w) {
      w.wins++;
      w.setsWon += m.winner === m.p1_id ? m.p1_wins : m.p2_wins;
      w.setsLost += m.winner === m.p1_id ? m.p2_wins : m.p1_wins;
    }
    if (l) {
      l.losses++;
      l.setsWon += loser === m.p1_id ? m.p1_wins : m.p2_wins;
      l.setsLost += loser === m.p1_id ? m.p2_wins : m.p1_wins;
    }
  }

  return [...map.values()].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.setsWon - b.setsLost - (a.setsWon - a.setsLost);
  });
}

// ─── Bracket ─────────────────────────────────────────────────────────────────

interface MatchNode {
  id: string;
  round: number;
  matchNumber: number;
  p1: string | null;
  p2: string | null;
  p1FeederMatchId: string | null;
  p2FeederMatchId: string | null;
  nextMatchId: string | null;
  nextMatchSlot: "p1" | "p2" | null;
}

type Slot = string | null | MatchNode;

function isMatchNode(slot: Slot): slot is MatchNode {
  return slot !== null && typeof slot === "object";
}

export async function generateBracketMatches(
  tournamentId: string,
  tournament: Tournament
): Promise<void> {
  const {players, config} = tournament;
  const standings = await computeStandings(tournamentId, players);
  const seededUids = standings.map((s) => s.uid);
  const N = seededUids.length;

  let slots = 1;
  while (slots < N) slots <<= 1;

  const numRounds = Math.log2(slots);
  const seedOrder = bracketSeeding(slots);

  let currentSlots: Slot[] = seedOrder.map((seed) =>
    seed <= N ? seededUids[seed - 1] : null
  );

  const allMatches: MatchNode[] = [];
  const matchesRef = db().collection(`tournaments/${tournamentId}/matches`);
  let roundNum = numRounds;

  while (currentSlots.length > 1) {
    const nextSlots: Slot[] = [];
    let matchNumInRound = 1;

    for (let i = 0; i < currentSlots.length; i += 2) {
      const left = currentSlots[i];
      const right = currentSlots[i + 1];

      if (left === null && right === null) {
        nextSlots.push(null);
        continue;
      }
      if (left === null) {
        nextSlots.push(right);
        continue;
      }
      if (right === null) {
        nextSlots.push(left);
        continue;
      }

      const matchId = matchesRef.doc().id;
      const node: MatchNode = {
        id: matchId,
        round: roundNum,
        matchNumber: matchNumInRound++,
        p1: typeof left === "string" ? left : null,
        p2: typeof right === "string" ? right : null,
        p1FeederMatchId: isMatchNode(left) ? left.id : null,
        p2FeederMatchId: isMatchNode(right) ? right.id : null,
        nextMatchId: null,
        nextMatchSlot: null,
      };
      allMatches.push(node);
      nextSlots.push(node);
    }

    currentSlots = nextSlots;
    roundNum--;
  }

  for (const m of allMatches) {
    if (m.p1FeederMatchId) {
      const feeder = allMatches.find((x) => x.id === m.p1FeederMatchId);
      if (feeder) {
        feeder.nextMatchId = m.id;
        feeder.nextMatchSlot = "p1";
      }
    }
    if (m.p2FeederMatchId) {
      const feeder = allMatches.find((x) => x.id === m.p2FeederMatchId);
      if (feeder) {
        feeder.nextMatchId = m.id;
        feeder.nextMatchSlot = "p2";
      }
    }
  }

  const batch = db().batch();
  for (const m of allMatches) {
    const t = tierFromRound(m.round);
    let wc: number;
    if (t === "finals") wc = winCon(config.bracket.sets.finals);
    else if (t === "semiFinals") wc = winCon(config.bracket.sets.semiFinals);
    else wc = winCon(config.bracket.sets.standard);

    const dependsOn: string[] = [];
    if (m.p1FeederMatchId) dependsOn.push(m.p1FeederMatchId);
    if (m.p2FeederMatchId) dependsOn.push(m.p2FeederMatchId);

    batch.set(db().doc(`tournaments/${tournamentId}/matches/${m.id}`), {
      phase: "bracket",
      state: "pending",
      depends_on: dependsOn,
      win_con: wc,
      p1_id: m.p1,
      p2_id: m.p2,
      p1_wins: 0,
      p2_wins: 0,
      winner: null,
      next_winner_match_id: m.nextMatchId,
      metadata: {
        round: m.round,
        match_number: m.matchNumber,
        tier: t,
        slot: "winners",
        next_winner_slot: m.nextMatchSlot,
      },
    });
  }

  await batch.commit();
}

// ─── Bracket advancement ──────────────────────────────────────────────────────

export async function advanceBracketWinner(
  tournamentId: string,
  matchData: admin.firestore.DocumentData
): Promise<void> {
  const {winner, next_winner_match_id, metadata} = matchData;
  if (!winner) return;

  if (!next_winner_match_id) {
    await db().doc(`tournaments/${tournamentId}`).update({
      status: "complete",
      winner,
    });
    return;
  }

  const nextSlot = metadata?.next_winner_slot as "p1" | "p2" | undefined;
  if (!nextSlot) return;

  const nextMatchRef = db().doc(
    `tournaments/${tournamentId}/matches/${next_winner_match_id}`
  );
  const nextSnap = await nextMatchRef.get();
  if (!nextSnap.exists) return;

  const nextData = nextSnap.data()!;
  const playerField = nextSlot === "p1" ? "p1_id" : "p2_id";
  const otherField = nextSlot === "p1" ? "p2_id" : "p1_id";

  const update: Record<string, unknown> = {[playerField]: winner};
  if (nextData[otherField] !== null) {
    update.state = "pending";
  }

  await nextMatchRef.update(update);
}
