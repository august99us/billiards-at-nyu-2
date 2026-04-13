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
	const standings = $derived(
		tournament ? computeStandings(tournament.players, rrMatches) : []
	);

	function playerName(uid: string | null): string {
		if (!uid) return 'TBD';
		return tournament?.players.find((p) => p.uid === uid)?.displayName ?? 'Unknown';
	}

	function stateChip(state: Match['state']): string {
		switch (state) {
			case 'pending': return 'opacity-40';
			case 'started':
			case 'in_progress': return 'text-yellow-400';
			case 'completed': return 'text-green-400';
			case 'forfeited': return 'opacity-40';
		}
	}

	function stateLabel(state: Match['state']): string {
		switch (state) {
			case 'pending': return 'Pending';
			case 'started': return 'Started';
			case 'in_progress': return 'In Progress';
			case 'completed': return 'Done';
			case 'forfeited': return 'Forfeited';
		}
	}
</script>

<div class="mb-4">
	<a href="/tournament/{tournamentId}" class="text-xs opacity-40 hover:opacity-70">← Back</a>
	<h2 class="text-lg font-bold mt-1">Round Robin</h2>
</div>

{#if tournament}
	<RoundRobinStandings {standings} players={tournament.players} />

	<h3 class="text-sm font-bold mt-6 mb-3 opacity-70">All Matches</h3>

	{#if rrMatches.length === 0}
		<p class="text-sm opacity-40">No matches yet.</p>
	{:else}
		<div class="flex flex-col gap-2">
			{#each rrMatches as match (match.id)}
				<button
					onclick={() => goto(`/tournament/${tournamentId}/match/${match.id}`)}
					class="bg-mid hover:bg-fg-top border border-fg-top rounded p-3 text-left transition-colors w-full"
				>
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2 min-w-0">
							<!-- P1 -->
							<span class="text-sm truncate max-w-[100px] {match.winner === match.p1_id ? 'text-green-400 font-bold' : ''}">
								{playerName(match.p1_id)}
							</span>
							<!-- Score -->
							<span class="text-sm tabular-nums shrink-0 opacity-70">
								{match.p1_wins} – {match.p2_wins}
							</span>
							<!-- P2 -->
							<span class="text-sm truncate max-w-[100px] {match.winner === match.p2_id ? 'text-green-400 font-bold' : ''}">
								{playerName(match.p2_id)}
							</span>
						</div>
						<span class="text-xs shrink-0 ml-2 {stateChip(match.state)}">
							{stateLabel(match.state)}
						</span>
					</div>
					<div class="text-xs opacity-40 mt-1">Best of {match.win_con * 2 - 1}</div>
				</button>
			{/each}
		</div>
	{/if}
{/if}
