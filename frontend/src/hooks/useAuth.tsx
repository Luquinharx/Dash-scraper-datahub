import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { get, ref, set, update } from 'firebase/database';
import { auth, rtdb } from '../lib/firebase';
import { toMillis } from '../lib/date';

export interface UserProfile {
  userId: string;
  email: string;
  nick: string;
  nickJogo: string; // username nos dados coletados (scraper)
  discord: string;
  dataEntrada: number;
  cargo: string;
  lootSemanal: number;
  lootTotal: number;
  roletaDisponivel: number;
  extraSpins?: number; // Saldo manual de giros da roleta
  powerSpins?: number; // Saldo manual de giros da slot machine
  criadoEm: number;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  logout: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(u: User) {
    const userRef = ref(rtdb, `usuarios/${u.uid}`);
    const fallbackProfile: UserProfile = {
      userId: u.uid,
      email: u.email || '',
      nick: u.email?.split('@')[0] || 'Operative',
      nickJogo: '',
      discord: '',
      dataEntrada: Date.now(),
      cargo: u.email === 'lucasmartinsa3009@gmail.com' ? 'Leader' : 'Street Cleaner',
      lootSemanal: 0,
      lootTotal: 0,
      roletaDisponivel: 0,
      extraSpins: 0,
      powerSpins: 0,
      criadoEm: Date.now(),
    };

    try {
      const snap = await get(userRef);

      if (snap.exists()) {
        const raw = snap.val() as Partial<UserProfile>;
        const normalized: UserProfile = {
          userId: raw.userId || u.uid,
          email: raw.email || u.email || '',
          nick: raw.nick || (u.email?.split('@')[0] ?? 'Operative'),
          nickJogo: raw.nickJogo || '',
          discord: raw.discord || '',
          dataEntrada: toMillis(raw.dataEntrada) || Date.now(),
          cargo: raw.cargo || 'Street Cleaner',
          lootSemanal: Number(raw.lootSemanal || 0),
          lootTotal: Number(raw.lootTotal || 0),
          roletaDisponivel: Number(raw.roletaDisponivel || 0),
          extraSpins: Number(raw.extraSpins || 0),
          powerSpins: Number(raw.powerSpins || 0),
          criadoEm: toMillis(raw.criadoEm) || Date.now(),
        };

        if (u.email === 'lucasmartinsa3009@gmail.com' && normalized.cargo !== 'Leader') {
          await update(userRef, { cargo: 'Leader' });
          normalized.cargo = 'Leader';
        }

        setProfile(normalized);
        return;
      }

      await set(userRef, fallbackProfile);
      setProfile(fallbackProfile);
    } catch (error) {
      console.error('Falha ao carregar perfil no RTDB:', error);
      // Mantem login funcional mesmo se regras bloquearem leitura/escrita do perfil.
      setProfile(fallbackProfile);
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await fetchProfile(u);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  async function logout() {
    await signOut(auth);
    setUser(null);
    setProfile(null);
  }

  async function refreshProfile() {
    if (user) await fetchProfile(user);
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
