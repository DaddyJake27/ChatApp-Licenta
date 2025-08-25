import { useEffect, useState } from 'react';
import {
  getAuth,
  onAuthStateChanged,
  FirebaseAuthTypes,
} from '@react-native-firebase/auth';

export default function useAuth() {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
      if (initializing) setInitializing(false);
    });
    return unsub;
  }, [initializing]);

  return { user, initializing };
}
