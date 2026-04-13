<script lang="ts">
	import type { Standing } from '$lib/tournament';
	import type { TournamentPlayer } from '$lib/types';

	let {
		standings,
		players
	}: {
		standings: Standing[];
		players: TournamentPlayer[];
	} = $props();
</script>

<div class="bg-mid rounded overflow-hidden">
	<div class="px-4 py-3 border-b border-fg-top">
		<h3 class="text-sm font-bold">Standings</h3>
	</div>

	{#if standings.length === 0}
		<p class="px-4 py-4 text-sm opacity-40">No results yet.</p>
	{:else}
		<table class="w-full text-sm">
			<thead>
				<tr class="text-xs opacity-50 border-b border-fg-top">
					<th class="text-left px-4 py-2 font-normal">#</th>
					<th class="text-left px-4 py-2 font-normal">Player</th>
					<th class="text-center px-3 py-2 font-normal">W</th>
					<th class="text-center px-3 py-2 font-normal">L</th>
					<th class="text-center px-3 py-2 font-normal">Sets +/-</th>
				</tr>
			</thead>
			<tbody>
				{#each standings as row, i (row.uid)}
					<tr class="border-b border-fg-top last:border-0">
						<td class="px-4 py-3 opacity-40">{i + 1}</td>
						<td class="px-4 py-3 font-medium">{row.displayName}</td>
						<td class="text-center px-3 py-3 text-green-400">{row.wins}</td>
						<td class="text-center px-3 py-3 opacity-60">{row.losses}</td>
						<td class="text-center px-3 py-3 opacity-60">
							{row.setsWon}/{row.setsLost}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</div>
