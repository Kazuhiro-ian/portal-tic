import { useState, useRef, useEffect, useId } from 'react';
import { Search, Send, ArrowDownCircle, ArrowUpCircle, ChevronDown, Check, Package, Loader2 } from 'lucide-react';
import { listarMovimentos, salvarMovimento } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../hooks/useToast.js';
import { DataTable } from './DataTable.jsx';
import { Toast } from './Toast.jsx';

function SearchableSelect({ items, value, onChange, labelId }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [indiceAtivo, setIndiceAtivo] = useState(-1);
  const ref = useRef(null);
  const listboxId = useId();
  const selected = items.find((i) => i.id === value) || null;

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = items.filter((i) =>
    i.name.toLowerCase().includes(query.toLowerCase()) ||
    (i.subcategory || '').toLowerCase().includes(query.toLowerCase())
  );

  // Sempre que a lista visível muda (abriu, ou a busca filtrou), a opção ativa por teclado
  // volta pra primeira -- um índice preso de uma busca anterior apontaria pro item errado.
  useEffect(() => {
    setIndiceAtivo(filtered.length > 0 ? 0 : -1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, open]);

  const escolher = (item) => {
    onChange(item);
    setOpen(false);
    setQuery('');
  };

  const aoTeclarNaBusca = (evento) => {
    if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      setIndiceAtivo((i) => Math.min(i + 1, filtered.length - 1));
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault();
      setIndiceAtivo((i) => Math.max(i - 1, 0));
    } else if (evento.key === 'Enter') {
      evento.preventDefault();
      if (filtered[indiceAtivo]) escolher(filtered[indiceAtivo]);
    } else if (evento.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-labelledby={labelId}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="input-field w-full flex items-center justify-between text-left"
      >
        <span className={selected ? 'text-white truncate' : 'text-dark-400'}>
          {selected ? selected.name : 'Selecione um item...'}
        </span>
        <ChevronDown className={`w-4 h-4 text-dark-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-dark-800 border border-dark-600 rounded-lg shadow-xl overflow-hidden">
          <div className="relative p-2 border-b border-dark-700">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
            <input
              autoFocus
              type="text"
              role="combobox"
              aria-expanded={open}
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-activedescendant={indiceAtivo >= 0 ? `${listboxId}-opt-${indiceAtivo}` : undefined}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={aoTeclarNaBusca}
              placeholder="Pesquisar item..."
              className="w-full bg-dark-700 text-white text-sm rounded-md pl-8 pr-3 py-2 outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div id={listboxId} role="listbox" className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-4 py-6 text-sm text-dark-400 text-center">Nenhum item encontrado</p>
            ) : (
              filtered.map((item, index) => (
                <button
                  key={item.id}
                  id={`${listboxId}-opt-${index}`}
                  role="option"
                  aria-selected={item.id === value}
                  type="button"
                  onClick={() => escolher(item)}
                  onMouseEnter={() => setIndiceAtivo(index)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-dark-700 ${
                    index === indiceAtivo ? 'bg-dark-700' : ''
                  } ${item.id === value ? 'bg-primary-500/10' : ''}`}
                >
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{item.name}</p>
                    <p className="text-xs text-dark-400">
                      {item.subcategory || 'Sem categoria'} · Estoque: {item.quantity}
                    </p>
                  </div>
                  {item.id === value && <Check className="w-4 h-4 text-primary-400 flex-shrink-0 ml-2" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function colunasHistorico(formatDate) {
  return [
    {
      chave: 'item',
      header: 'Item',
      mobile: 'titulo',
      tdClassName: 'font-medium text-white',
      render: (m) => m.itemName,
    },
    {
      chave: 'data',
      header: 'Data',
      mobile: 'subtitulo',
      tdClassName: 'text-dark-300 whitespace-nowrap text-sm',
      render: (m) => formatDate(m.date),
    },
    {
      chave: 'tipo',
      header: 'Tipo',
      mobile: 'badge',
      render: (m) =>
        m.type === 'IN' ? (
          <span className="badge badge-success">
            <ArrowDownCircle className="w-3 h-3 mr-1" />
            Entrada
          </span>
        ) : (
          <span className="badge badge-warning">
            <ArrowUpCircle className="w-3 h-3 mr-1" />
            Saída
          </span>
        ),
    },
    {
      chave: 'quantity',
      header: 'Qtd',
      tdClassName: 'text-center',
      render: (m) => <span className="font-bold text-white">{m.quantity}</span>,
    },
    {
      chave: 'destination',
      header: 'Destino',
      tdClassName: 'text-dark-300',
      render: (m) => m.destination,
    },
    {
      chave: 'notes',
      header: 'Obs',
      tdClassName: 'text-dark-400 text-sm max-w-[200px] truncate',
      render: (m) => m.notes || '-',
    },
  ];
}

export function StockDispatch({ items, onAtualizado }) {
  const { canWrite } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const itemLabelId = useId();
  const [movements, setMovements] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    itemId: '',
    quantity: 1,
    destination: '',
    notes: '',
  });
  // Só validação de campo (síncrona, antes de qualquer chamada) fica aqui, perto do
  // formulário -- o resultado da submissão em si (sucesso ou erro do backend) vira toast,
  // como o restante do app já faz para confirmação de ação assíncrona concluída.
  const [error, setError] = useState('');

  useEffect(() => {
    carregarMovimentos();
  }, []);

  const carregarMovimentos = async () => {
    try {
      setIsLoadingHistory(true);
      const data = await listarMovimentos();
      setMovements(data);
    } catch (err) {
      showToast('Erro ao carregar o histórico de movimentações.', 'error');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const selectedItem = items.find((i) => i.id === form.itemId) || null;

  const handleSubmit = async () => {
    setError('');

    if (!selectedItem) {
      setError('Selecione um item do estoque.');
      return;
    }
    const qty = Math.floor(Number(form.quantity));
    if (!qty || qty <= 0) {
      setError('Informe uma quantidade válida maior que zero.');
      return;
    }
    if (qty > selectedItem.quantity) {
      setError(`Estoque insuficiente. Disponível: ${selectedItem.quantity} un. de "${selectedItem.name}".`);
      return;
    }
    if (!form.destination.trim()) {
      setError('Informe o destino (pessoa, setor ou filial).');
      return;
    }

    try {
      setIsSubmitting(true);

      // Uma única chamada: o backend decrementa o item e grava o movimento na mesma
      // transação -- nada fica gravado pela metade se algo falhar no meio do caminho.
      const movement = {
        itemId: selectedItem.id.toString(),
        itemName: selectedItem.name,
        type: 'OUT',
        quantity: qty,
        destination: form.destination.trim(),
        // Sem "date": o backend preenche com o horário do servidor quando vier nulo
        // (EstoqueMovimentoService.registrar). Montar o timestamp aqui exigiria lidar com
        // fuso horário (toISOString() converteria para UTC e erraria o horário exibido).
        notes: form.notes.trim() || null,
      };

      await salvarMovimento(movement);

      showToast(`${qty} un. de "${selectedItem.name}" enviadas para ${form.destination.trim()}.`);
      setForm({ itemId: '', quantity: 1, destination: '', notes: '' });
      await carregarMovimentos();
      await onAtualizado?.();
    } catch (err) {
      showToast(err.message || 'Falha na comunicação com o servidor. A transação foi abortada.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <Toast toast={toast} onClose={hideToast} />
      {canWrite && (
      <div className="lg:col-span-2">
        <div className="card">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-warning-500/20 rounded-lg flex items-center justify-center">
              <Send className="w-5 h-5 text-warning-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Registrar Nova Entrega / Saída</h3>
              <p className="text-xs text-dark-400">Subtrai automaticamente do estoque</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label id={itemLabelId} className="block text-sm font-medium text-dark-300 mb-2">Item do Estoque *</label>
              <SearchableSelect
                items={items}
                value={form.itemId}
                onChange={(item) => setForm({ ...form, itemId: item.id })}
                labelId={itemLabelId}
              />
              {selectedItem && (
                <p className="text-xs text-dark-400 mt-1.5">
                  Estoque disponível: <span className="font-bold text-white">{selectedItem.quantity}</span> un.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="despacho-quantidade" className="block text-sm font-medium text-dark-300 mb-2">Quantidade a enviar *</label>
              <input
                id="despacho-quantidade"
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })}
                className="input-field"
                placeholder="Ex: 5"
              />
            </div>

            <div>
              <label htmlFor="despacho-destino" className="block text-sm font-medium text-dark-300 mb-2">Destino *</label>
              <input
                id="despacho-destino"
                type="text"
                value={form.destination}
                onChange={(e) => setForm({ ...form, destination: e.target.value })}
                className="input-field"
                placeholder="Nome da pessoa, setor ou filial"
              />
            </div>

            <div>
              <label htmlFor="despacho-observacoes" className="block text-sm font-medium text-dark-300 mb-2">Observações (opcional)</label>
              <textarea
                id="despacho-observacoes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="input-field resize-none"
                rows={2}
                placeholder="Ex: Entregue via malote, solicitado no ticket #1234"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button 
              onClick={handleSubmit} 
              disabled={isSubmitting}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {isSubmitting ? 'Processando transação...' : 'Registrar Entrega'}
            </button>
          </div>
        </div>
      </div>
      )}

      <div className={canWrite ? 'lg:col-span-3' : 'lg:col-span-5'}>
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Histórico de Movimentações</h3>
                <p className="text-xs text-dark-400">{movements.length} registros</p>
              </div>
            </div>
          </div>

          <DataTable
            colunas={colunasHistorico(formatDate)}
            dados={movements}
            carregando={isLoadingHistory}
            vazio="Nenhuma movimentação registrada ainda"
          />
        </div>
      </div>
    </div>
  );
}