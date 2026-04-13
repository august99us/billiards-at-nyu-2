<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { authStore, signOut } from '$lib/auth.svelte';
	import { page } from '$app/stores';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Billiards@NYU</title>
</svelte:head>

<div class="min-h-screen flex flex-col text-content font-sans">
	<!-- Banner: exactly 20vh tall, logo overlaid and centered -->
	<a href="/" class="block h-[20vh] overflow-hidden relative">
		<img src="/banner.png" alt="" class="w-full h-full object-cover object-bottom block" />
		<img
			src="/logo-transparent.png"
			alt="Billiards@NYU"
			class="absolute inset-y-0 left-4 my-auto h-full w-auto object-contain"
		/>
	</a>

	<!-- Nav bar -->
	<nav class="bg-fg border-b border-fg-top">
		<div class="max-w-[900px] mx-auto flex items-center justify-between px-4 py-2">
			<div class="flex gap-6 text-sm">
				<a
					href="/"
					class="hover:text-white transition-colors"
					class:text-white={$page.url.pathname === '/'}
				>
					Home
				</a>
			</div>

			<div class="flex items-center gap-3 text-sm">
				{#if authStore.loading}
					<span class="opacity-40 text-xs">Loading…</span>
				{:else if authStore.user}
					<span class="opacity-70 truncate max-w-[140px]">
						{authStore.user.displayName ?? authStore.user.email}
					</span>
					<button
						onclick={signOut}
						class="hover:text-white transition-colors border border-fg-super px-2 py-0.5 rounded"
					>
						Sign out
					</button>
				{:else}
					<a
						href="/auth"
						class="hover:text-white transition-colors border border-fg-super px-2 py-0.5 rounded"
					>
						Sign in
					</a>
				{/if}
			</div>
		</div>
	</nav>

	<!-- Page content -->
	<div class="bg-bg/70 flex-1">
		<main class="max-w-[900px] mx-auto px-4 py-6">
			{@render children()}
		</main>
	</div>
</div>
