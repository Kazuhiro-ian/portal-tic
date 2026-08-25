import { useState, useRef, useEffect, useId } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

/**
 * Combobox pesquisável genérico: cada item é { value, label, sublabel? }. Extraído de
 * StockDispatch.jsx (onde nasceu só para o despacho de estoque) para reaproveitar em outras
 * telas com o mesmo padrão de "escolher 1 de uma lista grande que um <select> nativo deixa
 * lenta de navegar" -- ex.: seleção de filial no despacho Zebra.
 */
export function SearchableSelect({
  items,
  value,
  onChange,
  labelId,
  placeholder = 'Selecione...',
  searchPlaceholder = 'Pesquisar...',
  vazio = 'Nenhum item encontrado',
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [indiceAtivo, setIndiceAtivo] = useState(-1);
  const ref = useRef(null);
  const listboxId = useId();
  const selected = items.find((i) => i.value === value) || null;

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
    i.label.toLowerCase().includes(query.toLowerCase()) ||
    (i.sublabel || '').toLowerCase().includes(query.toLowerCase())
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
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        aria-labelledby={labelId}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="input-field w-full flex items-center justify-between text-left disabled:opacity-50"
      >
        <span className={selected ? 'text-white truncate' : 'text-dark-400'}>
          {selected ? selected.label : placeholder}
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
              placeholder={searchPlaceholder}
              className="w-full bg-dark-700 text-white text-sm rounded-md pl-8 pr-3 py-2 outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div id={listboxId} role="listbox" className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-4 py-6 text-sm text-dark-400 text-center">{vazio}</p>
            ) : (
              filtered.map((item, index) => (
                <button
                  key={item.value}
                  id={`${listboxId}-opt-${index}`}
                  role="option"
                  aria-selected={item.value === value}
                  type="button"
                  onClick={() => escolher(item)}
                  onMouseEnter={() => setIndiceAtivo(index)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-dark-700 ${
                    index === indiceAtivo ? 'bg-dark-700' : ''
                  } ${item.value === value ? 'bg-primary-500/10' : ''}`}
                >
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{item.label}</p>
                    {item.sublabel && <p className="text-xs text-dark-400">{item.sublabel}</p>}
                  </div>
                  {item.value === value && <Check className="w-4 h-4 text-primary-400 flex-shrink-0 ml-2" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
