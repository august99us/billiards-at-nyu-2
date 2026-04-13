import { auth, db } from './firebase';
import {
	GoogleAuthProvider,
	signInWithPopup,
	signInWithEmailAndPassword,
	createUserWithEmailAndPassword,
	updateProfile,
	signOut as firebaseSignOut,
	onAuthStateChanged,
	type User
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

// Svelte 5 rune-based auth state (only valid inside .svelte.ts or .svelte files)
let _user = $state<User | null>(null);
let _loading = $state(true);

export const authStore = {
	get user(): User | null {
		return _user;
	},
	get loading(): boolean {
		return _loading;
	}
};

// Upsert a lightweight profile doc in /users/{uid} whenever auth state changes
async function syncUserProfile(firebaseUser: User) {
	await setDoc(
		doc(db, 'users', firebaseUser.uid),
		{
			uid: firebaseUser.uid,
			displayName: firebaseUser.displayName ?? firebaseUser.email ?? 'Unknown',
			displayName_lower: (
				firebaseUser.displayName ??
				firebaseUser.email ??
				'Unknown'
			).toLowerCase(),
			email: firebaseUser.email,
			photoURL: firebaseUser.photoURL ?? null
		},
		{ merge: true }
	);
}

onAuthStateChanged(auth, async (firebaseUser) => {
	_user = firebaseUser;
	_loading = false;
	if (firebaseUser) {
		await syncUserProfile(firebaseUser);
	}
});

export async function signInWithGoogle(): Promise<void> {
	const provider = new GoogleAuthProvider();
	await signInWithPopup(auth, provider);
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
	await signInWithEmailAndPassword(auth, email, password);
}

export async function registerWithEmail(
	email: string,
	password: string,
	displayName: string
): Promise<void> {
	const result = await createUserWithEmailAndPassword(auth, email, password);
	await updateProfile(result.user, { displayName });
	await syncUserProfile(result.user);
}

export async function signOut(): Promise<void> {
	await firebaseSignOut(auth);
}
