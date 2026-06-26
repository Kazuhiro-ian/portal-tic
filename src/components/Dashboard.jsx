import { useState } from 'react';
import { Printer, Package, Users, AlertTriangle, ExternalLink, Plus, X, Zap, Cloud, Server, Tag } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { Modal } from './Modal.jsx';

export function Dashboard({ printers, stock, employees }) {
  const [links] = useLocalStorage('ithub_links', []);
  const [notices, setNotices] = useLocalStorage('ithub_notices', []);
  const [branches] = useLocalStorage('ithub_branches', []);
  const [branchQuotas] = useLocalStorage('ithub_branch_quotas', []);
  const [zebraDistributions] = useLocalStorage('ithub_zebra_distributions', []);
  const [showAddNotice, setShowAddNotice] = useState(false);
  const [newNotice, setNewNotice] = useState({ message: '', priority: 'medium' });

  const onlinePrinters = printers.filter((p) => p.status === 'Online').length;
  const lowStockItems = stock.filter((s) => s.quantity <= s.minQuantity);
  const todayName = new Date().toLocaleDateString('pt-BR', { weekday: 'long' });
  const capitalizedToday = todayName.charAt(0).toUpperCase() + todayName.slice(1);
  const todayEmployees = employees.filter((e) =>
    e.workingDays.some((d) => d.toLowerCase() === todayName.toLowerCase())
  );

  const zebraPendingBranches = (() => {
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
    });
  })();

  const zebraBranchLabel = (branchId) => {
    const b = branches.find((br) => br.id === branchId);
    return b ? `Loja ${b.branchNumber} - ${b.name}` : branchId;
  };

  const handleAddNotice = () => {
    if (!newNotice.message.trim()) return;
    const notice = {
      id: Date.now().toString(),
      message: newNotice.message,
      author: 'Admin TI',
      createdAt: new Date().toISOString(),
      priority: newNotice.priority,
    };
    setNotices([notice, ...notices]);
    setNewNotice({ message: '', priority: 'medium' });
    setShowAddNotice(false);
  };

  const handleDeleteNotice = (id) => {
    setNotices(notices.filter((n) => n.id !== id));
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'cloud':
        return Cloud;
      case 'internal':
        return Server;
      default:
        return Zap;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-500/15 border border-primary-500/30 text-primary-400 text-xs font-semibold tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse" />
              Grupo Queiroz TI
            </span>
          </div>
          <p className="text-dark-400">Visao geral do setor de TI</p>
        </div>
        <div className="text-right">
          <p className="text-dark-400 text-sm">{capitalizedToday}</p>
          <p className="text-white font-medium">{new Date().toLocaleDateString('pt-BR')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <div className="metric-card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center">
              <Printer className="w-6 h-6 text-primary-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{printers.length}</p>
              <p className="text-sm text-dark-400">Impressoras</p>
            </div>
          </div>
          <p className="text-xs text-dark-400 mt-2">{onlinePrinters} online</p>
        </div>

        <div className="metric-card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{lowStockItems.length}</p>
              <p className="text-sm text-dark-400">Estoque Baixo</p>
            </div>
          </div>
          <p className="text-xs text-dark-400 mt-2">{stock.length} itens totais</p>
        </div>

        <div className="metric-card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{todayEmployees.length}</p>
              <p className="text-sm text-dark-400">No Plantao Hoje</p>
            </div>
          </div>
          <p className="text-xs text-dark-400 mt-2">{employees.length} colaboradores</p>
        </div>

        <div className="metric-card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{notices.length}</p>
              <p className="text-sm text-dark-400">Avisos Ativos</p>
            </div>
          </div>
          <p className="text-xs text-dark-400 mt-2">{notices.filter((n) => n.priority === 'high').length} urgentes</p>
        </div>

        <div className={`metric-card sm:col-span-2 lg:col-span-1 ${zebraPendingBranches.length > 0 ? 'border-accent-500/40 bg-accent-500/5' : ''}`}>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${zebraPendingBranches.length > 0 ? 'bg-accent-500/20' : 'bg-dark-700'}`}>
              <Tag className={`w-6 h-6 ${zebraPendingBranches.length > 0 ? 'text-accent-400' : 'text-dark-400'}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${zebraPendingBranches.length > 0 ? 'text-accent-400' : 'text-white'}`}>{zebraPendingBranches.length}</p>
              <p className="text-sm text-dark-400">Zebra Pendentes</p>
            </div>
          </div>
          <p className="text-xs text-dark-400 mt-2">{branchQuotas.length} filiais cadastradas</p>
        </div>
      </div>

      {zebraPendingBranches.length > 0 && (
        <div className="flex items-start gap-4 p-4 rounded-xl bg-accent-500/10 border border-accent-500/30">
          <div className="w-10 h-10 bg-accent-500/20 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
            <Tag className="w-5 h-5 text-accent-400" />
          </div>
          <div>
            <p className="font-semibold text-accent-300">Insumos Zebra: Envios Pendentes</p>
            <p className="text-sm text-dark-300 mt-1">
              Atencao: Enviar insumos para as filiais:{' '}
              <span className="font-semibold text-white">
                {zebraPendingBranches.map((b) => zebraBranchLabel(b.branchId)).join(', ')}
              </span>
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Avisos da Equipe</h2>
            <button onClick={() => setShowAddNotice(true)} className="btn-primary text-sm">
              <Plus className="w-4 h-4" />
              Novo
            </button>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-thin">
            {notices.length === 0 ? (
              <p className="text-dark-400 text-center py-8">Nenhum aviso cadastrado</p>
            ) : (
              notices.map((notice) => (
                <div
                  key={notice.id}
                  className={`p-3 rounded-lg border ${
                    notice.priority === 'high'
                      ? 'bg-red-500/10 border-red-500/30'
                      : notice.priority === 'medium'
                        ? 'bg-yellow-500/10 border-yellow-500/30'
                        : 'bg-dark-700/50 border-dark-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-dark-100">{notice.message}</p>
                    <button
                      onClick={() => handleDeleteNotice(notice.id)}
                      className="text-dark-400 hover:text-red-400 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-dark-400 mt-2">
                    {notice.author} - {new Date(notice.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Links Mais Utilizados</h2>
          <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto scrollbar-thin">
            {links.slice(0, 8).map((link) => {
              const Icon = getCategoryIcon(link.category);
              return (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg bg-dark-700/50 hover:bg-dark-700 border border-dark-600 hover:border-primary-500/50 transition-all group"
                >
                  <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center group-hover:bg-primary-500/30 transition-colors">
                    <Icon className="w-5 h-5 text-primary-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{link.name}</p>
                    <ExternalLink className="w-3 h-3 text-dark-400 group-hover:text-primary-400 transition-colors" />
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </div>

      {lowStockItems.length > 0 && (
        <div className="card bg-red-500/5 border-red-500/20">
          <h2 className="text-lg font-semibold text-red-400 mb-4">Alerta de Estoque Critico</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowStockItems.map((item) => (
              <div key={item.id} className="p-3 rounded-lg bg-dark-800 border border-red-500/30">
                <p className="text-sm font-medium text-white">{item.name}</p>
                <p className="text-xs text-dark-400 mt-1">{item.subcategory}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="badge badge-danger">{item.quantity} un.</span>
                  <span className="text-xs text-dark-400">Min: {item.minQuantity}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal isOpen={showAddNotice} onClose={() => setShowAddNotice(false)} title="Novo Aviso" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Mensagem</label>
            <textarea
              value={newNotice.message}
              onChange={(e) => setNewNotice({ ...newNotice, message: e.target.value })}
              className="input-field min-h-[100px] resize-none"
              placeholder="Digite a mensagem do aviso..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Prioridade</label>
            <select
              value={newNotice.priority}
              onChange={(e) => setNewNotice({ ...newNotice, priority: e.target.value })}
              className="select-field"
            >
              <option value="low">Baixa</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setShowAddNotice(false)} className="btn-secondary">
              Cancelar
            </button>
            <button onClick={handleAddNotice} className="btn-primary">
              Adicionar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
