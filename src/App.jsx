import { useState, useEffect, useMemo } from 'react';
import { Sidebar } from './components/Sidebar.jsx';
import { Dashboard } from './components/Dashboard.jsx';
import { LinksManager } from './components/LinksManager.jsx';
import { PrinterInventory } from './components/PrinterInventory.jsx';
import { StockDashboard } from './components/StockDashboard.jsx';
import { EmployeeSchedule } from './components/EmployeeSchedule.jsx';
import { KnowledgeBase } from './components/KnowledgeBase.jsx';
import { ZebraSupplies } from './components/ZebraSupplies.jsx';
import { BranchManagement } from './components/BranchManagement.jsx';
import { initializeData } from './data/initialData.js';
import { useLocalStorage } from './hooks/useLocalStorage.js';
import { Menu, X } from 'lucide-react';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [printers] = useLocalStorage('ithub_printers', []);
  const [stock, setStock] = useLocalStorage('ithub_stock', []);
  const [stockMovements, setStockMovements] = useLocalStorage('ithub_stock_movements', []);
  const [employees] = useLocalStorage('ithub_employees', []);
  const [branchQuotas] = useLocalStorage('ithub_branch_quotas', []);
  const [zebraDistributions] = useLocalStorage('ithub_zebra_distributions', []);

  useEffect(() => {
    initializeData();
  }, []);

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
        return <BranchManagement />;
      default:
        return <Dashboard printers={printers} stock={stock} employees={employees} />;
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex">
      <div
        className={`fixed inset-0 bg-black/50 z-40 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}
        onClick={() => setSidebarOpen(false)}
      />

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

      <div className="flex-1 flex flex-col min-w-0">
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

        <main className="flex-1 p-4 lg:p-8 overflow-y-auto scrollbar-thin">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App;
