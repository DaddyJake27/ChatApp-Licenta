import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
} from '@react-native-firebase/auth';

const auth = getAuth();

export function signIn(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

export function signUp(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email.trim(), password);
}

export function signOut() {
  return fbSignOut(auth);
}
