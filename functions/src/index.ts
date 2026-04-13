import {initializeApp} from "firebase-admin/app";
import {setGlobalOptions} from "firebase-functions";
import {onDocumentUpdated} from "firebase-functions/v2/firestore";
import {generateRRMatches, generateBracketMatches, advanceBracketWinner} from "./tournament";

initializeApp();

setGlobalOptions({maxInstances: 10});

/**
 * Listens for tournament status transitions that require server-side work:
 *  - setup → rr_awaiting      : generate all round-robin match documents
 *  - round_robin → bracket_awaiting : compute RR standings, generate bracket
 */
export const onTournamentUpdate = onDocumentUpdated(
  "tournaments/{tournamentId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    const tournamentId = event.params.tournamentId;
    const tournamentRef = event.data!.after.ref;

    // Setup → RR awaiting: generate round robin matches
    if (before.status === "setup" && after.status === "rr_awaiting") {
      try {
        await generateRRMatches(tournamentId, after as never);
        await tournamentRef.update({status: "round_robin"});
      } catch (err) {
        console.error("generateRRMatches failed:", err);
        // Roll back so the organizer can retry
        await tournamentRef.update({status: "setup"});
      }
      return;
    }

    // Round robin → bracket awaiting: compute standings + generate bracket
    if (before.status === "round_robin" && after.status === "bracket_awaiting") {
      try {
        await generateBracketMatches(tournamentId, after as never);
        await tournamentRef.update({status: "bracket"});
      } catch (err) {
        console.error("generateBracketMatches failed:", err);
        await tournamentRef.update({status: "round_robin"});
      }
      return;
    }
  }
);

/**
 * Listens for match score updates:
 *  1. Detects when a player's win count reaches win_con → sets winner + completed
 *  2. When a bracket match completes → advances winner to next match
 */
export const onMatchUpdate = onDocumentUpdated(
  "tournaments/{tournamentId}/matches/{matchId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    const {tournamentId} = event.params;
    const matchRef = event.data!.after.ref;

    // ── Win detection ──────────────────────────────────────────────────────
    // Only act if winner isn't already set and scores changed
    if (
      !after.winner &&
      (before.p1_wins !== after.p1_wins || before.p2_wins !== after.p2_wins)
    ) {
      const wc: number = after.win_con;
      let winner: string | null = null;

      if (after.p1_wins >= wc && after.p1_id) {
        winner = after.p1_id;
      } else if (after.p2_wins >= wc && after.p2_id) {
        winner = after.p2_id;
      }

      if (winner) {
        await matchRef.update({winner, state: "completed"});
        // The update above will re-trigger this function with winner now set,
        // which will fall into the bracket advancement block below.
        return;
      }
    }

    // ── Bracket advancement ───────────────────────────────────────────────
    // Act when winner was just set on a bracket match
    if (
      after.phase === "bracket" &&
      !before.winner &&
      after.winner
    ) {
      await advanceBracketWinner(tournamentId, after);
    }
  }
);
