import { useState, useRef, useEffect } from 'react';
import { Search, Send, ArrowDownCircle, ArrowUpCircle, ChevronDown, Check, Package } from 'lucide-react';

function SearchableSelect({ items, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);
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

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
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
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar item..."
              className="w-full bg-dark-700 text-white text-sm rounded-md pl-8 pr-3 py-2 outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-4 py-6 text-sm text-dark-400 text-center">Nenhum item encontrado</p>
            ) : (
              filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onChange(item);
                    setOpen(false);
                    setQuery('');
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-dark-700 ${
                    item.id === value ? 'bg-primary-500/10' : ''
                  }`}
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

export function StockDispatch({ items, setItems, movements, setMovements }) {
  const [form, setForm] = useState({
    itemId: '',
    quantity: 1,
    destination: '',
    notes: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const selectedItem = items.find((i) => i.id === form.itemId) || null;

  const handleSubmit = () => {
    setError('');
    setSuccess('');

    if (!selectedItem) {
      setError('Selecione um item do estoque.');
      return;
    }
    const qty = Math.floor(Number(form.quantity));
    if (!qty || qty <= 0) {
      setError('Informe uma quantidade valida maior que zero.');
      return;
    }
    if (qty > selectedItem.quantity) {
      setError(`Estoque insuficiente. Disponivel: ${selectedItem.quantity} un. de "${selectedItem.name}".`);
      return;
    }
    if (!form.destination.trim()) {
      setError('Informe o destino (pessoa, setor ou filial).');
      return;
    }

    const movement = {
      id: Date.now().toString(),
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      type: 'OUT',
      quantity: qty,
      destination: form.destination.trim(),
      date: new Date().toISOString(),
      notes: form.notes.trim() || undefined,
    };

    setMovements((prev) => [movement, ...prev]);
    setItems((prev) =>
      prev.map((i) => (i.id === selectedItem.id ? { ...i, quantity: i.quantity - qty } : i))
    );

    setSuccess(`${qty} un. de "${selectedItem.name}" enviadas para ${form.destination.trim()}.`);
    setForm({ itemId: '', quantity: 1, destination: '', notes: '' });
    setTimeout(() => setSuccess(''), 4000);
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
      <div className="lg:col-span-2">
        <div className="card">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-warning-500/20 rounded-lg flex items-center justify-center">
              <Send className="w-5 h-5 text-warning-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Registrar Nova Entrega / Saida</h3>
              <p className="text-xs text-dark-400">Subtrai automaticamente do estoque</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Item do Estoque *</label>
              <SearchableSelect
                items={items}
                value={form.itemId}
                onChange={(item) => setForm({ ...form, itemId: item.id })}
              />
              {selectedItem && (
                <p className="text-xs text-dark-400 mt-1.5">
                  Estoque disponivel: <span className="font-bold text-white">{selectedItem.quantity}</span> un.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Quantidade a enviar *</label>
              <input
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })}
                className="input-field"
                placeholder="Ex: 5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Destino *</label>
              <input
                type="text"
                value={form.destination}
                onChange={(e) => setForm({ ...form, destination: e.target.value })}
                className="input-field"
                placeholder="Nome da pessoa, setor ou filial"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Observacoes (opcional)</label>
              <textarea
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
            {success && (
              <p className="text-sm text-success-400 bg-success-500/10 border border-success-500/30 rounded-lg px-3 py-2">
                {success}
              </p>
            )}

            <button onClick={handleSubmit} className="btn-primary w-full">
              <Send className="w-4 h-4" />
              Registrar Entrega
            </button>
          </div>
        </div>
      </div>

      <div className="lg:col-span-3">
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Historico de Movimentacoes</h3>
                <p className="text-xs text-dark-400">{movements.length} registros</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">Data</th>
                  <th className="table-header">Tipo</th>
                  <th className="table-header">Item</th>
                  <th className="table-header text-center">Qtd</th>
                  <th className="table-header">Destino</th>
                  <th className="table-header">Obs</th>
                </tr>
              </thead>
              <tbody>
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-dark-400">
                      Nenhuma movimentacao registrada ainda
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => (
                    <tr key={m.id} className="hover:bg-dark-700/30 transition-colors">
                      <td className="table-cell text-dark-300 whitespace-nowrap text-sm">
                        {formatDate(m.date)}
                      </td>
                      <td className="table-cell">
                        {m.type === 'IN' ? (
                          <span className="badge badge-success">
                            <ArrowDownCircle className="w-3 h-3 mr-1" />
                            Entrada
                          </span>
                        ) : (
                          <span className="badge badge-warning">
                            <ArrowUpCircle className="w-3 h-3 mr-1" />
                            Saida
                          </span>
                        )}
                      </td>
                      <td className="table-cell">
                        <p className="font-medium text-white">{m.itemName}</p>
                      </td>
                      <td className="table-cell text-center">
                        <span className="font-bold text-white">{m.quantity}</span>
                      </td>
                      <td className="table-cell text-dark-300">{m.destination}</td>
                      <td className="table-cell text-dark-400 text-sm max-w-[200px] truncate">
                        {m.notes || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
