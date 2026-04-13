<script lang="ts">
	import { getContext } from 'svelte';
	import { db } from '$lib/firebase';
	import { collection, onSnapshot } from 'firebase/firestore';
	import { onMount, onDestroy } from 'svelte';
	import { computeStandings } from '$lib/tournament';
	import type { Tournament, Match } from '$lib/types';
	import RoundRobinStandings from '$lib/components/RoundRobinStandings.svelte';
	import { goto } from '$app/navigation';

	const ctx = getContext<{ data: Tournament | null; id: string }>('tournament');
	const tournament = $derived(ctx.data);
	const tournamentId = $derived(ctx.id);

	let matches = $state<Match[]>([]);
	let unsub: (() => void) | null = null;

	onMount(() => {
		unsub = onSnapshot(collection(db, 'tournaments', tournamentId, 'matches'), (snap) => {
			matches = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Match);
		});
	});

	onDestroy(() => unsub?.());

	const rrMatches = $derived(matches.filter((m) => m.phase === 'round_robin'));
	const standings = $derived(tournament ? computeStandings(tournament.players, rrMatches) : []);

	function playerName(uid: string | null): string {
		if (!uid) return 'TBD';
		return tournament?.players.find((p) => p.uid === uid)?.displayName ?? 'Unknown';
	}

	function stateChip(state: Match['state']): string {
		switch (state) {
			case 'pending':
				return 'opacity-40';
			case 'started':
			case 'in_progress':
				return 'text-yellow-400';
			case 'completed':
				return 'text-green-400';
			case 'forfeited':
				return 'opacity-40';
		}
	}

	function stateLabel(state: Match['state']): string {
		switch (state) {
			case 'pending':
				return 'Pending';
			case 'started':
				return 'Started';
			case 'in_progress':
				return 'In Progress';
			case 'completed':
				return 'Done';
			case 'forfeited':
				return 'Forfeited';
		}
	}
</script>

<div class="mb-4">
	<a href="/tournament/{tournamentId}" class="text-xs opacity-40 hover:opacity-70">← Back</a>
	<h2 class="mt-1 text-lg font-bold">Round Robin</h2>
</div>

{#if tournament}
	<RoundRobinStandings {standings} />

	<h3 class="mt-6 mb-3 text-sm font-bold opacity-70">All Matches</h3>

	{#if rrMatches.length === 0}
		<p class="text-sm opacity-40">No matches yet.</p>
	{:else}
		<div class="flex flex-col gap-2">
			{#each rrMatches as match (match.id)}
				<button
					onclick={() => goto(`/tournament/${tournamentId}/match/${match.id}`)}
					class="w-full rounded border border-fg-top bg-mid p-3 text-left transition-colors hover:bg-fg-top"
				>
					<div class="flex items-center justify-between">
						<div class="flex min-w-0 items-center gap-2">
							<!-- P1 -->
							<span
								class="max-w-[100px] truncate text-sm {match.winner === match.p1_id
									? 'font-bold text-green-400'
									: ''}"
							>
								{playerName(match.p1_id)}
							</span>
							<!-- Score -->
							<span class="shrink-0 text-sm tabular-nums opacity-70">
								{match.p1_wins} – {match.p2_wins}
							</span>
							<!-- P2 -->
							<span
								class="max-w-[100px] truncate text-sm {match.winner === match.p2_id
									? 'font-bold text-green-400'
									: ''}"
							>
								{playerName(match.p2_id)}
							</span>
						</div>
						<span class="ml-2 shrink-0 text-xs {stateChip(match.state)}">
							{stateLabel(match.state)}
						</span>
					</div>
					<div class="mt-1 text-xs opacity-40">Best of {match.win_con * 2 - 1}</div>
				</button>
			{/each}
		</div>
	{/if}
{/if}
