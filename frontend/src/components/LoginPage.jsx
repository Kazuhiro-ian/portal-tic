import { useState } from 'react';
import { Lock, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('Informe usuário e senha.');
      return;
    }
    try {
      setIsSubmitting(true);
      await login(username.trim(), password);
    } catch (err) {
      setError(err.message || 'Não foi possível entrar. Verifique suas credenciais.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-primary-500 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/30 mb-4">
            <span className="text-white font-black text-2xl leading-none italic">Q</span>
          </div>
          <p className="text-white font-black text-xl tracking-tight leading-none">
            Queiroz<span className="text-brand-500">.</span>
          </p>
          <p className="text-dark-400 text-xs uppercase tracking-widest mt-1">Portal TIC</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div className="flex items-center gap-2 text-dark-300 mb-2">
            <Lock className="w-4 h-4" />
            <h1 className="text-base font-semibold text-white">Entrar</h1>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Usuário</label>
            <input
              type="text"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-field"
              placeholder="seu.usuario"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center py-2.5 disabled:opacity-50">
            <LogIn className="w-4 h-4" />
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
