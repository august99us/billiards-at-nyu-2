<script lang="ts">
	import type { Match, TournamentPlayer } from '$lib/types';
	import { matchIsPlayable } from '$lib/tournament';
	import { goto } from '$app/navigation';
	import { SvelteMap } from 'svelte/reactivity';

	let {
		matches,
		players,
		tournamentId
	}: {
		matches: Match[];
		players: TournamentPlayer[];
		tournamentId: string;
	} = $props();

	const bracketMatches = $derived(
		matches
			.filter((m) => m.phase === 'bracket')
			.sort((a, b) => {
				const ra = a.metadata.round ?? 0;
				const rb = b.metadata.round ?? 0;
				if (ra !== rb) return rb - ra; // ascending round number (round 3 first, then 2, then 1/final)
				return (a.metadata.match_number ?? 0) - (b.metadata.match_number ?? 0);
			})
	);

	// Group matches by round (descending = first round first on screen)
	const rounds = $derived.by(() => {
		const map = new SvelteMap<number, Match[]>();
		for (const m of bracketMatches) {
			const r = m.metadata.round ?? 0;
			if (!map.has(r)) map.set(r, []);
			map.get(r)!.push(m);
		}
		// Sort rounds: highest round number first (earliest round)
		return [...map.entries()].sort((a, b) => b[0] - a[0]);
	});

	function playerName(uid: string | null): string {
		if (!uid) return 'TBD';
		return players.find((p) => p.uid === uid)?.displayName ?? 'Unknown';
	}

	function tierLabel(match: Match): string {
		switch (match.metadata.tier) {
			case 'finals':
				return 'Final';
			case 'semiFinals':
				return 'Semi-Final';
			default:
				return `Round ${match.metadata.round ?? ''}`;
		}
	}

	function handleMatchClick(match: Match) {
		if (
			matchIsPlayable(match, matches) ||
			match.state === 'started' ||
			match.state === 'in_progress'
		) {
			goto(`/tournament/${tournamentId}/match/${match.id}`);
		}
	}
</script>

<div class="overflow-x-auto">
	{#if bracketMatches.length === 0}
		<p class="py-4 text-sm opacity-40">No bracket matches yet.</p>
	{:else}
		<div class="flex min-w-max gap-4 pb-4">
			{#each rounds as [roundNum, roundMatches] (roundNum)}
				<div class="flex w-44 flex-col gap-3">
					<div class="border-b border-fg-top pb-1 text-center text-xs opacity-40">
						{roundMatches[0] ? tierLabel(roundMatches[0]) : `Round ${roundNum}`}
					</div>
					{#each roundMatches as match (match.id)}
						{@const playable = matchIsPlayable(match, matches)}
						{@const active = match.state === 'started' || match.state === 'in_progress'}
						<button
							onclick={() => handleMatchClick(match)}
							disabled={!playable &&
								!active &&
								match.state !== 'completed' &&
								match.state !== 'forfeited'}
							class="w-full rounded border bg-mid p-2 text-left transition-all
								{match.state === 'completed' || match.state === 'forfeited'
								? 'border-fg-top opacity-70'
								: active
									? 'border-yellow-500/50 bg-fg'
									: playable
										? 'cursor-pointer border-fg-super hover:bg-fg'
										: 'cursor-not-allowed border-fg-top opacity-40'}"
						>
							<!-- P1 -->
							<div class="flex items-center justify-between border-b border-fg-top py-1">
								<span
									class="max-w-[100px] truncate text-xs
									{match.winner === match.p1_id ? 'font-bold text-green-400' : ''}"
								>
									{playerName(match.p1_id)}
								</span>
								<span
									class="ml-2 text-xs tabular-nums {match.winner === match.p1_id
										? 'text-green-400'
										: 'opacity-60'}"
								>
									{match.p1_wins}
								</span>
							</div>
							<!-- P2 -->
							<div class="flex items-center justify-between py-1">
								<span
									class="max-w-[100px] truncate text-xs
									{match.winner === match.p2_id ? 'font-bold text-green-400' : ''}"
								>
									{playerName(match.p2_id)}
								</span>
								<span
									class="ml-2 text-xs tabular-nums {match.winner === match.p2_id
										? 'text-green-400'
										: 'opacity-60'}"
								>
									{match.p2_wins}
								</span>
							</div>
							<!-- Status chip -->
							{#if active}
								<div class="mt-1 text-[10px] text-yellow-400">● In progress</div>
							{:else if match.state === 'completed'}
								<div class="mt-1 text-[10px] text-green-400">✓ Done</div>
							{:else if match.state === 'forfeited'}
								<div class="mt-1 text-[10px] opacity-50">Forfeited</div>
							{/if}
						</button>
					{/each}
				</div>
			{/each}
		</div>
	{/if}
</div>
