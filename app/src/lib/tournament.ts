import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { Match, Tournament, TournamentPlayer } from './types';

/** win_con: games needed to win a set (e.g. best-of-3 → 2) */
export function winCon(bestOf: number): number {
	return Math.ceil(bestOf / 2);
}

/** Compute round-robin standings from a player list and completed matches */
export interface Standing {
	uid: string;
	displayName: string;
	wins: number;
	losses: number;
	setsWon: number;
	setsLost: number;
}

export function computeStandings(players: TournamentPlayer[], matches: Match[]): Standing[] {
	const map = new Map<string, Standing>();
	for (const p of players) {
		map.set(p.uid, {
			uid: p.uid,
			displayName: p.displayName,
			wins: 0,
			losses: 0,
			setsWon: 0,
			setsLost: 0
		});
	}

	for (const m of matches) {
		if (m.phase !== 'round_robin' || m.state !== 'completed' || !m.winner || !m.p1_id || !m.p2_id)
			continue;
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
		// Tiebreak: set differential
		const aDiff = a.setsWon - a.setsLost;
		const bDiff = b.setsWon - b.setsLost;
		return bDiff - aDiff;
	});
}

/** Returns true if a match's depends_on matches are all completed */
export function matchIsPlayable(match: Match, allMatches: Match[]): boolean {
	if (!match.p1_id || !match.p2_id) return false;
	if (match.depends_on.length === 0) return true;
	const matchMap = new Map(allMatches.map((m) => [m.id, m]));
	return match.depends_on.every((id) => matchMap.get(id)?.state === 'completed');
}

/** Write status: 'rr_awaiting' — Cloud Function takes over from here */
export async function startRoundRobin(tournamentId: string): Promise<void> {
	await updateDoc(doc(db, 'tournaments', tournamentId), { status: 'rr_awaiting' });
}

/** Write status: 'bracket_awaiting' — Cloud Function takes over from here */
export async function startBracket(tournamentId: string): Promise<void> {
	await updateDoc(doc(db, 'tournaments', tournamentId), { status: 'bracket_awaiting' });
}

/** Increment a player's win count for a match */
export async function addWin(
	tournamentId: string,
	matchId: string,
	player: 'p1' | 'p2',
	currentWins: number
): Promise<void> {
	const field = player === 'p1' ? 'p1_wins' : 'p2_wins';
	await updateDoc(doc(db, 'tournaments', tournamentId, 'matches', matchId), {
		[field]: currentWins + 1,
		state: 'in_progress'
	});
}

/** Directly set a player's win count (correction input) */
export async function setWins(
	tournamentId: string,
	matchId: string,
	player: 'p1' | 'p2',
	wins: number
): Promise<void> {
	const field = player === 'p1' ? 'p1_wins' : 'p2_wins';
	await updateDoc(doc(db, 'tournaments', tournamentId, 'matches', matchId), {
		[field]: Math.max(0, wins),
		state: 'in_progress'
	});
}

/** Start a match (pending → started) */
export async function startMatch(tournamentId: string, matchId: string): Promise<void> {
	await updateDoc(doc(db, 'tournaments', tournamentId, 'matches', matchId), {
		state: 'started'
	});
}

/** Forfeit a match */
export async function forfeitMatch(
	tournamentId: string,
	matchId: string,
	winnerId: string
): Promise<void> {
	await updateDoc(doc(db, 'tournaments', tournamentId, 'matches', matchId), {
		state: 'forfeited',
		winner: winnerId
	});
}

/** Return display label for a tournament status */
export function statusLabel(status: Tournament['status']): string {
	switch (status) {
		case 'setup':
			return 'Setup';
		case 'rr_awaiting':
			return 'Generating round robin…';
		case 'round_robin':
			return 'Round Robin';
		case 'bracket_awaiting':
			return 'Generating bracket…';
		case 'bracket':
			return 'Bracket';
		case 'complete':
			return 'Complete';
	}
}
