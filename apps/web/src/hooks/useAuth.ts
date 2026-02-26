import { useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { useAuthStore } from '@/stores/authStore';

export function useAuth() {
  const { user, loading, setUser, setLoading } = useAuthStore();

  useEffect(() => {
    if (!auth) {
      setUser(null);
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, [setUser, setLoading]);

  const signInWithGoogle = async () => {
    if (!auth) return;
    await signInWithPopup(auth, googleProvider);
  };

  const logout = async () => {
    if (!auth) return;
    await signOut(auth);
  };

  return { user, loading, signInWithGoogle, logout };
}
