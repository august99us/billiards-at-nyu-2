<script lang="ts">
	import {
		authStore,
		signInWithGoogle,
		signInWithEmail,
		registerWithEmail
	} from '$lib/auth.svelte';
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

<div class="mx-auto mt-8 max-w-sm">
	<div class="rounded bg-mid p-6">
		<h1 class="mb-6 text-center text-lg font-bold">
			{mode === 'signin' ? 'Sign in' : 'Create account'}
		</h1>

		<!-- Google -->
		<button
			onclick={handleGoogle}
			disabled={busy}
			class="mb-4 w-full rounded border border-fg-super bg-fg py-3 text-sm text-content transition-colors hover:bg-fg-top disabled:opacity-50"
		>
			Continue with Google
		</button>

		<div class="mb-4 flex items-center gap-3">
			<hr class="flex-1 border-fg-super" />
			<span class="text-xs opacity-50">or</span>
			<hr class="flex-1 border-fg-super" />
		</div>

		<!-- Email/Password form -->
		<form
			onsubmit={(e) => {
				e.preventDefault();
				handleEmailSubmit();
			}}
			class="flex flex-col gap-3"
		>
			{#if mode === 'register'}
				<input
					type="text"
					placeholder="Display name"
					bind:value={displayName}
					required
					class="w-full rounded border border-fg-super bg-fg px-3 py-2.5 text-sm text-content placeholder:opacity-40 focus:border-fg-super focus:outline-none"
				/>
			{/if}

			<input
				type="email"
				placeholder="Email"
				bind:value={email}
				required
				class="w-full rounded border border-fg-super bg-fg px-3 py-2.5 text-sm text-content placeholder:opacity-40 focus:border-fg-super focus:outline-none"
			/>

			<input
				type="password"
				placeholder="Password"
				bind:value={password}
				required
				minlength={6}
				class="w-full rounded border border-fg-super bg-fg px-3 py-2.5 text-sm text-content placeholder:opacity-40 focus:border-fg-super focus:outline-none"
			/>

			{#if error}
				<p class="text-xs text-red-400">{error}</p>
			{/if}

			<button
				type="submit"
				disabled={busy}
				class="mt-1 rounded border border-fg-super bg-fg-super py-3 text-sm text-content transition-colors hover:bg-fg-top disabled:opacity-50"
			>
				{mode === 'signin' ? 'Sign in' : 'Create account'}
			</button>
		</form>

		<p class="mt-4 text-center text-xs opacity-60">
			{#if mode === 'signin'}
				No account?
				<button
					onclick={() => {
						mode = 'register';
						error = '';
					}}
					class="underline"
				>
					Register
				</button>
			{:else}
				Already have an account?
				<button
					onclick={() => {
						mode = 'signin';
						error = '';
					}}
					class="underline"
				>
					Sign in
				</button>
			{/if}
		</p>
	</div>
</div>
