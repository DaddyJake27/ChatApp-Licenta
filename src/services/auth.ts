import auth from '@react-native-firebase/auth';

export function signIn(email: string, password: string) {
  return auth().signInWithEmailAndPassword(email.trim(), password);
}

export function signUp(email: string, password: string) {
  return auth().createUserWithEmailAndPassword(email.trim(), password);
}

export function signOut() {
  return auth().signOut();
}
