import type { Timestamp } from 'firebase/firestore';

export type TournamentStatus =
	| 'setup'
	| 'rr_awaiting'
	| 'round_robin'
	| 'bracket_awaiting'
	| 'bracket'
	| 'complete';

export type BracketType = 'single_elim' | 'double_elim';
export type BestOf = 1 | 3 | 5 | 7;
export type MatchTier = 'standard' | 'semiFinals' | 'finals';
export type MatchPhase = 'round_robin' | 'bracket';
export type MatchState = 'pending' | 'started' | 'in_progress' | 'completed' | 'forfeited';

export interface TournamentPlayer {
	uid: string;
	displayName: string;
}

export interface TournamentConfig {
	roundRobin: {
		bestOf: BestOf;
	};
	bracket: {
		type: BracketType;
		sets: {
			standard: BestOf;
			semiFinals: BestOf;
			finals: BestOf;
		};
	};
}

export interface Tournament {
	id: string;
	name: string;
	game_type: string;
	status: TournamentStatus;
	createdBy: string;
	createdAt: Timestamp;
	players: TournamentPlayer[];
	config: TournamentConfig;
	winner?: string; // uid of champion, set when status === 'complete'
}

export interface MatchMetadata {
	// Round robin
	rr_pair?: [string, string];
	// Bracket
	round?: number;
	match_number?: number;
	tier?: MatchTier;
	slot?: 'winners';
}

export interface Match {
	id: string;
	phase: MatchPhase;
	state: MatchState;
	depends_on: string[];
	win_con: number;
	p1_id: string | null;
	p2_id: string | null;
	p1_wins: number;
	p2_wins: number;
	winner: string | null;
	next_winner_match_id: string | null;
	metadata: MatchMetadata;
}

export interface UserProfile {
	uid: string;
	displayName: string;
	email: string | null;
	photoURL: string | null;
}
