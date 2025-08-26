import { useEffect, useState } from 'react';
import {
  getAuth,
  onAuthStateChanged,
  FirebaseAuthTypes,
} from '@react-native-firebase/auth';
import { ensureUserDirectory } from '@services/db';

export default function useAuth() {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, u => {
      (async () => {
        try {
          setUser(u);
          if (u) {
            await ensureUserDirectory().catch(e =>
              console.warn('ensureUserDirectory:', e?.code || e?.message || e),
            );
          }
        } finally {
          setInitializing(false);
        }
      })();
    });
    return unsub;
  }, []);
  return { user, initializing };
}
