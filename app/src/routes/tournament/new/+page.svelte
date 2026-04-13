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

	const bestOfOptions: BestOf[] = [1, 3, 5, 7];

	async function handleCreate() {
		if (!name.trim()) {
			error = 'Tournament name is required';
			return;
		}
		if (!authStore.user) {
			error = 'You must be signed in';
			return;
		}

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
						finals: finalsSets
					}
				}
			};

			const ref = await addDoc(collection(db, 'tournaments'), {
				name: name.trim(),
				game_type: gameType.trim() || 'Tournament',
				status: 'setup',
				createdBy: authStore.user.uid,
				createdAt: serverTimestamp(),
				players: [],
				config
			});

			goto(`/tournament/${ref.id}/setup`);
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : 'Failed to create tournament';
		} finally {
			busy = false;
		}
	}
</script>

<div class="mx-auto max-w-lg">
	<div class="mb-6 flex items-center gap-3">
		<a href="/" class="text-sm opacity-50 hover:opacity-100">← Back</a>
		<h1 class="text-xl font-bold">New Tournament</h1>
	</div>

	<form
		onsubmit={(e) => {
			e.preventDefault();
			handleCreate();
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

			<!-- Bracket Type -->
			<div class="flex flex-col gap-1.5">
				<span class="text-xs opacity-60">Format</span>
				<div class="flex gap-2">
					<button
						type="button"
						onclick={() => (bracketType = 'single_elim')}
						class="flex-1 rounded border py-2.5 text-sm transition-colors
							{bracketType === 'single_elim'
							? 'border-content bg-fg-super text-content'
							: 'border-fg-super bg-fg opacity-60 hover:opacity-100'}"
					>
						Single Elimination
					</button>
					<button
						type="button"
						disabled
						title="Coming soon"
						class="flex-1 cursor-not-allowed rounded border border-fg-super bg-fg py-2.5 text-sm opacity-30"
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
			{busy ? 'Creating…' : 'Create Tournament'}
		</button>
	</form>
</div>
