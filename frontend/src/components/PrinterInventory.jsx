import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Wifi, WifiOff, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { Modal } from './Modal.jsx';
import { listarImpressoras, salvarImpressora, atualizarImpressora, deletarImpressora } from '../services/api.js';

const brands = ['HP', 'Canon', 'Epson', 'Brother', 'Samsung', 'Lexmark', 'Ricoh', 'Xerox'];

const emptyForm = {
  ip: '',
  location: '',
  brand: 'HP',
  model: '',
  serialNumber: '',
  status: 'Offline',
  lastMaintenance: new Date().toISOString().split('T')[0], 
};

export function PrinterInventory() {
  const [printers, setPrinters] = useState([]);
  const [search, setSearch] = useState('');
  const [filterBrand, setFilterBrand] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState(null);
  const [pinging, setPinging] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(true);

  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => { setToast(null); }, 4000);
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setIsLoading(true);
      const data = await listarImpressoras();
      setPrinters(data);
    } catch (error) {
      console.error(error);
      showToast('Erro ao carregar impressoras do servidor.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPrinters = printers.filter((p) => {
    const matchSearch =
      (p.ip && p.ip.includes(search)) ||
      (p.location && p.location.toLowerCase().includes(search.toLowerCase())) ||
      (p.model && p.model.toLowerCase().includes(search.toLowerCase()));
    const matchBrand = filterBrand === 'all' || p.brand === filterBrand;
    const matchStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchSearch && matchBrand && matchStatus;
  });

  const handleOpenModal = (printer) => {
    if (printer) {
      setEditingPrinter(printer);
      setFormData({
        ip: printer.ip || '',
        location: printer.location || '',
        brand: printer.brand || 'HP',
        model: printer.model || '',
        serialNumber: printer.serialNumber || '',
        status: printer.status || 'Offline',
        lastMaintenance: printer.lastMaintenance || '',
      });
    } else {
      setEditingPrinter(null);
      setFormData(emptyForm);
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.ip.trim() || !formData.location.trim() || !formData.model.trim() || !formData.serialNumber.trim()) {
      showToast('Preencha os campos obrigatórios.', 'error');
      return;
    }

    try {
      // Formata o payload para garantir que strings vazias de data sejam nulas para o Java
      const payload = {
        ...formData,
        lastMaintenance: formData.lastMaintenance ? formData.lastMaintenance : null
      };

      if (editingPrinter) {
        await atualizarImpressora(editingPrinter.id, payload);
        showToast('Impressora atualizada com sucesso!');
      } else {
        await salvarImpressora(payload);
        showToast('Impressora cadastrada com sucesso!');
      }
      
      await carregarDados();
      setShowModal(false);
      setEditingPrinter(null);
      setFormData(emptyForm);
    } catch (error) {
      showToast('Erro ao salvar impressora.', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Tem certeza que deseja excluir esta impressora?')) {
      try {
        await deletarImpressora(id);
        showToast('Impressora excluída com sucesso.');
        await carregarDados();
      } catch (error) {
        showToast('Erro ao excluir a impressora.', 'error');
      }
    }
  };

  const handlePing = async (printer) => {
    setPinging(printer.id);
    
    // Simulação do tempo de resposta do Ping
    await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 1000));
    const success = Math.random() > 0.3; // 70% de chance de sucesso
    
    const novoStatus = success ? 'Online' : 'Offline';
    
    try {
      // Atualiza o status no banco de dados
      await atualizarImpressora(printer.id, { ...printer, status: novoStatus });
      showToast(`Ping concluído: A impressora está ${novoStatus}.`, success ? 'success' : 'error');
      await carregarDados();
    } catch (error) {
      showToast('Erro ao registrar o status do ping.', 'error');
    } finally {
      setPinging(null);
    }
  };

  return (
    <div className="space-y-6 relative">
      
      {/* Sistema de Notificação Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border bg-dark-800 text-white transition-all">
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-dark-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Inventário de Impressoras</h1>
          <p className="text-dark-400 mt-1">
            {isLoading ? 'Carregando...' : `${printers.length} impressoras cadastradas`}
          </p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn-primary">
          <Plus className="w-4 h-4" />
          Nova Impressora
        </button>
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              placeholder="Buscar por IP, localizacao ou modelo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <select
            value={filterBrand}
            onChange={(e) => setFilterBrand(e.target.value)}
            className="select-field sm:w-40"
          >
            <option value="all">Todas Marcas</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="select-field sm:w-40"
          >
            <option value="all">Todos Status</option>
            <option value="Online">Online</option>
            <option value="Offline">Offline</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Status</th>
                <th className="table-header">IP</th>
                <th className="table-header">Localizacao</th>
                <th className="table-header">Marca</th>
                <th className="table-header">Modelo</th>
                <th className="table-header">Num. Serie</th>
                <th className="table-header">Ult. Manutencao</th>
                <th className="table-header text-right">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {filteredPrinters.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-dark-400">
                    {isLoading ? 'Conectando ao banco de dados...' : 'Nenhuma impressora encontrada.'}
                  </td>
                </tr>
              ) : (
                filteredPrinters.map((printer) => (
                  <tr key={printer.id} className="hover:bg-dark-700/30 transition-colors">
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        {printer.status === 'Online' ? (
                          <Wifi className="w-5 h-5 text-green-400" />
                        ) : (
                          <WifiOff className="w-5 h-5 text-red-400" />
                        )}
                        <span className={`badge ${printer.status === 'Online' ? 'badge-success' : 'badge-danger'}`}>
                          {printer.status}
                        </span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <code className="text-primary-400 bg-dark-700 px-2 py-1 rounded text-sm">{printer.ip}</code>
                    </td>
                    <td className="table-cell text-dark-100">{printer.location}</td>
                    <td className="table-cell text-dark-100">{printer.brand}</td>
                    <td className="table-cell text-dark-100">{printer.model}</td>
                    <td className="table-cell text-dark-300 text-sm">{printer.serialNumber}</td>
                    <td className="table-cell text-dark-300 text-sm">
                      {printer.lastMaintenance ? new Date(printer.lastMaintenance + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handlePing(printer)}
                          disabled={pinging === printer.id}
                          className="btn-secondary px-3 py-1.5 text-sm"
                          title="Atualizar status da rede"
                        >
                          {pinging === printer.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Wifi className="w-4 h-4" />
                          )}
                          {pinging === printer.id ? 'Testando...' : 'Ping'}
                        </button>
                        <button
                          onClick={() => handleOpenModal(printer)}
                          className="btn-secondary px-3 py-1.5"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(printer.id)}
                          className="btn-danger px-3 py-1.5"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingPrinter ? 'Editar Impressora' : 'Nova Impressora'}
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Endereço IP *</label>
            <input
              type="text"
              value={formData.ip}
              onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
              className="input-field"
              placeholder="192.168.1.100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Localização/Setor *</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="input-field"
              placeholder="Ex: Financeiro"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Marca *</label>
            <select
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              className="select-field"
            >
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Modelo *</label>
            <input
              type="text"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              className="input-field"
              placeholder="Ex: LaserJet Pro M404n"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Número de Série *</label>
            <input
              type="text"
              value={formData.serialNumber}
              onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
              className="input-field"
              placeholder="Ex: HP2024001"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Status Inicial</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="select-field"
            >
              <option value="Online">Online</option>
              <option value="Offline">Offline</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-dark-300 mb-2">Data da Última Manutenção</label>
            <input
              type="date"
              value={formData.lastMaintenance}
              onChange={(e) => setFormData({ ...formData, lastMaintenance: e.target.value })}
              className="input-field"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setShowModal(false)} className="btn-secondary">
            Cancelar
          </button>
          <button onClick={handleSave} className="btn-primary">
            {editingPrinter ? 'Salvar Alterações' : 'Adicionar'}
          </button>
        </div>
      </Modal>
    </div>
  );
}