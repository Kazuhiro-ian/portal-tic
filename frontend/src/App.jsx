import { useState, useMemo } from 'react';
import { Menu, X } from 'lucide-react';

// Importação dos Componentes
import { Sidebar } from './components/Sidebar.jsx';
import { Dashboard } from './components/Dashboard.jsx';
import { LinksManager } from './components/LinksManager.jsx';
import { PrinterInventory } from './components/PrinterInventory.jsx';
import { StockDashboard } from './components/StockDashboard.jsx';
import { EmployeeSchedule } from './components/EmployeeSchedule.jsx';
import { KnowledgeBase } from './components/KnowledgeBase.jsx';
import { ZebraSupplies } from './components/ZebraSupplies.jsx';
import { BranchManagement } from './components/BranchManagement.jsx';

function App() {
  // 1. Estados de Navegação e Interface
  const [currentView, setCurrentView] = useState('branches'); // Sugestão: iniciar na tela de filiais para testarmos
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 2. Estados dos Dados (Temporariamente vazios até criarmos o backend de cada um)
  // O useState vazio garante que a tela não quebre ao tentar renderizar listas
  const [printers, setPrinters] = useState([]);
  const [stock, setStock] = useState([]);
  const [stockMovements, setStockMovements] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [branchQuotas, setBranchQuotas] = useState([]);
  const [zebraDistributions, setZebraDistributions] = useState([]);

  // 3. Lógica de Negócio (Zebra)
  // Como branchQuotas e zebraDistributions estão vazios por enquanto, isso retornará 0
  const zebraPendingCount = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    return branchQuotas.filter((quota) => {
      if (currentDay < quota.dispatchDay) return false;
      return !zebraDistributions.some((d) => {
        const dDate = new Date(d.date + 'T00:00:00');
        return (
          d.branchId === quota.branchId &&
          dDate.getMonth() === currentMonth &&
          dDate.getFullYear() === currentYear
        );
      });
    }).length;
  }, [branchQuotas, zebraDistributions]);

  // 4. Roteamento Interno
  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard printers={printers} stock={stock} employees={employees} />;
      case 'links':
        return <LinksManager />;
      case 'printers':
        return <PrinterInventory />;
      case 'stock':
        return <StockDashboard items={stock} setItems={setStock} movements={stockMovements} setMovements={setStockMovements} />;
      case 'schedule':
        return <EmployeeSchedule />;
      case 'knowledge':
        return <KnowledgeBase />;
      case 'zebra':
        return <ZebraSupplies />;
      case 'branches':
        // BranchManagement agora é 100% autônomo. Ele mesmo busca e salva no backend.
        return <BranchManagement />;
      default:
        return <Dashboard printers={printers} stock={stock} employees={employees} />;
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex">
      {/* Overlay Escuro para Mobile */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar Lateral */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-50 transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 transition-transform duration-200 ease-in-out`}
      >
        <Sidebar
          currentView={currentView}
          onViewChange={(view) => {
            setCurrentView(view);
            setSidebarOpen(false);
          }}
          zebraPendingCount={zebraPendingCount}
        />
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
                <p className="text-dark-400 text-[10px] uppercase tracking-widest">IT-Hub Central</p>
              </div>
            </div>
            
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-10 h-10 rounded-lg bg-dark-700 flex items-center justify-center"
            >
              {sidebarOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
            </button>
          </div>
        </header>

        {/* Área de Renderização dos Componentes */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto scrollbar-thin">
          {renderContent()}
        </main>
        
      </div>
    </div>
  );
}

export default App;