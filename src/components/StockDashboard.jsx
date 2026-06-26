import { useState } from 'react';
import { Plus, Search, Edit, Trash2, Minus, AlertTriangle, Cpu, HardDrive, Printer, ArrowLeftRight, Package } from 'lucide-react';
import { Modal } from './Modal.jsx';
import { StockDispatch } from './StockDispatch.jsx';

const categoryInfo = {
  peripherals: { label: 'Perifericos e Cabos', icon: Cpu, bgClass: 'bg-primary-500/20', textClass: 'text-primary-400' },
  storage: { label: 'Armazenamento e Memoria', icon: HardDrive, bgClass: 'bg-accent-500/20', textClass: 'text-accent-400' },
  consumables: { label: 'Consumiveis de Impressao', icon: Printer, bgClass: 'bg-brand-500/20', textClass: 'text-brand-400' },
};

export function StockDashboard({ items, setItems, movements, setMovements }) {
  const [activeTab, setActiveTab] = useState('inventory');
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'peripherals',
    subcategory: '',
    quantity: 0,
    minQuantity: 5,
    location: '',
  });

  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustItem, setAdjustItem] = useState(null);
  const [adjustData, setAdjustData] = useState({
    type: 'IN',
    quantity: 1,
    destination: '',
    notes: '',
  });
  const [adjustError, setAdjustError] = useState('');

  const filteredItems = items.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = filterCategory === 'all' || item.category === filterCategory;
    const matchCritical = !showCriticalOnly || item.quantity <= item.minQuantity;
    return matchSearch && matchCategory && matchCritical;
  });

  const criticalCount = items.filter((i) => i.quantity <= i.minQuantity).length;

  const handleOpenModal = (item) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        category: item.category,
        subcategory: item.subcategory || '',
        quantity: item.quantity,
        minQuantity: item.minQuantity,
        location: item.location,
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        category: 'peripherals',
        subcategory: '',
        quantity: 0,
        minQuantity: 5,
        location: '',
      });
    }
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formData.name.trim() || !formData.location.trim()) return;

    if (editingItem) {
      setItems((prev) =>
        prev.map((i) => (i.id === editingItem.id ? { ...i, ...formData } : i))
      );
    } else {
      const newItem = {
        id: Date.now().toString(),
        ...formData,
      };
      setItems((prev) => [newItem, ...prev]);
    }
    setShowModal(false);
  };

  const handleDelete = (id) => {
    if (confirm('Tem certeza que deseja excluir este item?')) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
  };

  const adjustQuantity = (id, delta) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i
      )
    );
  };

  const openAdjustModal = (item) => {
    setAdjustItem(item);
    setAdjustData({ type: 'IN', quantity: 1, destination: '', notes: '' });
    setAdjustError('');
    setShowAdjustModal(true);
  };

  const handleAdjustSave = () => {
    if (!adjustItem) return;
    const qty = Math.floor(Number(adjustData.quantity));
    if (!qty || qty <= 0) {
      setAdjustError('Informe uma quantidade valida maior que zero.');
      return;
    }
    if (adjustData.type === 'OUT' && qty > adjustItem.quantity) {
      setAdjustError(`Estoque insuficiente. Disponivel: ${adjustItem.quantity}.`);
      return;
    }
    if (adjustData.type === 'OUT' && !adjustData.destination.trim()) {
      setAdjustError('Informe o destino da saida.');
      return;
    }

    const newQuantity =
      adjustData.type === 'IN' ? adjustItem.quantity + qty : adjustItem.quantity - qty;

    setItems((prev) =>
      prev.map((i) => (i.id === adjustItem.id ? { ...i, quantity: newQuantity } : i))
    );

    const movement = {
      id: Date.now().toString(),
      itemId: adjustItem.id,
      itemName: adjustItem.name,
      type: adjustData.type,
      quantity: qty,
      destination: adjustData.destination.trim() || (adjustData.type === 'IN' ? 'Entrada manual' : 'Saida manual'),
      date: new Date().toISOString(),
      notes: adjustData.notes.trim() || undefined,
    };
    setMovements((prev) => [movement, ...prev]);

    setShowAdjustModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Estoque e Insumos</h1>
          <p className="text-dark-400 mt-1">
            {items.length} itens cadastrados
            {criticalCount > 0 && (
              <span className="text-red-400 ml-2">
                ({criticalCount} com estoque baixo)
              </span>
            )}
          </p>
        </div>
        {activeTab === 'inventory' && (
          <button onClick={() => handleOpenModal()} className="btn-primary">
            <Plus className="w-4 h-4" />
            Novo Item
          </button>
        )}
      </div>

      <div className="flex gap-2 border-b border-dark-700">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'inventory'
              ? 'border-primary-500 text-white'
              : 'border-transparent text-dark-400 hover:text-dark-200'
          }`}
        >
          <Package className="w-4 h-4 inline mr-2" />
          Inventario
        </button>
        <button
          onClick={() => setActiveTab('dispatch')}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'dispatch'
              ? 'border-primary-500 text-white'
              : 'border-transparent text-dark-400 hover:text-dark-200'
          }`}
        >
          <ArrowLeftRight className="w-4 h-4 inline mr-2" />
          Entregas e Movimentacoes
        </button>
      </div>

      {activeTab === 'dispatch' ? (
        <StockDispatch
          items={items}
          setItems={setItems}
          movements={movements}
          setMovements={setMovements}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(categoryInfo).map(([key, info]) => {
              const count = items.filter((i) => i.category === key).length;
              const critical = items.filter((i) => i.category === key && i.quantity <= i.minQuantity).length;
              const Icon = info.icon;
              return (
                <div
                  key={key}
                  className={`card cursor-pointer ${filterCategory === key ? 'border-primary-500 bg-primary-500/5' : ''}`}
                  onClick={() => setFilterCategory(filterCategory === key ? 'all' : key)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 ${info.bgClass} rounded-xl flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${info.textClass}`} />
                    </div>
                    <div>
                      <p className="font-medium text-white">{info.label}</p>
                      <p className="text-sm text-dark-400">{count} itens</p>
                      {critical > 0 && (
                        <p className="text-xs text-red-400">{critical} criticos</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="card">
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                <input
                  type="text"
                  placeholder="Buscar item..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input-field pl-10"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCriticalOnly}
                  onChange={(e) => setShowCriticalOnly(e.target.checked)}
                  className="w-4 h-4 rounded border-dark-600 bg-dark-700 text-primary-500 focus:ring-primary-500"
                />
                <span className="text-dark-300">Apenas estoque baixo</span>
                {showCriticalOnly && <AlertTriangle className="w-4 h-4 text-red-400" />}
              </label>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-header">Item</th>
                    <th className="table-header">Categoria</th>
                    <th className="table-header text-center">Quantidade</th>
                    <th className="table-header text-center">Minimo</th>
                    <th className="table-header">Localizacao</th>
                    <th className="table-header text-right">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-dark-400">
                        Nenhum item encontrado
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => {
                      const isCritical = item.quantity <= item.minQuantity;
                      const info = categoryInfo[item.category];
                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-dark-700/30 transition-colors ${isCritical ? 'bg-red-500/5' : ''}`}
                        >
                          <td className="table-cell">
                            <div>
                              <p className="font-medium text-white">{item.name}</p>
                              {item.subcategory && (
                                <p className="text-xs text-dark-400">{item.subcategory}</p>
                              )}
                            </div>
                          </td>
                          <td className="table-cell">
                            <span className="badge badge-info">{info.label}</span>
                          </td>
                          <td className="table-cell">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => adjustQuantity(item.id, -1)}
                                className="w-7 h-7 rounded bg-dark-600 hover:bg-dark-500 flex items-center justify-center transition-colors"
                              >
                                <Minus className="w-4 h-4 text-dark-300" />
                              </button>
                              <span
                                className={`font-bold text-lg min-w-[40px] text-center ${
                                  isCritical ? 'text-red-400' : 'text-white'
                                }`}
                              >
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => adjustQuantity(item.id, 1)}
                                className="w-7 h-7 rounded bg-dark-600 hover:bg-dark-500 flex items-center justify-center transition-colors"
                              >
                                <Plus className="w-4 h-4 text-dark-300" />
                              </button>
                            </div>
                          </td>
                          <td className="table-cell text-center">
                            <span className={`font-medium ${isCritical ? 'text-red-400' : 'text-dark-300'}`}>
                              {item.minQuantity}
                            </span>
                          </td>
                          <td className="table-cell text-dark-300">{item.location}</td>
                          <td className="table-cell">
                            <div className="flex items-center justify-end gap-2">
                              {isCritical && (
                                <span className="badge badge-danger">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  Critico
                                </span>
                              )}
                              <button
                                onClick={() => openAdjustModal(item)}
                                className="btn-secondary px-3 py-1.5"
                                title="Movimentar / Ajuste rapido"
                              >
                                <ArrowLeftRight className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleOpenModal(item)}
                                className="btn-secondary px-3 py-1.5"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="btn-danger px-3 py-1.5"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingItem ? 'Editar Item' : 'Novo Item'}
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-dark-300 mb-2">Nome do Item *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-field"
              placeholder="Ex: Cabo de Rede Cat6 5m"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Categoria</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="select-field"
            >
              {Object.entries(categoryInfo).map(([key, info]) => (
                <option key={key} value={key}>
                  {info.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Subcategoria</label>
            <input
              type="text"
              value={formData.subcategory}
              onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
              className="input-field"
              placeholder="Ex: Cabos de Rede"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Quantidade Atual</label>
            <input
              type="number"
              min="0"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Quantidade Minima (Critico)</label>
            <input
              type="number"
              min="0"
              value={formData.minQuantity}
              onChange={(e) => setFormData({ ...formData, minQuantity: parseInt(e.target.value) || 0 })}
              className="input-field"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-dark-300 mb-2">Localizacao Fisica *</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="input-field"
              placeholder="Ex: Prateleira A1"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setShowModal(false)} className="btn-secondary">
            Cancelar
          </button>
          <button onClick={handleSave} className="btn-primary">
            {editingItem ? 'Salvar' : 'Adicionar'}
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={showAdjustModal}
        onClose={() => setShowAdjustModal(false)}
        title="Ajuste Rapido de Estoque"
        size="md"
      >
        {adjustItem && (
          <div className="space-y-4">
            <div className="bg-dark-700/50 rounded-lg p-3 border border-dark-700">
              <p className="text-sm text-dark-400">Item selecionado</p>
              <p className="font-medium text-white">{adjustItem.name}</p>
              <p className="text-xs text-dark-400 mt-1">
                Estoque atual: <span className="font-bold text-white">{adjustItem.quantity}</span> un.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Operacao *</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAdjustData({ ...adjustData, type: 'IN' })}
                  className={`px-4 py-2.5 rounded-lg border transition-colors font-medium ${
                    adjustData.type === 'IN'
                      ? 'border-success-500 bg-success-500/10 text-success-400'
                      : 'border-dark-600 bg-dark-700 text-dark-300 hover:bg-dark-600'
                  }`}
                >
                  <Plus className="w-4 h-4 inline mr-2" />
                  Entrada
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustData({ ...adjustData, type: 'OUT' })}
                  className={`px-4 py-2.5 rounded-lg border transition-colors font-medium ${
                    adjustData.type === 'OUT'
                      ? 'border-warning-500 bg-warning-500/10 text-warning-400'
                      : 'border-dark-600 bg-dark-700 text-dark-300 hover:bg-dark-600'
                  }`}
                >
                  <Minus className="w-4 h-4 inline mr-2" />
                  Saida
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Quantidade *</label>
              <input
                type="number"
                min="1"
                value={adjustData.quantity}
                onChange={(e) => setAdjustData({ ...adjustData, quantity: parseInt(e.target.value) || 0 })}
                className="input-field"
                placeholder="Ex: 70"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Destino {adjustData.type === 'OUT' ? '*' : '(opcional)'}
              </label>
              <input
                type="text"
                value={adjustData.destination}
                onChange={(e) => setAdjustData({ ...adjustData, destination: e.target.value })}
                className="input-field"
                placeholder={adjustData.type === 'IN' ? 'Ex: Compra, Doacao' : 'Ex: Filial Centro, Setor Financeiro'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Observacoes (opcional)</label>
              <textarea
                value={adjustData.notes}
                onChange={(e) => setAdjustData({ ...adjustData, notes: e.target.value })}
                className="input-field resize-none"
                rows={2}
                placeholder="Notas adicionais..."
              />
            </div>

            {adjustError && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                {adjustError}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowAdjustModal(false)} className="btn-secondary">
                Cancelar
              </button>
              <button onClick={handleAdjustSave} className="btn-primary">
                Confirmar Ajuste
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
