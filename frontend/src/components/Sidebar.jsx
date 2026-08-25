import { LayoutDashboard, Link, HardDrive, Package, Calendar, BookOpen, Monitor, Tag, Store, Users, LogOut, ClipboardCheck } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLE_LABELS } from '../utils/roles.js';

// Exportado para o App.jsx reaproveitar: título do módulo atual no header mobile e a
// lista de rotas da barra de navegação inferior (BottomNav) usam a mesma fonte de verdade.
export const menuItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/links', label: 'Links Uteis', icon: Link },
  { to: '/ativos', label: 'Ativos', icon: HardDrive },
  { to: '/estoque', label: 'Estoque', icon: Package },
  { to: '/escala', label: 'Escala', icon: Calendar },
  { to: '/conhecimento', label: 'Conhecimento', icon: BookOpen },
  { to: '/filiais', label: 'Gest. Filiais', icon: Store },
  { to: '/zebra', label: 'Insumos Zebra', icon: Tag },
  { to: '/qualidade', label: 'Qualidade', icon: ClipboardCheck },
];

export const usuariosMenuItem = { to: '/usuarios', label: 'Usuários', icon: Users };

export function Sidebar({ onNavigate }) {
  const { user, logout, isAdmin } = useAuth();

  const items = isAdmin ? [...menuItems, usuariosMenuItem] : menuItems;

  return (
    <aside className="w-64 bg-dark-900 border-r border-dark-700 flex flex-col h-app">
      <div className="h-1 bg-gradient-to-r from-primary-500 via-primary-400 to-accent-500 w-full" />

      <div className="px-6 py-5 border-b border-dark-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/30">
            <span className="text-white font-black text-xl leading-none" style={{ fontStyle: 'italic' }}>Q</span>
          </div>
          <div className="leading-tight">
            <p className="text-white font-black text-lg tracking-tight leading-none">
              Qu<span className="text-primary-400">e</span>ir
              <span className="relative inline-block">
                o
              </span>z
              <span className="text-brand-500">.</span>
            </p>
            <p className="text-dark-400 text-xs font-medium tracking-widest uppercase mt-0.5">Portal TIC</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4" aria-label="Menu principal">
        <ul className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.to}>
                {/* NavLink resolve o estado "ativo" pela URL, então recarregar a página mantém
                    o item certo destacado — o que o antigo currentView em memória não fazia. */}
                <NavLink
                  to={item.to}
                  onClick={onNavigate}
                  className={({ isActive }) => `sidebar-item w-full ${isActive ? 'active' : ''}`}
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={`w-5 h-5 ${isActive ? 'text-primary-400' : 'text-dark-400'}`} />
                      <span className={`flex-1 text-sm font-medium text-left ${isActive ? 'text-white' : 'text-dark-300'}`}>
                        {item.label}
                      </span>
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t border-dark-700">
        <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-dark-800 border border-dark-700">
          <div className="w-9 h-9 bg-primary-500/20 border border-primary-500/40 rounded-full flex items-center justify-center shrink-0">
            <Monitor className="w-4 h-4 text-primary-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.nomeCompleto || user?.username}</p>
            <p className="text-xs text-dark-400">{ROLE_LABELS[user?.role] || user?.role}</p>
          </div>
          <button
            onClick={logout}
            title="Sair" aria-label="Sair"
            className="w-11 h-11 rounded-lg bg-dark-700 hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center text-dark-400 transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
