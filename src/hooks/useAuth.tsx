import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  name: string;
  is_admin: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) {
        console.error('[Auth] Error fetching profile:', error.message);
      }
      if (data) {
        console.log('[Auth] Profile loaded:', data.name, 'is_admin:', data.is_admin);
        setProfile(data as Profile);
      } else {
        console.warn('[Auth] No profile found for user:', userId);
      }
    } catch (e) {
      console.error('[Auth] Exception fetching profile:', e);
    }
  };

  useEffect(() => {
    // Safety timeout - if auth never resolves, stop loading anyway
    const safetyTimeout = setTimeout(() => {
      console.warn('Auth safety timeout reached, forcing loading=false');
      setLoading(false);
    }, 5000);

    let resolved = false;
    const resolve = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(safetyTimeout);
        setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event);
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        await fetchProfile(u.id);
      } else {
        setProfile(null);
      }
      resolve();
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('getSession result:', session ? 'has session' : 'no session');
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        await fetchProfile(u.id);
      }
      resolve();
    }).catch((err) => {
      console.error('getSession error:', err);
      resolve();
    });

    return () => {
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
