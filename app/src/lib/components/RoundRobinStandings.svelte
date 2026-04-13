<script lang="ts">
	import type { Standing } from '$lib/tournament';

	let { standings }: { standings: Standing[] } = $props();
</script>

<div class="overflow-hidden rounded bg-mid">
	<div class="border-b border-fg-top px-4 py-3">
		<h3 class="text-sm font-bold">Standings</h3>
	</div>

	{#if standings.length === 0}
		<p class="px-4 py-4 text-sm opacity-40">No results yet.</p>
	{:else}
		<table class="w-full text-sm">
			<thead>
				<tr class="border-b border-fg-top text-xs opacity-50">
					<th class="px-4 py-2 text-left font-normal">#</th>
					<th class="px-4 py-2 text-left font-normal">Player</th>
					<th class="px-3 py-2 text-center font-normal">W</th>
					<th class="px-3 py-2 text-center font-normal">L</th>
					<th class="px-3 py-2 text-center font-normal">Sets +/-</th>
				</tr>
			</thead>
			<tbody>
				{#each standings as row, i (row.uid)}
					<tr class="border-b border-fg-top last:border-0">
						<td class="px-4 py-3 opacity-40">{i + 1}</td>
						<td class="px-4 py-3 font-medium">{row.displayName}</td>
						<td class="px-3 py-3 text-center text-green-400">{row.wins}</td>
						<td class="px-3 py-3 text-center opacity-60">{row.losses}</td>
						<td class="px-3 py-3 text-center opacity-60">
							{row.setsWon}/{row.setsLost}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</div>
