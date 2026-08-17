import { moeda, unidade } from '../utils/formato.js';

export function ListaRanking({ titulo, icon: Icon, cor, itens }) {
  return (
    <div className="card">
      <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
        <Icon className={`w-4 h-4 ${cor}`} />
        {titulo}
      </h3>
      {!itens || itens.length === 0 ? (
        <p className="text-dark-400 text-sm text-center py-6">Nada nesse período.</p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
          {itens.map((item, idx) => (
            <div
              key={`${item.codProduto}-${idx}`}
              className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-dark-700/50 border border-dark-600"
            >
              <div className="min-w-0">
                <p className="text-sm text-white truncate">{item.descricao || item.codProduto}</p>
                <p className="text-xs text-dark-400">
                  {item.numeroFilial != null ? `${item.numeroFilial} - ${item.nomeFilial}` : '—'} · {item.codProduto}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className={`text-sm font-semibold ${cor}`}>{moeda(item.valorDivergencia)}</span>
                <p className="text-xs text-dark-400">{unidade(item.divergencia)} un.</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
