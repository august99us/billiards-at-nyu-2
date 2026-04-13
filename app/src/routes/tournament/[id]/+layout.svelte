<script lang="ts">
	import type { LayoutData } from './$types';
	import { db } from '$lib/firebase';
	import { doc, onSnapshot } from 'firebase/firestore';
	import { onMount, onDestroy, setContext } from 'svelte';
	import type { Tournament } from '$lib/types';

	let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();

	const tournamentId = data.tournamentId;

	let tournament = $state<Tournament | null>(null);
	let notFound = $state(false);
	let unsub: (() => void) | null = null;

	onMount(() => {
		unsub = onSnapshot(doc(db, 'tournaments', tournamentId), (snap) => {
			if (snap.exists()) {
				tournament = { id: snap.id, ...snap.data() } as Tournament;
			} else {
				notFound = true;
			}
		});
	});

	onDestroy(() => unsub?.());

	setContext('tournament', {
		get data(): Tournament | null {
			return tournament;
		},
		id: tournamentId,
	});
</script>

{#if notFound}
	<div class="text-center mt-12">
		<p class="opacity-50">Tournament not found.</p>
		<a href="/" class="underline text-sm mt-2 block">← Back to home</a>
	</div>
{:else if !tournament}
	<p class="opacity-50 text-sm">Loading…</p>
{:else}
	{@render children()}
{/if}
