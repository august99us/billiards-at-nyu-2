<script lang="ts">
	import { getContext } from 'svelte';
	import { authStore } from '$lib/auth.svelte';
	import { db } from '$lib/firebase';
	import { doc, updateDoc } from 'firebase/firestore';
	import { goto } from '$app/navigation';
	import type { Tournament, BestOf } from '$lib/types';

	const ctx = getContext<{ data: Tournament | null; id: string }>('tournament');
	const tournament = $derived(ctx.data);
	const tournamentId = ctx.id;

	const isOrganizer = $derived(
		!!authStore.user && !!tournament && authStore.user.uid === tournament.createdBy
	);

	$effect(() => {
		if (tournament && (!isOrganizer || tournament.status !== 'setup')) {
			goto(`/tournament/${tournamentId}`);
		}
	});

	// Form state — initialised from tournament once it loads
	let name = $state('');
	let gameType = $state('');
	let rrBestOf = $state<BestOf>(1);
	let standardSets = $state<BestOf>(1);
	let semiFinalsSets = $state<BestOf>(3);
	let finalsSets = $state<BestOf>(5);
	let initialised = $state(false);

	$effect(() => {
		if (tournament && !initialised) {
			name = tournament.name;
			gameType = tournament.game_type;
			rrBestOf = tournament.config.roundRobin.bestOf;
			standardSets = tournament.config.bracket.sets.standard;
			semiFinalsSets = tournament.config.bracket.sets.semiFinals;
			finalsSets = tournament.config.bracket.sets.finals;
			initialised = true;
		}
	});

	const bestOfOptions: BestOf[] = [1, 3, 5, 7];

	let busy = $state(false);
	let error = $state('');

	async function handleSave() {
		if (!name.trim()) {
			error = 'Tournament name is required';
			return;
		}
		error = '';
		busy = true;
		try {
			await updateDoc(doc(db, 'tournaments', tournamentId), {
				name: name.trim(),
				game_type: gameType.trim() || 'Tournament',
				config: {
					roundRobin: { bestOf: rrBestOf },
					bracket: {
						type: 'single_elim',
						sets: {
							standard: standardSets,
							semiFinals: semiFinalsSets,
							finals: finalsSets
						}
					}
				}
			});
			goto(`/tournament/${tournamentId}/setup`);
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : 'Failed to save';
			busy = false;
		}
	}
</script>

<div class="mx-auto max-w-lg">
	<div class="mb-6 flex items-center gap-3">
		<a href="/tournament/{tournamentId}/setup" class="text-sm opacity-50 hover:opacity-100"
			>← Back to Setup</a
		>
		<h1 class="text-xl font-bold">Edit Tournament</h1>
	</div>

	{#if tournament && initialised}
		<form
			onsubmit={(e) => {
				e.preventDefault();
				handleSave();
			}}
			class="flex flex-col gap-6"
		>
			<!-- Basic Info -->
			<section class="flex flex-col gap-4 rounded bg-mid p-4">
				<h2 class="text-sm font-bold tracking-wide uppercase opacity-70">Basic Info</h2>

				<label class="flex flex-col gap-1.5">
					<span class="text-xs opacity-60">Tournament Name</span>
					<input
						type="text"
						bind:value={name}
						placeholder="e.g. Spring 8-Ball Tournament"
						required
						class="w-full rounded border border-fg-super bg-fg px-3 py-2.5 text-sm text-content placeholder:opacity-40 focus:outline-none"
					/>
				</label>

				<label class="flex flex-col gap-1.5">
					<span class="text-xs opacity-60">Game Type (display label)</span>
					<input
						type="text"
						bind:value={gameType}
						placeholder="8-Ball, 9-Ball, etc."
						class="w-full rounded border border-fg-super bg-fg px-3 py-2.5 text-sm text-content placeholder:opacity-40 focus:outline-none"
					/>
				</label>
			</section>

			<!-- Round Robin Config -->
			<section class="flex flex-col gap-4 rounded bg-mid p-4">
				<h2 class="text-sm font-bold tracking-wide uppercase opacity-70">Round Robin</h2>

				<div class="flex flex-col gap-1.5">
					<span class="text-xs opacity-60">Sets per Match</span>
					<div class="flex gap-2">
						{#each bestOfOptions as opt (opt)}
							<button
								type="button"
								onclick={() => (rrBestOf = opt)}
								class="flex-1 rounded border py-2.5 text-sm transition-colors
									{rrBestOf === opt
									? 'border-content bg-fg-super text-content'
									: 'border-fg-super bg-fg opacity-60 hover:opacity-100'}"
							>
								Best of {opt}
							</button>
						{/each}
					</div>
				</div>
			</section>

			<!-- Bracket Config -->
			<section class="flex flex-col gap-4 rounded bg-mid p-4">
				<h2 class="text-sm font-bold tracking-wide uppercase opacity-70">Bracket</h2>

				{#snippet tierRow(label: string, value: BestOf, setter: (v: BestOf) => void)}
					<div class="flex flex-col gap-1.5">
						<span class="text-xs opacity-60">{label} — Sets per Match</span>
						<div class="flex gap-2">
							{#each bestOfOptions as opt (opt)}
								<button
									type="button"
									onclick={() => setter(opt)}
									class="flex-1 rounded border py-2.5 text-sm transition-colors
										{value === opt
										? 'border-content bg-fg-super text-content'
										: 'border-fg-super bg-fg opacity-60 hover:opacity-100'}"
								>
									Best of {opt}
								</button>
							{/each}
						</div>
					</div>
				{/snippet}

				{@render tierRow('Standard Rounds', standardSets, (v) => (standardSets = v))}
				{@render tierRow('Semi-Finals', semiFinalsSets, (v) => (semiFinalsSets = v))}
				{@render tierRow('Finals', finalsSets, (v) => (finalsSets = v))}
			</section>

			{#if error}
				<p class="text-sm text-red-400">{error}</p>
			{/if}

			<button
				type="submit"
				disabled={busy}
				class="rounded border border-fg-super bg-fg-super py-3 text-sm font-bold text-content transition-colors hover:bg-fg-top disabled:opacity-50"
			>
				{busy ? 'Saving…' : 'Save Changes'}
			</button>
		</form>
	{/if}
</div>
