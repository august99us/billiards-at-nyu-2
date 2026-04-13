<script lang="ts">
	import { getContext } from 'svelte';
	import { authStore } from '$lib/auth.svelte';
	import { db } from '$lib/firebase';
	import { collection, onSnapshot } from 'firebase/firestore';
	import { onMount, onDestroy } from 'svelte';
	import { statusLabel, computeStandings, startBracket } from '$lib/tournament';
	import type { Tournament, Match } from '$lib/types';
	import RoundRobinStandings from '$lib/components/RoundRobinStandings.svelte';
	import BracketView from '$lib/components/BracketView.svelte';

	const ctx = getContext<{ data: Tournament | null; id: string }>('tournament');

	let matches = $state<Match[]>([]);
	let unsub: (() => void) | null = null;

	const tournament = $derived(ctx.data);
	const tournamentId = $derived(ctx.id);
	const isOrganizer = $derived(
		!!authStore.user && !!tournament && authStore.user.uid === tournament.createdBy
	);

	onMount(() => {
		unsub = onSnapshot(
			collection(db, 'tournaments', tournamentId, 'matches'),
			(snap) => {
				matches = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Match);
			}
		);
	});

	onDestroy(() => unsub?.());

	const rrMatches = $derived(matches.filter((m) => m.phase === 'round_robin'));
	const standings = $derived(
		tournament ? computeStandings(tournament.players, rrMatches) : []
	);
	const allRRComplete = $derived(
		rrMatches.length > 0 && rrMatches.every((m) => m.state === 'completed' || m.state === 'forfeited')
	);

	let advancing = $state(false);
	async function handleStartBracket() {
		advancing = true;
		await startBracket(tournamentId);
		advancing = false;
	}

	// Nav links based on status
	const showNavLinks = $derived(
		tournament && ['round_robin', 'bracket_awaiting', 'bracket', 'complete'].includes(tournament.status)
	);
</script>

{#if tournament}
	<!-- Tournament header -->
	<div class="mb-6">
		<div class="flex items-start justify-between gap-2 mb-1">
			<div>
				<a href="/" class="text-xs opacity-40 hover:opacity-70">← All Tournaments</a>
				<h1 class="text-xl font-bold mt-1">{tournament.name}</h1>
				<p class="text-xs opacity-50">{tournament.game_type}</p>
			</div>
			<span class="text-xs opacity-60 shrink-0 mt-1">{statusLabel(tournament.status)}</span>
		</div>

		<!-- Nav tabs -->
		{#if showNavLinks}
			<nav class="flex gap-1 mt-4 border-b border-fg-top pb-0">
				{#if ['round_robin', 'bracket_awaiting', 'bracket', 'complete'].includes(tournament.status)}
					<a
						href="/tournament/{tournamentId}/round-robin"
						class="px-3 py-1.5 text-sm rounded-t border border-b-0 border-fg-top bg-mid hover:bg-fg-top transition-colors"
					>
						Round Robin
					</a>
				{/if}
				{#if ['bracket', 'complete'].includes(tournament.status)}
					<a
						href="/tournament/{tournamentId}/bracket"
						class="px-3 py-1.5 text-sm rounded-t border border-b-0 border-fg-top bg-mid hover:bg-fg-top transition-colors"
					>
						Bracket
					</a>
				{/if}
				{#if isOrganizer}
					<a
						href="/tournament/{tournamentId}/setup"
						class="px-3 py-1.5 text-sm rounded-t border border-b-0 border-fg-top bg-mid hover:bg-fg-top transition-colors ml-auto opacity-50 hover:opacity-100"
					>
						Setup
					</a>
				{/if}
			</nav>
		{/if}
	</div>

	<!-- ── Status-based content ── -->

	{#if tournament.status === 'setup'}
		<div class="bg-mid rounded p-6 text-center">
			<p class="opacity-60 mb-4">Tournament is in setup. Add players and start the round robin.</p>
			{#if isOrganizer}
				<a
					href="/tournament/{tournamentId}/setup"
					class="bg-fg hover:bg-fg-top border border-fg-super text-content px-4 py-2.5 rounded text-sm transition-colors"
				>
					Go to Setup
				</a>
			{:else}
				<p class="text-xs opacity-40">Waiting for the organizer to start.</p>
			{/if}
		</div>

	{:else if tournament.status === 'rr_awaiting'}
		<div class="bg-mid rounded p-6 text-center">
			<p class="opacity-60 animate-pulse">Generating round robin matches…</p>
		</div>

	{:else if tournament.status === 'round_robin'}
		<RoundRobinStandings {standings} players={tournament.players} />

		<div class="mt-4">
			<a
				href="/tournament/{tournamentId}/round-robin"
				class="text-sm underline opacity-60 hover:opacity-100"
			>
				View all matches →
			</a>
		</div>

		{#if isOrganizer && allRRComplete}
			<div class="mt-6 bg-mid rounded p-4 text-center">
				<p class="text-sm opacity-60 mb-3">All round robin matches complete. Ready to advance to the bracket.</p>
				<button
					onclick={handleStartBracket}
					disabled={advancing}
					class="bg-fg-super hover:bg-fg-top border border-fg-super text-content px-5 py-2.5 rounded text-sm transition-colors disabled:opacity-50"
				>
					{advancing ? 'Generating…' : 'Start Bracket →'}
				</button>
			</div>
		{/if}

	{:else if tournament.status === 'bracket_awaiting'}
		<RoundRobinStandings {standings} players={tournament.players} />
		<div class="mt-4 bg-mid rounded p-4 text-center">
			<p class="opacity-60 animate-pulse text-sm">Generating bracket…</p>
		</div>

	{:else if tournament.status === 'bracket'}
		<BracketView {matches} players={tournament.players} {tournamentId} />

	{:else if tournament.status === 'complete'}
		{#if tournament.winner}
			{@const champ = tournament.players.find((p) => p.uid === tournament.winner)}
			<div class="bg-mid rounded p-6 text-center mb-6">
				<p class="text-xs opacity-50 mb-1">Champion</p>
				<p class="text-2xl font-bold">{champ?.displayName ?? 'Unknown'}</p>
			</div>
		{/if}
		<BracketView {matches} players={tournament.players} {tournamentId} />
	{/if}
{/if}
