<script lang="ts">
	import { getContext } from 'svelte';
	import { db } from '$lib/firebase';
	import { collection, onSnapshot } from 'firebase/firestore';
	import { onMount, onDestroy } from 'svelte';
	import type { Tournament, Match } from '$lib/types';
	import BracketView from '$lib/components/BracketView.svelte';

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
</script>

<div class="mb-4">
	<a href="/tournament/{tournamentId}" class="text-xs opacity-40 hover:opacity-70">← Back</a>
	<h2 class="text-lg font-bold mt-1">Bracket</h2>
</div>

{#if tournament}
	<BracketView {matches} players={tournament.players} {tournamentId} />
{/if}
