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
		unsub = onSnapshot(collection(db, 'tournaments', tournamentId, 'matches'), (snap) => {
			matches = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Match);
		});
	});

	onDestroy(() => unsub?.());

	const rrMatches = $derived(matches.filter((m) => m.phase === 'round_robin'));
	const standings = $derived(tournament ? computeStandings(tournament.players, rrMatches) : []);
	const allRRComplete = $derived(
		rrMatches.length > 0 &&
			rrMatches.every((m) => m.state === 'completed' || m.state === 'forfeited')
	);

	let advancing = $state(false);
	async function handleStartBracket() {
		advancing = true;
		await startBracket(tournamentId);
		advancing = false;
	}

	// Nav links based on status
	const showNavLinks = $derived(
		tournament &&
			['round_robin', 'bracket_awaiting', 'bracket', 'complete'].includes(tournament.status)
	);
</script>

{#if tournament}
	<!-- Tournament header -->
	<div class="mb-6">
		<div class="mb-1 flex items-start justify-between gap-2">
			<div>
				<a href="/" class="text-xs opacity-40 hover:opacity-70">← All Tournaments</a>
				<h1 class="mt-1 text-xl font-bold">{tournament.name}</h1>
				<p class="text-xs opacity-50">{tournament.game_type}</p>
			</div>
			<span class="mt-1 shrink-0 text-xs opacity-60">{statusLabel(tournament.status)}</span>
		</div>

		<!-- Nav tabs -->
		{#if showNavLinks}
			<nav class="mt-4 flex gap-1 border-b border-fg-top pb-0">
				{#if ['round_robin', 'bracket_awaiting', 'bracket', 'complete'].includes(tournament.status)}
					<a
						href="/tournament/{tournamentId}/round-robin"
						class="rounded-t border border-b-0 border-fg-top bg-mid px-3 py-1.5 text-sm transition-colors hover:bg-fg-top"
					>
						Round Robin
					</a>
				{/if}
				{#if ['bracket', 'complete'].includes(tournament.status)}
					<a
						href="/tournament/{tournamentId}/bracket"
						class="rounded-t border border-b-0 border-fg-top bg-mid px-3 py-1.5 text-sm transition-colors hover:bg-fg-top"
					>
						Bracket
					</a>
				{/if}
				{#if isOrganizer}
					<a
						href="/tournament/{tournamentId}/setup"
						class="ml-auto rounded-t border border-b-0 border-fg-top bg-mid px-3 py-1.5 text-sm opacity-50 transition-colors hover:bg-fg-top hover:opacity-100"
					>
						Setup
					</a>
				{/if}
			</nav>
		{/if}
	</div>

	<!-- ── Status-based content ── -->

	{#if tournament.status === 'setup'}
		<div class="rounded bg-mid p-6 text-center">
			<p class="mb-4 opacity-60">Tournament is in setup. Add players and start the round robin.</p>
			{#if isOrganizer}
				<a
					href="/tournament/{tournamentId}/setup"
					class="rounded border border-fg-super bg-fg px-4 py-2.5 text-sm text-content transition-colors hover:bg-fg-top"
				>
					Go to Setup
				</a>
			{:else}
				<p class="text-xs opacity-40">Waiting for the organizer to start.</p>
			{/if}
		</div>
	{:else if tournament.status === 'rr_awaiting'}
		<div class="rounded bg-mid p-6 text-center">
			<p class="animate-pulse opacity-60">Generating round robin matches…</p>
		</div>
	{:else if tournament.status === 'round_robin'}
		<RoundRobinStandings {standings} />

		<div class="mt-4">
			<a
				href="/tournament/{tournamentId}/round-robin"
				class="text-sm underline opacity-60 hover:opacity-100"
			>
				View all matches →
			</a>
		</div>

		{#if isOrganizer && allRRComplete}
			<div class="mt-6 rounded bg-mid p-4 text-center">
				<p class="mb-3 text-sm opacity-60">
					All round robin matches complete. Ready to advance to the bracket.
				</p>
				<button
					onclick={handleStartBracket}
					disabled={advancing}
					class="rounded border border-fg-super bg-fg-super px-5 py-2.5 text-sm text-content transition-colors hover:bg-fg-top disabled:opacity-50"
				>
					{advancing ? 'Generating…' : 'Start Bracket →'}
				</button>
			</div>
		{/if}
	{:else if tournament.status === 'bracket_awaiting'}
		<RoundRobinStandings {standings} />
		<div class="mt-4 rounded bg-mid p-4 text-center">
			<p class="animate-pulse text-sm opacity-60">Generating bracket…</p>
		</div>
	{:else if tournament.status === 'bracket'}
		<BracketView {matches} players={tournament.players} {tournamentId} />
	{:else if tournament.status === 'complete'}
		{#if tournament.winner}
			{@const champ = tournament.players.find((p) => p.uid === tournament.winner)}
			<div class="mb-6 rounded bg-mid p-6 text-center">
				<p class="mb-1 text-xs opacity-50">Champion</p>
				<p class="text-2xl font-bold">{champ?.displayName ?? 'Unknown'}</p>
			</div>
		{/if}
		<BracketView {matches} players={tournament.players} {tournamentId} />
	{/if}
{/if}
