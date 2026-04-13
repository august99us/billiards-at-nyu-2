<script lang="ts">
	import { getContext } from 'svelte';
	import { authStore } from '$lib/auth.svelte';
	import { db } from '$lib/firebase';
	import { doc, collection, onSnapshot } from 'firebase/firestore';
	import { onMount, onDestroy } from 'svelte';
	import { startMatch, addWin, setWins, forfeitMatch, matchIsPlayable } from '$lib/tournament';
	import type { Tournament, Match } from '$lib/types';
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	const ctx = getContext<{ data: Tournament | null; id: string }>('tournament');
	const tournament = $derived(ctx.data);
	const tournamentId = ctx.id;
	const matchId = data.matchId;

	let match = $state<Match | null>(null);
	let allMatches = $state<Match[]>([]);
	let unsub: (() => void) | null = null;
	let unsubAll: (() => void) | null = null;

	onMount(() => {
		unsub = onSnapshot(doc(db, 'tournaments', tournamentId, 'matches', matchId), (snap) => {
			if (snap.exists()) {
				match = { id: snap.id, ...snap.data() } as Match;
			}
		});
		unsubAll = onSnapshot(
			collection(db, 'tournaments', tournamentId, 'matches'),
			(snap) => {
				allMatches = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Match);
			}
		);
	});

	onDestroy(() => { unsub?.(); unsubAll?.(); });

	const isOrganizer = $derived(
		!!authStore.user && !!tournament && authStore.user.uid === tournament.createdBy
	);
	const isPlayer = $derived(
		!!authStore.user && !!match &&
		(authStore.user.uid === match.p1_id || authStore.user.uid === match.p2_id)
	);
	const canInteract = $derived(isOrganizer || isPlayer);
	const playable = $derived(match ? matchIsPlayable(match, allMatches) : false);

	function playerName(uid: string | null): string {
		if (!uid) return 'TBD';
		return tournament?.players.find((p) => p.uid === uid)?.displayName ?? 'Unknown';
	}

	const backHref = $derived(
		match?.phase === 'bracket'
			? `/tournament/${tournamentId}/bracket`
			: `/tournament/${tournamentId}/round-robin`
	);

	let p1Input = $state('');
	let p2Input = $state('');
	let busy = $state(false);
	let forfeitConfirm = $state(false);

	async function handleStart() {
		if (!match) return;
		busy = true;
		await startMatch(tournamentId, matchId);
		busy = false;
	}

	async function handleAddWin(player: 'p1' | 'p2') {
		if (!match || !canInteract || busy) return;
		busy = true;
		const cur = player === 'p1' ? match.p1_wins : match.p2_wins;
		await addWin(tournamentId, matchId, player, cur);
		busy = false;
	}

	async function handleSetWins(player: 'p1' | 'p2') {
		if (!match || !canInteract || busy) return;
		const raw = player === 'p1' ? p1Input : p2Input;
		const val = parseInt(raw, 10);
		if (isNaN(val) || val < 0) return;
		busy = true;
		await setWins(tournamentId, matchId, player, val);
		if (player === 'p1') p1Input = '';
		else p2Input = '';
		busy = false;
	}

	async function handleForfeit(winnerId: string) {
		if (!match || !isOrganizer || busy) return;
		busy = true;
		await forfeitMatch(tournamentId, matchId, winnerId);
		forfeitConfirm = false;
		busy = false;
	}

	function tierLabel(m: Match): string {
		switch (m.metadata.tier) {
			case 'finals': return 'Final';
			case 'semiFinals': return 'Semi-Final';
			default: return 'Round Robin';
		}
	}
</script>

<div class="mb-4">
	<a href={backHref} class="text-xs opacity-40 hover:opacity-70">← Back</a>
</div>

{#if !match}
	<p class="text-sm opacity-50">Loading match…</p>
{:else}
	{@const p1Name = playerName(match.p1_id)}
	{@const p2Name = playerName(match.p2_id)}
	{@const firstTo = match.win_con}
	{@const done = match.state === 'completed' || match.state === 'forfeited'}
	{@const active = match.state === 'started' || match.state === 'in_progress'}

	<!-- Match header -->
	<div class="text-center mb-6">
		<p class="text-xs opacity-40 mb-1">{match.phase === 'bracket' ? tierLabel(match) : 'Round Robin'}</p>
		<p class="text-sm opacity-60">First to {firstTo}</p>
	</div>

	<!-- ── Pending (awaiting prerequisites) ── -->
	{#if match.state === 'pending' && !playable}
		<div class="bg-mid rounded p-6 text-center">
			<div class="flex justify-between items-center mb-4">
				<span class="font-semibold text-lg">{p1Name}</span>
				<span class="opacity-40 text-sm">vs</span>
				<span class="font-semibold text-lg">{p2Name}</span>
			</div>
			<p class="text-sm opacity-50">Waiting for earlier matches to finish.</p>
		</div>

	<!-- ── Pending (ready to start) ── -->
	{:else if match.state === 'pending' && playable}
		<div class="bg-mid rounded p-6 text-center">
			<div class="flex justify-between items-center mb-6">
				<span class="font-semibold text-lg">{p1Name}</span>
				<span class="opacity-40 text-sm">vs</span>
				<span class="font-semibold text-lg">{p2Name}</span>
			</div>
			{#if canInteract}
				<button
					onclick={handleStart}
					disabled={busy}
					class="bg-fg-super hover:bg-fg-top border border-fg-super text-content px-8 py-3 rounded text-sm font-bold transition-colors disabled:opacity-50 w-full max-w-xs"
				>
					Start Match
				</button>
			{:else}
				<p class="text-xs opacity-40">Only the players or organizer can start this match.</p>
			{/if}
		</div>

	<!-- ── In Progress ── -->
	{:else if active}
		<div class="bg-mid rounded overflow-hidden">
			<!-- Score display -->
			<div class="grid grid-cols-2 divide-x divide-fg-top">
				<!-- P1 -->
				<div class="p-4 text-center">
					<p class="text-xs opacity-50 mb-2 truncate">{p1Name}</p>
					<p class="text-5xl font-bold tabular-nums mb-4
						{match.winner === match.p1_id ? 'text-green-400' : ''}">
						{match.p1_wins}
					</p>
					{#if canInteract && !done}
						<button
							onclick={() => handleAddWin('p1')}
							disabled={busy}
							class="w-full bg-fg hover:bg-fg-top border border-fg-super text-content py-4 rounded text-2xl font-bold transition-colors disabled:opacity-50 mb-3 min-h-[64px]"
						>
							+1
						</button>
						<div class="flex gap-1.5">
							<input
								type="number"
								min="0"
								max="99"
								placeholder="Set to…"
								bind:value={p1Input}
								onkeydown={(e) => e.key === 'Enter' && handleSetWins('p1')}
								class="flex-1 bg-fg border border-fg-super rounded px-2 py-2 text-sm text-center text-content placeholder:opacity-30 focus:outline-none w-0"
							/>
							<button
								onclick={() => handleSetWins('p1')}
								disabled={busy || !p1Input}
								class="bg-fg hover:bg-fg-top border border-fg-super px-3 py-2 rounded text-xs transition-colors disabled:opacity-40"
							>
								Set
							</button>
						</div>
					{/if}
				</div>

				<!-- P2 -->
				<div class="p-4 text-center">
					<p class="text-xs opacity-50 mb-2 truncate">{p2Name}</p>
					<p class="text-5xl font-bold tabular-nums mb-4
						{match.winner === match.p2_id ? 'text-green-400' : ''}">
						{match.p2_wins}
					</p>
					{#if canInteract && !done}
						<button
							onclick={() => handleAddWin('p2')}
							disabled={busy}
							class="w-full bg-fg hover:bg-fg-top border border-fg-super text-content py-4 rounded text-2xl font-bold transition-colors disabled:opacity-50 mb-3 min-h-[64px]"
						>
							+1
						</button>
						<div class="flex gap-1.5">
							<input
								type="number"
								min="0"
								max="99"
								placeholder="Set to…"
								bind:value={p2Input}
								onkeydown={(e) => e.key === 'Enter' && handleSetWins('p2')}
								class="flex-1 bg-fg border border-fg-super rounded px-2 py-2 text-sm text-center text-content placeholder:opacity-30 focus:outline-none w-0"
							/>
							<button
								onclick={() => handleSetWins('p2')}
								disabled={busy || !p2Input}
								class="bg-fg hover:bg-fg-top border border-fg-super px-3 py-2 rounded text-xs transition-colors disabled:opacity-40"
							>
								Set
							</button>
						</div>
					{/if}
				</div>
			</div>

			<div class="border-t border-fg-top px-4 py-2 text-xs opacity-40 text-center">
				First to {firstTo} wins
			</div>
		</div>

		<!-- Forfeit (organizer only) -->
		{#if isOrganizer}
			<div class="mt-4">
				{#if !forfeitConfirm}
					<button
						onclick={() => (forfeitConfirm = true)}
						class="text-xs opacity-30 hover:opacity-60 transition-colors"
					>
						Forfeit…
					</button>
				{:else}
					<div class="bg-mid rounded p-3 text-sm">
						<p class="mb-2 opacity-70">Mark as forfeited — who wins?</p>
						<div class="flex gap-2">
							<button
								onclick={() => match?.p1_id && handleForfeit(match.p1_id)}
								class="flex-1 bg-fg hover:bg-fg-top border border-fg-super py-2 rounded text-xs transition-colors"
							>
								{p1Name}
							</button>
							<button
								onclick={() => match?.p2_id && handleForfeit(match.p2_id)}
								class="flex-1 bg-fg hover:bg-fg-top border border-fg-super py-2 rounded text-xs transition-colors"
							>
								{p2Name}
							</button>
							<button
								onclick={() => (forfeitConfirm = false)}
								class="px-3 bg-fg hover:bg-fg-top border border-fg-super py-2 rounded text-xs transition-colors opacity-50"
							>
								Cancel
							</button>
						</div>
					</div>
				{/if}
			</div>
		{/if}

	<!-- ── Completed / Forfeited ── -->
	{:else if done}
		{@const winner = match.winner === match.p1_id ? p1Name : p2Name}
		<div class="bg-mid rounded p-6 text-center">
			<p class="text-xs opacity-40 mb-1">{match.state === 'forfeited' ? 'Forfeited' : 'Completed'}</p>
			<div class="grid grid-cols-2 gap-4 my-4">
				<div class="text-center">
					<p class="text-xs opacity-50 mb-1 truncate">{p1Name}</p>
					<p class="text-4xl font-bold tabular-nums {match.winner === match.p1_id ? 'text-green-400' : 'opacity-50'}">
						{match.p1_wins}
					</p>
				</div>
				<div class="text-center">
					<p class="text-xs opacity-50 mb-1 truncate">{p2Name}</p>
					<p class="text-4xl font-bold tabular-nums {match.winner === match.p2_id ? 'text-green-400' : 'opacity-50'}">
						{match.p2_wins}
					</p>
				</div>
			</div>
			<p class="text-sm font-bold text-green-400">{winner} wins</p>
			<a href={backHref} class="block mt-4 text-xs underline opacity-50 hover:opacity-80">← Back</a>
		</div>
	{/if}
{/if}
