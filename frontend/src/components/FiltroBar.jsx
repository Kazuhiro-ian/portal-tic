import { useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { SidePanel } from './SidePanel.jsx';

// Substitui o padrão antigo (`flex flex-col sm:flex-row` empilhando busca + selects), que no
// mobile consumia metade da tela antes do primeiro dado aparecer. Agora só a busca fica
// sempre visível; os demais filtros ficam atrás do botão "Filtros" (com contador) e viram
// chips removíveis com um toque quando ativos. Ver PLANO-MOBILE.md §5.
//
// Cada filtro é `{ chave, label, tipo: 'select' | 'toggle', valor, onChange, valorPadrao?, opcoes? }`.
// `opcoes` (obrigatório para 'select') é `[{ value, label }]`. `valorPadrao` define o estado
// "sem filtro" — usado para decidir se o filtro conta como ativo e para o que o chip restaura.
function valorPadraoDe(filtro) {
  return filtro.valorPadrao ?? (filtro.tipo === 'toggle' ? false : 'all');
}

function estaAtivo(filtro) {
  return filtro.valor !== valorPadraoDe(filtro);
}

function rotuloChip(filtro) {
  if (filtro.tipo === 'toggle') return filtro.label;
  const opcao = filtro.opcoes?.find((o) => o.value === filtro.valor);
  return `${filtro.label}: ${opcao?.label ?? filtro.valor}`;
}

export function FiltroBar({ busca, onBuscaChange, placeholderBusca = 'Buscar...', filtros = [] }) {
  const [painelAberto, setPainelAberto] = useState(false);
  const ativos = filtros.filter(estaAtivo);

  const limparFiltro = (filtro) => filtro.onChange(valorPadraoDe(filtro));

  return (
    <div className="mb-6 space-y-3">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
          <input
            type="text"
            value={busca}
            onChange={(e) => onBuscaChange(e.target.value)}
            placeholder={placeholderBusca}
            aria-label={placeholderBusca}
            className="input-field pl-10"
          />
        </div>

        {filtros.length > 0 && (
          <button
            type="button"
            onClick={() => setPainelAberto(true)}
            className="btn-secondary shrink-0 relative"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden xs:inline">Filtros</span>
            {ativos.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary-500 text-white text-[10px] font-bold flex items-center justify-center">
                {ativos.length}
              </span>
            )}
          </button>
        )}
      </div>

      {ativos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {ativos.map((filtro) => (
            <button
              key={filtro.chave}
              type="button"
              onClick={() => limparFiltro(filtro)}
              className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full bg-primary-500/15 border border-primary-500/30 text-primary-300 text-xs font-medium"
            >
              {rotuloChip(filtro)}
              <X className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>
      )}

      {filtros.length > 0 && (
        <SidePanel isOpen={painelAberto} onClose={() => setPainelAberto(false)} title="Filtros" size="sm">
          <div className="space-y-5">
            {filtros.map((filtro) => (
              <div key={filtro.chave}>
                {filtro.tipo === 'toggle' ? (
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filtro.valor}
                      onChange={(e) => filtro.onChange(e.target.checked)}
                      className="w-5 h-5 rounded border-dark-600 bg-dark-700 text-primary-500 focus:ring-primary-500"
                    />
                    <span className="text-dark-300 text-sm">{filtro.label}</span>
                  </label>
                ) : (
                  <>
                    <label htmlFor={`filtro-${filtro.chave}`} className="block text-sm font-medium text-dark-300 mb-2">{filtro.label}</label>
                    <select
                      id={`filtro-${filtro.chave}`}
                      value={filtro.valor}
                      onChange={(e) => filtro.onChange(e.target.value)}
                      className="select-field"
                    >
                      {filtro.opcoes.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </>
                )}
              </div>
            ))}
          </div>
        </SidePanel>
      )}
    </div>
  );
}
