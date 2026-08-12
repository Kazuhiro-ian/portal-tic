import { LayoutDashboard, HardDrive, Package, Calendar, Menu } from 'lucide-react';
import { NavLink } from 'react-router-dom';

// Os 4 módulos mais usados no dia a dia + "Mais" (abre a sidebar completa). Reduz de 2
// toques para 1 a troca de módulo mais comum no mobile. Só aparece abaixo de `lg`, onde a
// sidebar fixa não está visível. Ver PLANO-MOBILE.md §3.
const ITENS_PRINCIPAIS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/ativos', label: 'Ativos', icon: HardDrive },
  { to: '/estoque', label: 'Estoque', icon: Package },
  { to: '/escala', label: 'Escala', icon: Calendar },
];

export function BottomNav({ onAbrirMais }) {
  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-dark-800 border-t border-dark-700 pb-safe-bottom"
      aria-label="Navegação principal"
    >
      <div className="grid grid-cols-5">
        {ITENS_PRINCIPAIS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className="flex flex-col items-center justify-center gap-1 min-h-[56px] py-2 text-[11px] font-medium"
          >
            {({ isActive }) => (
              <>
                <item.icon className={`w-5 h-5 ${isActive ? 'text-primary-400' : 'text-dark-400'}`} />
                <span className={isActive ? 'text-primary-400' : 'text-dark-400'}>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={onAbrirMais}
          className="flex flex-col items-center justify-center gap-1 min-h-[56px] py-2 text-[11px] font-medium text-dark-400"
          aria-label="Mais opções do menu"
        >
          <Menu className="w-5 h-5" />
          <span>Mais</span>
        </button>
      </div>
    </nav>
  );
}
