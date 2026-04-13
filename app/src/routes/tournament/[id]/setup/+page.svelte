<script lang="ts">
	import { getContext } from 'svelte';
	import { authStore } from '$lib/auth.svelte';
	import { db } from '$lib/firebase';
	import { doc, updateDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
	import { goto } from '$app/navigation';
	import { startRoundRobin } from '$lib/tournament';
	import type { Tournament, UserProfile } from '$lib/types';

	const ctx = getContext<{ data: Tournament | null; id: string }>('tournament');
	const tournament = $derived(ctx.data);
	const tournamentId = $derived(ctx.id);

	const isOrganizer = $derived(
		!!authStore.user && !!tournament && authStore.user.uid === tournament.createdBy
	);

	// Redirect non-organizers
	$effect(() => {
		if (tournament && !isOrganizer) goto(`/tournament/${tournamentId}`);
	});

	// Player search
	let searchQuery = $state('');
	let searchResults = $state<UserProfile[]>([]);
	let searching = $state(false);
	let searchError = $state('');

	async function searchPlayers() {
		if (!searchQuery.trim()) return;
		searching = true;
		searchError = '';
		searchResults = [];
		try {
			// Use displayName_lower for case-insensitive prefix search
			const lower = searchQuery.trim().toLowerCase();
			const q = query(
				collection(db, 'users'),
				where('displayName_lower', '>=', lower),
				where('displayName_lower', '<=', lower + '\uf8ff'),
				limit(10)
			);
			const snap = await getDocs(q);
			searchResults = snap.docs.map((d) => d.data() as UserProfile);
		} catch (e: unknown) {
			searchError = e instanceof Error ? e.message : 'Search failed';
		} finally {
			searching = false;
		}
	}

	async function addPlayer(user: UserProfile) {
		if (!tournament) return;
		const already = tournament.players.some((p) => p.uid === user.uid);
		if (already) return;
		await updateDoc(doc(db, 'tournaments', tournamentId), {
			players: [...tournament.players, { uid: user.uid, displayName: user.displayName }]
		});
		searchResults = [];
		searchQuery = '';
	}

	async function removePlayer(uid: string) {
		if (!tournament) return;
		await updateDoc(doc(db, 'tournaments', tournamentId), {
			players: tournament.players.filter((p) => p.uid !== uid)
		});
	}

	let starting = $state(false);
	let startError = $state('');

	async function handleStart() {
		if (!tournament || tournament.players.length < 2) {
			startError = 'Need at least 2 players';
			return;
		}
		starting = true;
		startError = '';
		try {
			await startRoundRobin(tournamentId);
			goto(`/tournament/${tournamentId}/round-robin`);
		} catch (e: unknown) {
			startError = e instanceof Error ? e.message : 'Failed to start';
			starting = false;
		}
	}
</script>

<div class="mb-4">
	<a href="/tournament/{tournamentId}" class="text-xs opacity-40 hover:opacity-70"
		>← Back to Tournament</a
	>
	<h2 class="mt-1 text-lg font-bold">Setup</h2>
</div>

{#if tournament}
	<!-- Config summary -->
	<section class="mb-4 rounded bg-mid p-4 text-sm">
		<div class="mb-3 flex items-center justify-between">
			<h3 class="text-xs tracking-wide uppercase opacity-50">Configuration</h3>
			{#if isOrganizer && tournament.status === 'setup'}
				<a href="/tournament/{tournamentId}/edit" class="text-xs opacity-40 hover:opacity-70"
					>Edit</a
				>
			{/if}
		</div>
		<div class="flex flex-col gap-1.5 opacity-80">
			<div class="flex justify-between">
				<span>Game Type</span><span class="opacity-60">{tournament.game_type}</span>
			</div>
			<div class="flex justify-between">
				<span>Round Robin</span><span class="opacity-60"
					>Best of {tournament.config.roundRobin.bestOf}</span
				>
			</div>
			<div class="flex justify-between">
				<span>Bracket Format</span><span class="opacity-60">Single Elimination</span>
			</div>
			<div class="flex justify-between">
				<span>Standard Rounds</span><span class="opacity-60"
					>Best of {tournament.config.bracket.sets.standard}</span
				>
			</div>
			<div class="flex justify-between">
				<span>Semi-Finals</span><span class="opacity-60"
					>Best of {tournament.config.bracket.sets.semiFinals}</span
				>
			</div>
			<div class="flex justify-between">
				<span>Finals</span><span class="opacity-60"
					>Best of {tournament.config.bracket.sets.finals}</span
				>
			</div>
		</div>
	</section>

	<!-- Players -->
	<section class="mb-4 rounded bg-mid p-4">
		<h3 class="mb-3 text-xs tracking-wide uppercase opacity-50">
			Players ({tournament.players.length})
		</h3>

		{#if tournament.players.length === 0}
			<p class="mb-3 text-sm opacity-40">No players added yet.</p>
		{:else}
			<ul class="mb-4 flex flex-col gap-2">
				{#each tournament.players as player (player.uid)}
					<li class="flex items-center justify-between rounded bg-fg px-3 py-2.5 text-sm">
						<span>{player.displayName}</span>
						<button
							onclick={() => removePlayer(player.uid)}
							class="ml-2 text-xs opacity-40 transition-colors hover:text-red-400 hover:opacity-100"
						>
							Remove
						</button>
					</li>
				{/each}
			</ul>
		{/if}

		<!-- Player search -->
		<div class="flex gap-2">
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search by display name…"
				onkeydown={(e) => e.key === 'Enter' && searchPlayers()}
				class="flex-1 rounded border border-fg-super bg-fg px-3 py-2.5 text-sm text-content placeholder:opacity-40 focus:outline-none"
			/>
			<button
				onclick={searchPlayers}
				disabled={searching}
				class="rounded border border-fg-super bg-fg px-4 py-2.5 text-sm transition-colors hover:bg-fg-top disabled:opacity-50"
			>
				Search
			</button>
		</div>

		{#if searchError}
			<p class="mt-2 text-xs text-red-400">{searchError}</p>
		{/if}

		{#if searchResults.length > 0}
			<ul class="mt-2 flex flex-col gap-1">
				{#each searchResults as result (result.uid)}
					{@const alreadyAdded = tournament.players.some((p) => p.uid === result.uid)}
					<li class="flex items-center justify-between rounded bg-fg-top px-3 py-2.5 text-sm">
						<span>{result.displayName}</span>
						<button
							onclick={() => addPlayer(result)}
							disabled={alreadyAdded}
							class="rounded border border-fg-super px-2 py-1 text-xs transition-colors
								{alreadyAdded ? 'cursor-not-allowed opacity-30' : 'hover:bg-fg'}"
						>
							{alreadyAdded ? 'Added' : 'Add'}
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<!-- Start -->
	{#if startError}
		<p class="mb-2 text-sm text-red-400">{startError}</p>
	{/if}

	{#if tournament.status !== 'setup'}
		<p class="py-2 text-center text-sm opacity-50">
			Tournament has already started ({tournament.status.replace('_', ' ')}).
		</p>
	{:else}
		<button
			onclick={handleStart}
			disabled={starting || tournament.players.length < 2}
			class="w-full rounded border border-fg-super bg-fg-super py-3 text-sm font-bold text-content transition-colors hover:bg-fg-top disabled:opacity-40"
		>
			{starting ? 'Starting…' : `Start Round Robin (${tournament.players.length} players)`}
		</button>
	{/if}
{/if}
