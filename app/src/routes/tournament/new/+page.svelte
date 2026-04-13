<script lang="ts">
	import { authStore } from '$lib/auth.svelte';
	import { db } from '$lib/firebase';
	import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
	import { goto } from '$app/navigation';
	import type { TournamentConfig, BestOf } from '$lib/types';

	// Redirect if not signed in
	$effect(() => {
		if (!authStore.loading && !authStore.user) goto('/auth');
	});

	let name = $state('');
	let gameType = $state('8-Ball');
	let rrBestOf = $state<BestOf>(1);
	let bracketType = $state<'single_elim' | 'double_elim'>('single_elim');
	let standardSets = $state<BestOf>(1);
	let semiFinalsSets = $state<BestOf>(3);
	let finalsSets = $state<BestOf>(5);
	let busy = $state(false);
	let error = $state('');

	const bestOfOptions: BestOf[] = [1, 3, 5];

	async function handleCreate() {
		if (!name.trim()) { error = 'Tournament name is required'; return; }
		if (!authStore.user) { error = 'You must be signed in'; return; }

		error = '';
		busy = true;
		try {
			const config: TournamentConfig = {
				roundRobin: { bestOf: rrBestOf },
				bracket: {
					type: bracketType,
					sets: {
						standard: standardSets,
						semiFinals: semiFinalsSets,
						finals: finalsSets,
					},
				},
			};

			const ref = await addDoc(collection(db, 'tournaments'), {
				name: name.trim(),
				game_type: gameType.trim() || 'Tournament',
				status: 'setup',
				createdBy: authStore.user.uid,
				createdAt: serverTimestamp(),
				players: [],
				config,
			});

			goto(`/tournament/${ref.id}/setup`);
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : 'Failed to create tournament';
		} finally {
			busy = false;
		}
	}
</script>

<div class="max-w-lg mx-auto">
	<div class="flex items-center gap-3 mb-6">
		<a href="/" class="opacity-50 hover:opacity-100 text-sm">← Back</a>
		<h1 class="text-xl font-bold">New Tournament</h1>
	</div>

	<form onsubmit={(e) => { e.preventDefault(); handleCreate(); }} class="flex flex-col gap-6">

		<!-- Basic Info -->
		<section class="bg-mid rounded p-4 flex flex-col gap-4">
			<h2 class="text-sm font-bold opacity-70 uppercase tracking-wide">Basic Info</h2>

			<label class="flex flex-col gap-1.5">
				<span class="text-xs opacity-60">Tournament Name</span>
				<input
					type="text"
					bind:value={name}
					placeholder="e.g. Spring 8-Ball Tournament"
					required
					class="bg-fg border border-fg-super rounded px-3 py-2.5 text-sm text-content placeholder:opacity-40 focus:outline-none w-full"
				/>
			</label>

			<label class="flex flex-col gap-1.5">
				<span class="text-xs opacity-60">Game Type (display label)</span>
				<input
					type="text"
					bind:value={gameType}
					placeholder="8-Ball, 9-Ball, etc."
					class="bg-fg border border-fg-super rounded px-3 py-2.5 text-sm text-content placeholder:opacity-40 focus:outline-none w-full"
				/>
			</label>
		</section>

		<!-- Round Robin Config -->
		<section class="bg-mid rounded p-4 flex flex-col gap-4">
			<h2 class="text-sm font-bold opacity-70 uppercase tracking-wide">Round Robin</h2>

			<div class="flex flex-col gap-1.5">
				<span class="text-xs opacity-60">Sets per Match</span>
				<div class="flex gap-2">
					{#each bestOfOptions as opt}
						<button
							type="button"
							onclick={() => (rrBestOf = opt)}
							class="flex-1 py-2.5 rounded border text-sm transition-colors
								{rrBestOf === opt
									? 'bg-fg-super border-content text-content'
									: 'bg-fg border-fg-super opacity-60 hover:opacity-100'}"
						>
							Best of {opt}
						</button>
					{/each}
				</div>
			</div>
		</section>

		<!-- Bracket Config -->
		<section class="bg-mid rounded p-4 flex flex-col gap-4">
			<h2 class="text-sm font-bold opacity-70 uppercase tracking-wide">Bracket</h2>

			<!-- Bracket Type -->
			<div class="flex flex-col gap-1.5">
				<span class="text-xs opacity-60">Format</span>
				<div class="flex gap-2">
					<button
						type="button"
						onclick={() => (bracketType = 'single_elim')}
						class="flex-1 py-2.5 rounded border text-sm transition-colors
							{bracketType === 'single_elim'
								? 'bg-fg-super border-content text-content'
								: 'bg-fg border-fg-super opacity-60 hover:opacity-100'}"
					>
						Single Elimination
					</button>
					<button
						type="button"
						disabled
						title="Coming soon"
						class="flex-1 py-2.5 rounded border text-sm bg-fg border-fg-super opacity-30 cursor-not-allowed"
					>
						Double Elimination
					</button>
				</div>
			</div>

			<!-- Sets per tier -->
			{#snippet tierRow(label: string, value: BestOf, setter: (v: BestOf) => void)}
				<div class="flex flex-col gap-1.5">
					<span class="text-xs opacity-60">{label} — Sets per Match</span>
					<div class="flex gap-2">
						{#each bestOfOptions as opt}
							<button
								type="button"
								onclick={() => setter(opt)}
								class="flex-1 py-2.5 rounded border text-sm transition-colors
									{value === opt
										? 'bg-fg-super border-content text-content'
										: 'bg-fg border-fg-super opacity-60 hover:opacity-100'}"
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
			<p class="text-red-400 text-sm">{error}</p>
		{/if}

		<button
			type="submit"
			disabled={busy}
			class="bg-fg-super hover:bg-fg-top border border-fg-super text-content py-3 rounded transition-colors disabled:opacity-50 text-sm font-bold"
		>
			{busy ? 'Creating…' : 'Create Tournament'}
		</button>
	</form>
</div>
