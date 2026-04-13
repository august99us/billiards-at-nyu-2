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

<div class="flex min-h-screen flex-col font-sans text-content">
	<!-- Banner: exactly 20vh tall, logo overlaid and centered -->
	<a href="/" class="relative block h-[20vh] overflow-hidden">
		<img src="/banner.png" alt="" class="block h-full w-full object-cover object-bottom" />
		<img
			src="/logo-transparent.png"
			alt="Billiards@NYU"
			class="absolute inset-y-0 left-4 my-auto h-full w-auto object-contain"
		/>
	</a>

	<!-- Nav bar -->
	<nav class="border-b border-fg-top bg-fg">
		<div class="mx-auto flex max-w-[900px] items-center justify-between px-4 py-2">
			<div class="flex gap-6 text-sm">
				<a
					href="/"
					class="transition-colors hover:text-white"
					class:text-white={$page.url.pathname === '/'}
				>
					Home
				</a>
			</div>

			<div class="flex items-center gap-3 text-sm">
				{#if authStore.loading}
					<span class="text-xs opacity-40">Loading…</span>
				{:else if authStore.user}
					<span class="max-w-[140px] truncate opacity-70">
						{authStore.user.displayName ?? authStore.user.email}
					</span>
					<button
						onclick={signOut}
						class="rounded border border-fg-super px-2 py-0.5 transition-colors hover:text-white"
					>
						Sign out
					</button>
				{:else}
					<a
						href="/auth"
						class="rounded border border-fg-super px-2 py-0.5 transition-colors hover:text-white"
					>
						Sign in
					</a>
				{/if}
			</div>
		</div>
	</nav>

	<!-- Page content -->
	<div class="flex-1 bg-bg/70">
		<main class="mx-auto max-w-[900px] px-4 py-6">
			{@render children()}
		</main>
	</div>
</div>
