import { LayoutDashboard, Link, Printer, Package, Calendar, BookOpen, Monitor, Tag, Store, Users, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'links', label: 'Links Uteis', icon: Link },
  { id: 'printers', label: 'Impressoras', icon: Printer },
  { id: 'stock', label: 'Estoque', icon: Package },
  { id: 'schedule', label: 'Escala', icon: Calendar },
  { id: 'knowledge', label: 'Conhecimento', icon: BookOpen },
  { id: 'branches', label: 'Gest. Filiais', icon: Store },
  { id: 'zebra', label: 'Insumos Zebra', icon: Tag },
];

const roleLabels = {
  ADMIN: 'Administrador',
  TECNICO: 'Técnico',
  LEITURA: 'Leitura',
};

export function Sidebar({ currentView, onViewChange }) {
  const { user, logout, isAdmin } = useAuth();

  const items = isAdmin
    ? [...menuItems, { id: 'usuarios', label: 'Usuários', icon: Users }]
    : menuItems;

  return (
    <aside className="w-64 bg-dark-900 border-r border-dark-700 flex flex-col min-h-screen">
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

      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onViewChange(item.id)}
                  className={`sidebar-item w-full ${isActive ? 'active' : ''}`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-primary-400' : 'text-dark-400'}`} />
                  <span className={`flex-1 text-sm font-medium text-left ${isActive ? 'text-white' : 'text-dark-300'}`}>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-dark-700">
        <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-dark-800 border border-dark-700">
          <div className="w-9 h-9 bg-primary-500/20 border border-primary-500/40 rounded-full flex items-center justify-center shrink-0">
            <Monitor className="w-4 h-4 text-primary-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.nomeCompleto || user?.username}</p>
            <p className="text-xs text-dark-400">{roleLabels[user?.role] || user?.role}</p>
          </div>
          <button
            onClick={logout}
            title="Sair"
            className="w-8 h-8 rounded-lg bg-dark-700 hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center text-dark-400 transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
