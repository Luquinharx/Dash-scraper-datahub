import { useState } from 'react';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { rtdb } from '../../lib/firebase';
import { initializeApp } from 'firebase/app';
import { UserPlus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { useScrapedUsernames } from '../../hooks/useClanMemberData';
import Navbar from '../Navbar';

const CARGOS = ['Member', 'Officer', 'Sub-Leader', 'Leader'];

// Auth secundario para criar usuarios sem deslogar o admin
const secondaryApp = initializeApp({
  apiKey: 'AIzaSyBsH0thsRXAti-gbnsJLpIAMroe7PTyL2I',
  authDomain: 'deadclanbb-1f05e.firebaseapp.com',
  databaseURL: 'https://deadclanbb-1f05e-default-rtdb.firebaseio.com',
  projectId: 'deadclanbb-1f05e',
  storageBucket: 'deadclanbb-1f05e.firebasestorage.app',
  messagingSenderId: '208227509819',
  appId: '1:208227509819:web:ca440d6a17cebd901a5e1e',
  measurementId: 'G-Z1DZW09YFS',
}, 'secondary');
const secondaryAuth = getAuth(secondaryApp);

export default function Cadastro() {
  const { profile } = useAuth();
  const { usernames: scrapedNames } = useScrapedUsernames();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nick, setNick] = useState('');
  const [nickJogo, setNickJogo] = useState('');
  const [discord, setDiscord] = useState('');
  const [cargo, setCargo] = useState('Member');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const isAdmin = profile?.cargo === 'Leader' || profile?.cargo === 'Sub-Leader';

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh] text-red-400 text-lg">
          Acesso restrito a Leaderes e Sub-Leaderes.
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    setSuccess('');
    try {
      const cred = await createUserWithEmailAndPassword(secondaryAuth, email, senha);
      const uid = cred.user.uid;
      await secondaryAuth.signOut();

      await set(ref(rtdb, `usuarios/${uid}`), {
        userId: uid,
        email,
        nick,
        nickJogo,
        discord,
        dataEntrada: Date.now(),
        cargo,
        extraSpins: 0,
        powerSpins: 0,
        lootSemanal: 0,
        lootTotal: 0,
        roletaDisponivel: 0,
        criadoEm: Date.now(),
      });

      setSuccess(`Usuario "${nick}" cadastrado com sucesso!`);
      setEmail('');
      setSenha('');
      setNick('');
      setNickJogo('');
      setDiscord('');
      setCargo('Member');
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/email-already-in-use') {
        setError('Este email ja esta cadastrado.');
      } else if (code === 'auth/weak-password') {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else {
        setError('Erro ao cadastrar. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      <div className="flex items-center justify-center p-4 mt-8">
        <div className="w-full max-w-lg mx-auto bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-xl mt-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Cadastro</h1>
              <p className="text-sm text-slate-400">Crie sua conta no cla</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Senha</label>
              <input
                type="password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                placeholder="Minimo 6 caracteres"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Nick no Jogo</label>
              <input
                type="text"
                value={nick}
                onChange={e => setNick(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                placeholder="Seu nick ingame"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Vincular ao Scraper (username coletado)</label>
              <select
                value={nickJogo}
                onChange={e => setNickJogo(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
              >
                <option value="">Selecione o username...</option>
                {scrapedNames.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <p className="text-xs text-slate-500 mt-1">Username que aparece nos dados coletados do cla</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Discord</label>
              <input
                type="text"
                value={discord}
                onChange={e => setDiscord(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                placeholder="usuario#1234"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Cargo</label>
              <select
                value={cargo}
                onChange={e => setCargo(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
              >
                {CARGOS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={cn(
                'w-full py-2.5 rounded-lg font-semibold text-white transition-all mt-2',
                loading
                  ? 'bg-emerald-500/50 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700'
              )}
            >
              {loading ? 'Cadastrando...' : 'Cadastrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
