import { moeda, percentual, inteiro, unidade } from '../utils/formato.js';

function Linha({ rotulo, valor, destaque }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-dark-700/50 last:border-b-0">
      <span className="text-xs text-dark-400 min-w-0">{rotulo}</span>
      <span className={`text-sm text-right shrink-0 whitespace-nowrap ${destaque || 'text-dark-100'}`}>{valor}</span>
    </div>
  );
}

/**
 * Card completo de um resultado de acuracidade (Geral, Loja ou Estoque): moeda, unidades e
 * contagens de produtos, tudo junto -- pra não repetir o problema de mostrar só um pedaço dos
 * dados. Reaproveitado no painel lateral e na página de dashboard da tela de Acuracidade.
 */
export function ResultadoArmazemCard({ titulo, icon: Icon, resultado, anterior, config }) {
  const atingiuAcuracidade = resultado && config?.metaAcuracidade != null
    ? Number(resultado.percentualAcuracidade) >= Number(config.metaAcuracidade)
    : null;
  const atingiuAjuste = resultado && config?.metaInacuracia != null
    ? Number(resultado.percentualInacuracia) <= Number(config.metaInacuracia)
    : null;

  return (
    <div className="card min-w-0">
      <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-primary-400" />}
        {titulo}
      </h3>

      {!resultado ? (
        <p className="text-dark-400 text-sm text-center py-8">Sem dados no período.</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <p className="text-xs text-dark-400 uppercase tracking-wider truncate">Acuracidade</p>
              <p className={`text-xl sm:text-2xl font-bold truncate ${atingiuAcuracidade == null ? 'text-white' : atingiuAcuracidade ? 'text-green-400' : 'text-red-400'}`}>
                {percentual(resultado.percentualAcuracidade)}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-dark-400 uppercase tracking-wider truncate">Ajuste (R$)</p>
              <p className={`text-xl sm:text-2xl font-bold truncate ${atingiuAjuste == null ? 'text-white' : atingiuAjuste ? 'text-green-400' : 'text-red-400'}`}>
                {percentual(resultado.percentualInacuracia)}
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-1">Valores</h4>
            <Linha rotulo="Estoque inicial" valor={moeda(resultado.estoqueInicialValor)} />
            <Linha rotulo="Estoque final" valor={moeda(resultado.estoqueFinalValor)} />
            <Linha rotulo="Falta" valor={moeda(resultado.perdaValor)} destaque="text-red-400" />
            <Linha rotulo="Sobra" valor={moeda(resultado.ganhoValor)} destaque="text-green-400" />
            <Linha rotulo="Total de ajuste" valor={moeda(resultado.totalAjusteValor)} />
          </div>

          <div>
            <h4 className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-1">Produtos</h4>
            <Linha rotulo="Total no relatório" valor={inteiro(resultado.totalProdutos)} />
            <Linha rotulo="Contados" valor={inteiro(resultado.produtosContados)} />
            <Linha rotulo="Zerados" valor={inteiro(resultado.produtosZerados)} />
            <Linha rotulo="Acurados" valor={inteiro(resultado.produtosAcurados)} destaque="text-green-400" />
            <Linha rotulo="Inacurados" valor={inteiro(resultado.produtosInacurados)} destaque="text-red-400" />
            <Linha rotulo="Com falta / com sobra"
              valor={`${inteiro(resultado.produtosComPerda)} / ${inteiro(resultado.produtosComGanho)}`} />
          </div>

          <div>
            <h4 className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-1">Unidades</h4>
            <Linha rotulo="Quantidade inicial" valor={unidade(resultado.quantidadeInicial)} />
            <Linha rotulo="Quantidade final" valor={unidade(resultado.quantidadeFinal)} />
            <Linha rotulo="Falta (un.)" valor={unidade(resultado.unidadesPerda)} destaque="text-red-400" />
            <Linha rotulo="Sobra (un.)" valor={unidade(resultado.unidadesGanho)} destaque="text-green-400" />
          </div>

          {anterior && (
            <p className="text-xs text-dark-400 pt-2 border-t border-dark-700/50">
              Mês anterior: {percentual(anterior.percentualAcuracidade)} de acuracidade.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
