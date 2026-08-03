import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Importação dos Componentes
import { Sidebar } from './components/Sidebar.jsx';
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

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="h-screen bg-dark-900 flex overflow-hidden">
      {/* Overlay Escuro para Mobile */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar Lateral */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-50 transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 transition-transform duration-200 ease-in-out`}
      >
        <Sidebar onNavigate={() => setSidebarOpen(false)} />
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Cabeçalho Mobile */}
        <header className="lg:hidden bg-dark-800 border-b border-dark-700 px-4 py-3 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center shadow-md shadow-primary-500/30">
                <span className="text-white font-black text-lg leading-none italic">Q</span>
              </div>
              <div className="leading-tight">
                <p className="text-white font-black text-base tracking-tight leading-none">
                  Queiroz<span className="text-brand-500">.</span>
                </p>
                <p className="text-dark-400 text-[10px] uppercase tracking-widest">TI Queiroz</p>
              </div>
            </div>

            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-10 h-10 rounded-lg bg-dark-700 flex items-center justify-center"
              aria-label={sidebarOpen ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={sidebarOpen}
            >
              {sidebarOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
            </button>
          </div>
        </header>

        {/* Área de Renderização dos Componentes */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto scrollbar-thin" key={location.pathname}>
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
        </main>

      </div>
    </div>
  );
}

export default App;
