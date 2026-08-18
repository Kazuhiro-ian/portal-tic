import { useState, useEffect } from 'react';
import {
  Plus, Edit, Trash2, Minus, AlertTriangle, Cpu, HardDrive, Printer, ArrowLeftRight,
  Package, Laptop, Smartphone, KeyRound
} from 'lucide-react';
import { SidePanel } from './SidePanel.jsx';
import { FiltroBar } from './FiltroBar.jsx';
import { DataTable } from './DataTable.jsx';
import { StockDispatch } from './StockDispatch.jsx';
import { listarEstoqueItens, salvarEstoqueItem, atualizarEstoqueItem, deletarEstoqueItem, salvarMovimento } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../hooks/useToast.js';
import { useConfirm } from '../hooks/useConfirm.jsx';
import { Toast } from './Toast.jsx';
import { Paginacao } from './Paginacao.jsx';
import { usePaginacao } from '../hooks/usePaginacao.js';

const categoryInfo = {
  peripherals: { label: 'Periféricos e Cabos', icon: Cpu, bgClass: 'bg-primary-500/20', textClass: 'text-primary-400' },
  storage: { label: 'Armazenamento e Memória', icon: HardDrive, bgClass: 'bg-accent-500/20', textClass: 'text-accent-400' },
  consumables: { label: 'Consumíveis de Impressão', icon: Printer, bgClass: 'bg-brand-500/20', textClass: 'text-brand-400' },
  notebooks: { label: 'Notebooks', icon: Laptop, bgClass: 'bg-blue-500/20', textClass: 'text-blue-400' },
  celulares: { label: 'Celulares Corporativos', icon: Smartphone, bgClass: 'bg-emerald-500/20', textClass: 'text-emerald-400' },
  licencas: { label: 'Licenças de Software', icon: KeyRound, bgClass: 'bg-amber-500/20', textClass: 'text-amber-400' },
};

const emptyForm = {
  name: '',
  category: 'peripherals',
  subcategory: '',
  quantity: 0,
  minQuantity: 5,
  location: '',
  serialNumber: '',
  responsavel: '',
};

function colunasEstoque({ canWrite, adjustQuantity, ajustandoId }) {
  return [
    {
      chave: 'name',
      header: 'Item',
      mobile: 'titulo',
      tdClassName: 'font-medium text-white',
      render: (item) => (
        <>
          {item.name}
          {item.subcategory && (
            <span className="block text-xs text-dark-400 font-normal mt-0.5">{item.subcategory}</span>
          )}
        </>
      ),
    },
    {
      chave: 'category',
      header: 'Categoria',
      mobile: 'badge',
      render: (item) => (
        <span className="badge badge-info">{(categoryInfo[item.category] || categoryInfo.peripherals).label}</span>
      ),
    },
    {
      chave: 'quantity',
      header: 'Quantidade',
      render: (item) => {
        const isCritical = item.quantity <= item.minQuantity;
        const ajustando = ajustandoId === item.id;
        return (
          <div className="flex items-center justify-center gap-2">
            {canWrite && (
              <button
                onClick={() => adjustQuantity(item, -1)}
                disabled={ajustando}
                title="Diminuir 1 unidade" aria-label="Diminuir 1 unidade"
                className="w-9 h-9 md:w-7 md:h-7 rounded bg-dark-600 hover:bg-dark-500 flex items-center justify-center transition-colors disabled:opacity-50 disabled:pointer-events-none"
              >
                <Minus className="w-4 h-4 text-dark-300" />
              </button>
            )}
            <span
              className={`font-bold text-lg min-w-[40px] text-center ${isCritical ? 'text-red-400' : 'text-white'}`}
            >
              {item.quantity}
            </span>
            {canWrite && (
              <button
                onClick={() => adjustQuantity(item, 1)}
                disabled={ajustando}
                title="Aumentar 1 unidade" aria-label="Aumentar 1 unidade"
                className="w-9 h-9 md:w-7 md:h-7 rounded bg-dark-600 hover:bg-dark-500 flex items-center justify-center transition-colors disabled:opacity-50 disabled:pointer-events-none"
              >
                <Plus className="w-4 h-4 text-dark-300" />
              </button>
            )}
          </div>
        );
      },
    },
    {
      chave: 'minQuantity',
      header: 'Mínimo',
      render: (item) => {
        const isCritical = item.quantity <= item.minQuantity;
        return <span className={`font-medium ${isCritical ? 'text-red-400' : 'text-dark-300'}`}>{item.minQuantity}</span>;
      },
    },
    {
      chave: 'location',
      header: 'Localização',
      tdClassName: 'text-dark-300',
      render: (item) => item.location,
    },
  ];
}

export function StockDashboard() {
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

  // Trava os steppers +/- da linha que está em ajuste, pra um clique duplo (ou dois cliques
  // rápidos em +/-) não disparar duas movimentações antes da primeira resposta voltar.
  const [ajustandoId, setAjustandoId] = useState(null);

  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustItem, setAdjustItem] = useState(null);
  const [adjustData, setAdjustData] = useState({ type: 'IN', quantity: 1, destination: '', notes: '' });
  const [adjustError, setAdjustError] = useState('');

  const { toast, showToast, hideToast } = useToast();
  const { confirmar, dialogoConfirmacao } = useConfirm();  

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

  const paginacao = usePaginacao(filteredItems);

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
        serialNumber: item.serialNumber || '',
        responsavel: item.responsavel || '',
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
    const confirmado = await confirmar({
      titulo: 'Excluir item do estoque',
      mensagem: 'Tem certeza que deseja excluir este item? O histórico de movimentações dele deixará de ser exibido.',
    });
    if (!confirmado) return;

    try {
      await deletarEstoqueItem(id);
      showToast('Item excluído com sucesso.');
      await carregarEstoque();
    } catch (error) {
      showToast('Erro ao excluir item.', 'error');
    }
  };

  // Os steppers +/- passam pelo mesmo fluxo do "Ajuste Rápido" (salvarMovimento) em vez de
  // atualizar a quantidade direto -- assim toda mudança de estoque gera um registro de
  // movimentação, sem um segundo caminho "silencioso" de alterar a quantidade sem rastro.
  const adjustQuantity = async (item, delta) => {
    if (ajustandoId) return;
    try {
      setAjustandoId(item.id);
      await salvarMovimento({
        itemId: item.id.toString(),
        itemName: item.name,
        type: delta > 0 ? 'IN' : 'OUT',
        quantity: 1,
        destination: delta > 0 ? 'Ajuste rápido (+)' : 'Ajuste rápido (-)',
        date: new Date().toISOString().substring(0, 19),
      });
      await carregarEstoque();
    } catch (error) {
      showToast(error.message || 'Erro ao ajustar quantidade.', 'error');
    } finally {
      setAjustandoId(null);
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

    try {
      // Uma única chamada: o backend decrementa/incrementa o item E grava o movimento
      // na mesma transação -- não precisamos mais chamar atualizarEstoqueItem à parte.
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
      setAdjustError(error.message || 'Erro de comunicação com o servidor ao salvar o ajuste.');
    }
  };

  return (
    <div className="space-y-6 relative">
      
      {dialogoConfirmacao}

      <Toast toast={toast} onClose={hideToast} />

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
        <StockDispatch items={items} onAtualizado={carregarEstoque} />
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
            <FiltroBar
              busca={search}
              onBuscaChange={setSearch}
              placeholderBusca="Buscar item..."
              filtros={[
                {
                  chave: 'critico',
                  label: 'Apenas estoque baixo',
                  tipo: 'toggle',
                  valor: showCriticalOnly,
                  onChange: setShowCriticalOnly,
                },
              ]}
            />

            <DataTable
              colunas={colunasEstoque({ canWrite, adjustQuantity, ajustandoId })}
              dados={paginacao.itensPagina}
              carregando={isLoading}
              vazio="Nenhum item encontrado"
              acoes={(item) => {
                const isCritical = item.quantity <= item.minQuantity;
                return (
                  <>
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
                          title="Movimentar / Ajuste rápido" aria-label="Movimentar / Ajuste rápido"
                        >
                          <ArrowLeftRight className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleOpenModal(item)} className="btn-secondary px-3 py-1.5">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="btn-danger px-3 py-1.5">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </>
                );
              }}
            />

            <Paginacao {...paginacao} rotulo="itens" />
          </div>
        </>
      )}

      <SidePanel
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingItem ? 'Editar Item' : 'Novo Item'}
        size="lg"
        footer={
          <>
            <button onClick={() => setShowModal(false)} className="btn-secondary">
              Cancelar
            </button>
            <button onClick={handleSave} className="btn-primary">
              {editingItem ? 'Salvar Alterações' : 'Adicionar Item'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label htmlFor="estoque-nome" className="block text-sm font-medium text-dark-300 mb-2">Nome do Item *</label>
            <input
              id="estoque-nome"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-field"
              placeholder="Ex: Cabo de Rede Cat6 5m"
            />
          </div>
          <div>
            <label htmlFor="estoque-categoria" className="block text-sm font-medium text-dark-300 mb-2">Categoria</label>
            <select
              id="estoque-categoria"
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
            <label htmlFor="estoque-subcategoria" className="block text-sm font-medium text-dark-300 mb-2">Subcategoria</label>
            <input
              id="estoque-subcategoria"
              type="text"
              value={formData.subcategory}
              onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
              className="input-field"
              placeholder="Ex: Cabos de Rede"
            />
          </div>
          <div>
            <label htmlFor="estoque-quantidade" className="block text-sm font-medium text-dark-300 mb-2">Quantidade Atual</label>
            <input
              id="estoque-quantidade"
              type="number"
              min="0"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
              className="input-field"
            />
          </div>
          <div>
            <label htmlFor="estoque-quantidade-minima" className="block text-sm font-medium text-dark-300 mb-2">Quantidade Mínima (Crítico)</label>
            <input
              id="estoque-quantidade-minima"
              type="number"
              min="0"
              value={formData.minQuantity}
              onChange={(e) => setFormData({ ...formData, minQuantity: parseInt(e.target.value) || 0 })}
              className="input-field"
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="estoque-localizacao" className="block text-sm font-medium text-dark-300 mb-2">Localização Física *</label>
            <input
              id="estoque-localizacao"
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="input-field"
              placeholder="Ex: Prateleira A1"
            />
          </div>
          <div>
            <label htmlFor="estoque-numero-serie" className="block text-sm font-medium text-dark-300 mb-2">Número de Série (opcional)</label>
            <input
              id="estoque-numero-serie"
              type="text"
              value={formData.serialNumber}
              onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
              className="input-field"
              placeholder="Ex: SN-A1B2C3D4"
            />
          </div>
          <div>
            <label htmlFor="estoque-responsavel" className="block text-sm font-medium text-dark-300 mb-2">Responsável (opcional)</label>
            <input
              id="estoque-responsavel"
              type="text"
              value={formData.responsavel}
              onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
              className="input-field"
              placeholder="Ex: João Silva"
            />
          </div>
        </div>
      </SidePanel>

      <SidePanel
        isOpen={showAdjustModal}
        onClose={() => setShowAdjustModal(false)}
        title="Ajuste Rápido de Estoque"
        size="md"
        footer={
          adjustItem && (
            <>
              <button onClick={() => setShowAdjustModal(false)} className="btn-secondary">
                Cancelar
              </button>
              <button onClick={handleAdjustSave} className="btn-primary">
                Confirmar Ajuste
              </button>
            </>
          )
        }
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
              <label htmlFor="ajuste-quantidade" className="block text-sm font-medium text-dark-300 mb-2">Quantidade *</label>
              <input
                id="ajuste-quantidade"
                type="number"
                min="1"
                value={adjustData.quantity}
                onChange={(e) => setAdjustData({ ...adjustData, quantity: parseInt(e.target.value) || 0 })}
                className="input-field"
                placeholder="Ex: 70"
              />
            </div>

            <div>
              <label htmlFor="ajuste-destino" className="block text-sm font-medium text-dark-300 mb-2">
                Destino {adjustData.type === 'OUT' ? '*' : '(opcional)'}
              </label>
              <input
                id="ajuste-destino"
                type="text"
                value={adjustData.destination}
                onChange={(e) => setAdjustData({ ...adjustData, destination: e.target.value })}
                className="input-field"
                placeholder={adjustData.type === 'IN' ? 'Ex: Compra, Doação' : 'Ex: Filial Centro, Setor Financeiro'}
              />
            </div>

            <div>
              <label htmlFor="ajuste-observacoes" className="block text-sm font-medium text-dark-300 mb-2">Observações (opcional)</label>
              <textarea
                id="ajuste-observacoes"
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
          </div>
        )}
      </SidePanel>
    </div>
  );
}