<script lang="ts">
	import { authStore } from '$lib/auth.svelte';
	import { db } from '$lib/firebase';
	import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { statusLabel } from '$lib/tournament';
	import type { Tournament } from '$lib/types';

	let tournaments = $state<Tournament[]>([]);
	let loading = $state(true);
	let unsub: (() => void) | null = null;

	onMount(() => {
		const q = query(collection(db, 'tournaments'), orderBy('createdAt', 'desc'));
		unsub = onSnapshot(q, (snap) => {
			tournaments = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Tournament);
			loading = false;
		});
	});

	onDestroy(() => unsub?.());

	const statusColors: Record<string, string> = {
		setup: 'text-yellow-400',
		rr_awaiting: 'text-blue-400',
		round_robin: 'text-blue-300',
		bracket_awaiting: 'text-purple-400',
		bracket: 'text-purple-300',
		complete: 'text-green-400'
	};
</script>

<div class="mb-6 flex items-center justify-between">
	<h1 class="text-xl font-bold">Tournaments</h1>
	{#if authStore.user}
		<a
			href="/tournament/new"
			class="rounded border border-fg-super bg-fg px-4 py-2 text-sm text-content transition-colors hover:bg-fg-top"
		>
			+ New Tournament
		</a>
	{/if}
</div>

{#if loading}
	<p class="text-sm opacity-50">Loading…</p>
{:else if tournaments.length === 0}
	<div class="rounded bg-mid p-8 text-center">
		<p class="mb-4 opacity-50">No tournaments yet.</p>
		{#if authStore.user}
			<a
				href="/tournament/new"
				class="rounded border border-fg-super bg-fg px-4 py-2 text-sm text-content transition-colors hover:bg-fg-top"
			>
				Create the first one
			</a>
		{:else}
			<a href="/auth" class="text-sm underline">Sign in</a> to create a tournament.
		{/if}
	</div>
{:else}
	<div class="flex flex-col gap-3">
		{#each tournaments as t (t.id)}
			<button
				onclick={() => goto(`/tournament/${t.id}`)}
				class="w-full rounded border border-fg-top bg-mid p-4 text-left transition-colors hover:bg-fg-top"
			>
				<div class="flex items-start justify-between gap-2">
					<div class="min-w-0">
						<div class="truncate font-bold">{t.name}</div>
						<div class="mt-0.5 text-xs opacity-60">{t.game_type || 'Tournament'}</div>
					</div>
					<div class="shrink-0 text-right">
						<div class="text-xs {statusColors[t.status] ?? ''}">{statusLabel(t.status)}</div>
						<div class="mt-0.5 text-xs opacity-40">{t.players?.length ?? 0} players</div>
					</div>
				</div>
			</button>
		{/each}
	</div>
{/if}

{#if !authStore.user && !authStore.loading}
	<p class="mt-8 text-center text-xs opacity-40">
		<a href="/auth" class="underline">Sign in</a> to create or manage tournaments.
	</p>
{/if}
