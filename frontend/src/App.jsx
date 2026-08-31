import { useEffect, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useScrollLock } from './hooks/useScrollLock.js';
import { useFocusTrap } from './hooks/useFocusTrap.js';

// Importação dos Componentes
import { Sidebar, menuItems, usuariosMenuItem } from './components/Sidebar.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { BottomNav } from './components/BottomNav.jsx';
import { Dashboard } from './components/Dashboard.jsx';
import { LinksManager } from './components/LinksManager.jsx';
import { AssetInventory } from './components/AssetInventory.jsx';
import { StockDashboard } from './components/StockDashboard.jsx';
import { EmployeeSchedule } from './components/EmployeeSchedule.jsx';
import { KnowledgeBase } from './components/KnowledgeBase.jsx';
import { ZebraSupplies } from './components/ZebraSupplies.jsx';
import { BranchManagement } from './components/BranchManagement.jsx';
import { UsuarioManagement } from './components/UsuarioManagement.jsx';
import { QualityPlanning } from './components/QualityPlanning.jsx';
import { LoginPage } from './components/LoginPage.jsx';
import { useAuth } from './context/AuthContext.jsx';

function App() {
  const { isAuthenticated, isAdmin } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Fecha o menu lateral a cada navegação no mobile, onde ele cobre a tela inteira.
  const location = useLocation();

  const sidebarWrapperRef = useRef(null);
  const menuButtonRef = useRef(null);
  const touchStartXRef = useRef(null);

  // Sidebar mobile é um overlay sobre o <main>, que tem scroll próprio — sem isto, arrastar
  // o menu rola o conteúdo atrás dele junto (scroll chaining). Ver PLANO-MOBILE.md §1.3/§4.2.
  useScrollLock(sidebarOpen);

  // Esc fecha o menu mobile e devolve o foco ao botão que o abriu.
  useEffect(() => {
    if (!sidebarOpen) return undefined;
    const aoTeclar = (evento) => {
      if (evento.key === 'Escape') {
        setSidebarOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [sidebarOpen]);

  // Foco preso dentro do menu enquanto aberto no mobile (Tab não escapa para o conteúdo atrás).
  // Mesma lógica reaproveitada em Modal/SidePanel via useFocusTrap.
  useFocusTrap(sidebarWrapperRef, sidebarOpen);

  // Arrastar o menu para a esquerda fecha, como o usuário espera de um painel deslizante.
  const aoTocarInicio = (evento) => {
    touchStartXRef.current = evento.touches[0].clientX;
  };
  const aoTocarMover = (evento) => {
    if (touchStartXRef.current === null) return;
    const deltaX = evento.touches[0].clientX - touchStartXRef.current;
    if (deltaX < -60) {
      setSidebarOpen(false);
      touchStartXRef.current = null;
    }
  };
  const aoTocarFim = () => {
    touchStartXRef.current = null;
  };

  const todosMenuItems = isAdmin ? [...menuItems, usuariosMenuItem] : menuItems;
  const moduloAtual = todosMenuItems.find((item) => location.pathname.startsWith(item.to));

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="h-app bg-dark-900 flex overflow-hidden">
      {/* Overlay Escuro para Mobile */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-200 ${
          sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar Lateral */}
      <div
        ref={sidebarWrapperRef}
        onTouchStart={aoTocarInicio}
        onTouchMove={aoTocarMover}
        onTouchEnd={aoTocarFim}
        className={`fixed lg:static inset-y-0 left-0 z-50 transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 transition-transform duration-200 ease-in-out`}
      >
        <Sidebar onNavigate={() => setSidebarOpen(false)} />
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Cabeçalho Mobile */}
        <header className="lg:hidden bg-dark-800 border-b border-dark-700 px-4 py-3 pt-safe-top sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center shadow-md shadow-primary-500/30">
                <span className="text-white font-black text-lg leading-none italic">Q</span>
              </div>
              <div className="leading-tight">
                <p className="text-white font-black text-base tracking-tight leading-none">
                  Queiroz<span className="text-brand-500">.</span>
                </p>
                <p className="text-dark-400 text-[10px] uppercase tracking-widest">
                  {moduloAtual?.label || 'TI Queiroz'}
                </p>
              </div>
            </div>

            <button
              ref={menuButtonRef}
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-11 h-11 rounded-lg bg-dark-700 flex items-center justify-center"
              aria-label={sidebarOpen ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={sidebarOpen}
            >
              {sidebarOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
            </button>
          </div>
        </header>

        {/* Área de Renderização dos Componentes */}
        {/* pb maior no mobile: espaço para o BottomNav (~56px) + safe-area não cobrir o
            fim do conteúdo. */}
        <main
          id="main-scroll"
          className="flex-1 p-4 lg:p-8 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-8 overflow-y-auto overscroll-contain scrollbar-thin"
          key={location.pathname}
        >
          {/* Um erro de render em qualquer tela vira um card de erro dentro do <main>, em vez
              de desmontar o app inteiro e deixar só o fundo da página à mostra. resetKey na
              rota faz a tela de erro sumir sozinha ao navegar para outro módulo. */}
          <ErrorBoundary resetKey={location.pathname}>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/links" element={<LinksManager />} />
              <Route path="/ativos" element={<AssetInventory />} />
              <Route path="/estoque" element={<StockDashboard />} />
              <Route path="/escala" element={<EmployeeSchedule />} />
              <Route path="/conhecimento" element={<KnowledgeBase />} />
              <Route path="/filiais" element={<BranchManagement />} />
              <Route path="/zebra" element={<ZebraSupplies />} />
              <Route path="/qualidade" element={<QualityPlanning />} />
              {/* A rota de usuários só existe para ADMIN. Quem não for cai no dashboard, e o
                  backend recusa /api/usuarios de qualquer forma. */}
              <Route
                path="/usuarios"
                element={isAdmin ? <UsuarioManagement /> : <Navigate to="/dashboard" replace />}
              />
              {/* URL desconhecida volta para o dashboard em vez de deixar a tela em branco. */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </ErrorBoundary>
        </main>

      </div>

      <BottomNav onAbrirMais={() => setSidebarOpen(true)} />
    </div>
  );
}

export default App;
