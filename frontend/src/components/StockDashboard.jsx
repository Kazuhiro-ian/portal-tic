import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Minus, AlertTriangle, Cpu, HardDrive, Printer, ArrowLeftRight, Package, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { Modal } from './Modal.jsx';
import { StockDispatch } from './StockDispatch.jsx';
import { listarEstoqueItens, salvarEstoqueItem, atualizarEstoqueItem, deletarEstoqueItem, salvarMovimento } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const categoryInfo = {
  peripherals: { label: 'Periféricos e Cabos', icon: Cpu, bgClass: 'bg-primary-500/20', textClass: 'text-primary-400' },
  storage: { label: 'Armazenamento e Memória', icon: HardDrive, bgClass: 'bg-accent-500/20', textClass: 'text-accent-400' },
  consumables: { label: 'Consumíveis de Impressão', icon: Printer, bgClass: 'bg-brand-500/20', textClass: 'text-brand-400' },
};

const emptyForm = {
  name: '',
  category: 'peripherals',
  subcategory: '',
  quantity: 0,
  minQuantity: 5,
  location: '',
};

export function StockDashboard({ movements, setMovements }) {
  const { canWrite } = useAuth();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('inventory');
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustItem, setAdjustItem] = useState(null);
  const [adjustData, setAdjustData] = useState({ type: 'IN', quantity: 1, destination: '', notes: '' });
  const [adjustError, setAdjustError] = useState('');

  // Sistema de Notificações
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => { setToast(null); }, 4000);
  };

  useEffect(() => {
    carregarEstoque();
  }, []);

  const carregarEstoque = async () => {
    try {
      setIsLoading(true);
      const data = await listarEstoqueItens();
      setItems(data);
    } catch (error) {
      console.error(error);
      showToast('Erro ao carregar os itens do estoque.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

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
        name: item.name || '',
        category: item.category || 'peripherals',
        subcategory: item.subcategory || '',
        quantity: item.quantity || 0,
        minQuantity: item.minQuantity || 0,
        location: item.location || '',
      });
    } else {
      setEditingItem(null);
      setFormData(emptyForm);
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.location.trim()) {
      showToast('Preencha os campos obrigatórios.', 'error');
      return;
    }

    try {
      if (editingItem) {
        await atualizarEstoqueItem(editingItem.id, formData);
        showToast('Item atualizado com sucesso!');
      } else {
        await salvarEstoqueItem(formData);
        showToast('Novo item adicionado ao estoque!');
      }
      
      await carregarEstoque();
      setShowModal(false);
      setEditingItem(null);
      setFormData(emptyForm);
    } catch (error) {
      showToast('Erro ao salvar item.', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Tem certeza que deseja excluir este item?')) {
      try {
        await deletarEstoqueItem(id);
        showToast('Item excluído com sucesso.');
        await carregarEstoque();
      } catch (error) {
        showToast('Erro ao excluir item.', 'error');
      }
    }
  };

  const adjustQuantity = async (item, delta) => {
    const newQuantity = Math.max(0, item.quantity + delta);
    
    // Otimista (atualiza na tela na hora)
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, quantity: newQuantity } : i)));

    try {
      await atualizarEstoqueItem(item.id, { ...item, quantity: newQuantity });
    } catch (error) {
      showToast('Erro ao atualizar quantidade no banco.', 'error');
      carregarEstoque(); // Reverte caso dê erro
    }
  };

  const openAdjustModal = (item) => {
    setAdjustItem(item);
    setAdjustData({ type: 'IN', quantity: 1, destination: '', notes: '' });
    setAdjustError('');
    setShowAdjustModal(true);
  };

  const handleAdjustSave = async () => {
    if (!adjustItem) return;
    const qty = Math.floor(Number(adjustData.quantity));
    if (!qty || qty <= 0) {
      setAdjustError('Informe uma quantidade válida maior que zero.');
      return;
    }
    if (adjustData.type === 'OUT' && qty > adjustItem.quantity) {
      setAdjustError(`Estoque insuficiente. Disponível: ${adjustItem.quantity}.`);
      return;
    }
    if (adjustData.type === 'OUT' && !adjustData.destination.trim()) {
      setAdjustError('Informe o destino da saída.');
      return;
    }

    const newQuantity = adjustData.type === 'IN' ? adjustItem.quantity + qty : adjustItem.quantity - qty;

    try {
      // 1. Atualiza a quantidade no banco
      await atualizarEstoqueItem(adjustItem.id, { ...adjustItem, quantity: newQuantity });

      // 2. Dispara o POST salvando o histórico real de movimentação
      const movement = {
        itemId: adjustItem.id.toString(),
        itemName: adjustItem.name,
        type: adjustData.type,
        quantity: qty,
        destination: adjustData.destination.trim() || (adjustData.type === 'IN' ? 'Entrada manual (Ajuste)' : 'Saída manual (Ajuste)'),
        date: new Date().toISOString().substring(0, 19),
        notes: adjustData.notes.trim() || null,
      };
      
      await salvarMovimento(movement);

      showToast('Ajuste de estoque realizado e registrado com sucesso!');
      await carregarEstoque();
      setShowAdjustModal(false);
    } catch (error) {
      setAdjustError('Erro de comunicação com o servidor ao salvar o ajuste.');
    }
  };

  return (
    <div className="space-y-6 relative">
      
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
          <h1 className="text-2xl font-bold text-white">Estoque e Insumos</h1>
          <p className="text-dark-400 mt-1">
            {isLoading ? 'Carregando...' : `${items.length} itens cadastrados`}
            {criticalCount > 0 && (
              <span className="text-red-400 ml-2">
                ({criticalCount} com estoque baixo)
              </span>
            )}
          </p>
        </div>
        {activeTab === 'inventory' && canWrite && (
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
          Inventário
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
          Entregas e Movimentações
        </button>
      </div>

      {activeTab === 'dispatch' ? (
        <StockDispatch
          items={items}
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
                        <p className="text-xs text-red-400">{critical} críticos</p>
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
                    <th className="table-header text-center">Mínimo</th>
                    <th className="table-header">Localização</th>
                    <th className="table-header text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-dark-400">
                        Conectando ao banco de dados...
                      </td>
                    </tr>
                  ) : filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-dark-400">
                        Nenhum item encontrado
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => {
                      const isCritical = item.quantity <= item.minQuantity;
                      const info = categoryInfo[item.category] || categoryInfo.peripherals;
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
                              {canWrite && (
                                <button
                                  onClick={() => adjustQuantity(item, -1)}
                                  className="w-7 h-7 rounded bg-dark-600 hover:bg-dark-500 flex items-center justify-center transition-colors"
                                >
                                  <Minus className="w-4 h-4 text-dark-300" />
                                </button>
                              )}
                              <span
                                className={`font-bold text-lg min-w-[40px] text-center ${
                                  isCritical ? 'text-red-400' : 'text-white'
                                }`}
                              >
                                {item.quantity}
                              </span>
                              {canWrite && (
                                <button
                                  onClick={() => adjustQuantity(item, 1)}
                                  className="w-7 h-7 rounded bg-dark-600 hover:bg-dark-500 flex items-center justify-center transition-colors"
                                >
                                  <Plus className="w-4 h-4 text-dark-300" />
                                </button>
                              )}
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
                                  Crítico
                                </span>
                              )}
                              {canWrite && (
                                <>
                                  <button
                                    onClick={() => openAdjustModal(item)}
                                    className="btn-secondary px-3 py-1.5"
                                    title="Movimentar / Ajuste rápido"
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
                                </>
                              )}
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
            <label className="block text-sm font-medium text-dark-300 mb-2">Quantidade Mínima (Crítico)</label>
            <input
              type="number"
              min="0"
              value={formData.minQuantity}
              onChange={(e) => setFormData({ ...formData, minQuantity: parseInt(e.target.value) || 0 })}
              className="input-field"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-dark-300 mb-2">Localização Física *</label>
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
            {editingItem ? 'Salvar Alterações' : 'Adicionar Item'}
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={showAdjustModal}
        onClose={() => setShowAdjustModal(false)}
        title="Ajuste Rápido de Estoque"
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
              <label className="block text-sm font-medium text-dark-300 mb-2">Operação *</label>
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
                  Saída
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
                placeholder={adjustData.type === 'IN' ? 'Ex: Compra, Doação' : 'Ex: Filial Centro, Setor Financeiro'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Observações (opcional)</label>
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