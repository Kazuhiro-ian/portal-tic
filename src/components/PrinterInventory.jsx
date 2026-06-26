import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { Modal } from './Modal.jsx';

const brands = ['HP', 'Canon', 'Epson', 'Brother', 'Samsung', 'Lexmark', 'Ricoh', 'Xerox'];

export function PrinterInventory() {
  const [printers, setPrinters] = useLocalStorage('ithub_printers', []);
  const [search, setSearch] = useState('');
  const [filterBrand, setFilterBrand] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState(null);
  const [pinging, setPinging] = useState(null);
  const [formData, setFormData] = useState({
    ip: '',
    location: '',
    brand: 'HP',
    model: '',
    serialNumber: '',
    status: 'Offline',
    lastMaintenance: '',
  });

  const filteredPrinters = printers.filter((p) => {
    const matchSearch =
      p.ip.includes(search) ||
      p.location.toLowerCase().includes(search.toLowerCase()) ||
      p.model.toLowerCase().includes(search.toLowerCase());
    const matchBrand = filterBrand === 'all' || p.brand === filterBrand;
    const matchStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchSearch && matchBrand && matchStatus;
  });

  const handleOpenModal = (printer) => {
    if (printer) {
      setEditingPrinter(printer);
      setFormData({
        ip: printer.ip,
        location: printer.location,
        brand: printer.brand,
        model: printer.model,
        serialNumber: printer.serialNumber,
        status: printer.status,
        lastMaintenance: printer.lastMaintenance,
      });
    } else {
      setEditingPrinter(null);
      setFormData({
        ip: '',
        location: '',
        brand: 'HP',
        model: '',
        serialNumber: '',
        status: 'Offline',
        lastMaintenance: new Date().toISOString().split('T')[0],
      });
    }
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formData.ip.trim() || !formData.location.trim() || !formData.model.trim() || !formData.serialNumber.trim()) return;

    if (editingPrinter) {
      setPrinters(
        printers.map((p) =>
          p.id === editingPrinter.id ? { ...p, ...formData } : p
        )
      );
    } else {
      const newPrinter = {
        id: Date.now().toString(),
        ...formData,
      };
      setPrinters([newPrinter, ...printers]);
    }
    setShowModal(false);
  };

  const handleDelete = (id) => {
    if (confirm('Tem certeza que deseja excluir esta impressora?')) {
      setPrinters(printers.filter((p) => p.id !== id));
    }
  };

  const handlePing = async (id) => {
    setPinging(id);
    await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 1000));
    const success = Math.random() > 0.3;
    setPrinters(
      printers.map((p) =>
        p.id === id ? { ...p, status: success ? 'Online' : 'Offline' } : p
      )
    );
    setPinging(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Inventario de Impressoras</h1>
          <p className="text-dark-400 mt-1">{printers.length} impressoras cadastradas</p>
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
                    Nenhuma impressora encontrada
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
                      {new Date(printer.lastMaintenance).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handlePing(printer.id)}
                          disabled={pinging === printer.id}
                          className="btn-secondary px-3 py-1.5 text-sm"
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
            <label className="block text-sm font-medium text-dark-300 mb-2">Endereco IP *</label>
            <input
              type="text"
              value={formData.ip}
              onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
              className="input-field"
              placeholder="192.168.1.100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Localizacao/Setor *</label>
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
            <label className="block text-sm font-medium text-dark-300 mb-2">Numero de Serie *</label>
            <input
              type="text"
              value={formData.serialNumber}
              onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
              className="input-field"
              placeholder="Ex: HP2024001"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Status</label>
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
            <label className="block text-sm font-medium text-dark-300 mb-2">Data da Ultima Manutencao</label>
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
            {editingPrinter ? 'Salvar' : 'Adicionar'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
