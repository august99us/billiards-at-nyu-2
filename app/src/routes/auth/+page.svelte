<script lang="ts">
	import { authStore, signInWithGoogle, signInWithEmail, registerWithEmail } from '$lib/auth.svelte';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	// Redirect if already signed in
	onMount(() => {
		if (authStore.user) goto('/');
	});

	let mode = $state<'signin' | 'register'>('signin');
	let email = $state('');
	let password = $state('');
	let displayName = $state('');
	let error = $state('');
	let busy = $state(false);

	async function handleGoogle() {
		error = '';
		busy = true;
		try {
			await signInWithGoogle();
			goto('/');
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : 'Sign in failed';
		} finally {
			busy = false;
		}
	}

	async function handleEmailSubmit() {
		error = '';
		busy = true;
		try {
			if (mode === 'signin') {
				await signInWithEmail(email, password);
			} else {
				if (!displayName.trim()) {
					error = 'Display name is required';
					return;
				}
				await registerWithEmail(email, password, displayName.trim());
			}
			goto('/');
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : 'Authentication failed';
		} finally {
			busy = false;
		}
	}
</script>

<div class="max-w-sm mx-auto mt-8">
	<div class="bg-mid rounded p-6">
		<h1 class="text-lg font-bold mb-6 text-center">
			{mode === 'signin' ? 'Sign in' : 'Create account'}
		</h1>

		<!-- Google -->
		<button
			onclick={handleGoogle}
			disabled={busy}
			class="w-full bg-fg hover:bg-fg-top border border-fg-super text-content py-3 rounded mb-4 transition-colors disabled:opacity-50 text-sm"
		>
			Continue with Google
		</button>

		<div class="flex items-center gap-3 mb-4">
			<hr class="flex-1 border-fg-super" />
			<span class="text-xs opacity-50">or</span>
			<hr class="flex-1 border-fg-super" />
		</div>

		<!-- Email/Password form -->
		<form onsubmit={(e) => { e.preventDefault(); handleEmailSubmit(); }} class="flex flex-col gap-3">
			{#if mode === 'register'}
				<input
					type="text"
					placeholder="Display name"
					bind:value={displayName}
					required
					class="bg-fg border border-fg-super rounded px-3 py-2.5 text-sm text-content placeholder:opacity-40 focus:outline-none focus:border-fg-super w-full"
				/>
			{/if}

			<input
				type="email"
				placeholder="Email"
				bind:value={email}
				required
				class="bg-fg border border-fg-super rounded px-3 py-2.5 text-sm text-content placeholder:opacity-40 focus:outline-none focus:border-fg-super w-full"
			/>

			<input
				type="password"
				placeholder="Password"
				bind:value={password}
				required
				minlength={6}
				class="bg-fg border border-fg-super rounded px-3 py-2.5 text-sm text-content placeholder:opacity-40 focus:outline-none focus:border-fg-super w-full"
			/>

			{#if error}
				<p class="text-red-400 text-xs">{error}</p>
			{/if}

			<button
				type="submit"
				disabled={busy}
				class="bg-fg-super hover:bg-fg-top border border-fg-super text-content py-3 rounded transition-colors disabled:opacity-50 text-sm mt-1"
			>
				{mode === 'signin' ? 'Sign in' : 'Create account'}
			</button>
		</form>

		<p class="text-xs text-center mt-4 opacity-60">
			{#if mode === 'signin'}
				No account?
				<button onclick={() => { mode = 'register'; error = ''; }} class="underline">
					Register
				</button>
			{:else}
				Already have an account?
				<button onclick={() => { mode = 'signin'; error = ''; }} class="underline">
					Sign in
				</button>
			{/if}
		</p>
	</div>
</div>
