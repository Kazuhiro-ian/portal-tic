import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, Minus, Building2, Store, Layers, ArrowDown, ArrowUp } from 'lucide-react';
import {
  buscarRelatorioAcuracidade, buscarRankingAcuracidade, buscarConfiguracaoQualidade,
} from '../services/api.js';

const percentual = (valor) =>
  valor == null ? '—' : `${(Number(valor) * 100).toFixed(2).replace('.', ',')}%`;

const moeda = (valor) =>
  valor == null
    ? '—'
    : Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const rotuloTipo = (tipo) => (tipo === 'CD' ? 'CD' : tipo === 'LOJA' ? 'Loja' : '—');

/** Seta de variação vs. mês anterior. `invertido` = pra esse indicador, subir é ruim (ex: % de ajuste). */
function Variacao({ atual, anterior, invertido = false }) {
  if (atual == null || anterior == null) {
    return <span className="text-xs text-dark-400">sem comparação</span>;
  }
  const delta = Number(atual) - Number(anterior);
  if (Math.abs(delta) < 0.0001) {
    return (
      <span className="text-xs text-dark-400 inline-flex items-center gap-1">
        <Minus className="w-3 h-3" /> estável
      </span>
    );
  }
  const subiu = delta > 0;
  const bom = invertido ? !subiu : subiu;
  return (
    <span className={`text-xs inline-flex items-center gap-1 ${bom ? 'text-green-400' : 'text-red-400'}`}>
      {subiu ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {percentual(Math.abs(delta))} vs. mês anterior
    </span>
  );
}

function CardAgregado({ titulo, icon: Icon, linha, config }) {
  const atual = linha?.atual;
  const anterior = linha?.anterior;
  const metaAcuracidade = config?.metaAcuracidade;
  const metaInacuracia = config?.metaInacuracia;

  const atingiuAcuracidade = atual && metaAcuracidade != null
    ? Number(atual.percentualAcuracidade) >= Number(metaAcuracidade)
    : null;
  const atingiuInacuracia = atual && metaInacuracia != null
    ? Number(atual.percentualInacuracia) <= Number(metaInacuracia)
    : null;

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-primary-400" />
        <h3 className="font-semibold text-white">{titulo}</h3>
      </div>

      {!atual ? (
        <p className="text-dark-400 text-sm text-center py-6">Sem dados no período.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-dark-400 uppercase tracking-wider mb-1">Acuracidade</p>
            <p className={`text-2xl font-bold ${atingiuAcuracidade == null ? 'text-white' : atingiuAcuracidade ? 'text-green-400' : 'text-red-400'}`}>
              {percentual(atual.percentualAcuracidade)}
            </p>
            {metaAcuracidade != null && (
              <p className="text-xs text-dark-400 mt-1">Meta: mín. {percentual(metaAcuracidade)}</p>
            )}
            <div className="mt-1">
              <Variacao atual={atual.percentualAcuracidade} anterior={anterior?.percentualAcuracidade} />
            </div>
          </div>

          <div>
            <p className="text-xs text-dark-400 uppercase tracking-wider mb-1">Ajuste (R$)</p>
            <p className={`text-2xl font-bold ${atingiuInacuracia == null ? 'text-white' : atingiuInacuracia ? 'text-green-400' : 'text-red-400'}`}>
              {percentual(atual.percentualInacuracia)}
            </p>
            {metaInacuracia != null && (
              <p className="text-xs text-dark-400 mt-1">Meta: máx. {percentual(metaInacuracia)}</p>
            )}
            <div className="mt-1">
              <Variacao atual={atual.percentualInacuracia} anterior={anterior?.percentualInacuracia} invertido />
            </div>
          </div>
        </div>
      )}

      {atual && (
        <p className="text-xs text-dark-400 mt-4 pt-3 border-t border-dark-700">
          {atual.totalProdutos} produtos · {moeda(atual.estoqueInicialValor)} em estoque inicial
        </p>
      )}
    </div>
  );
}

function ListaRanking({ titulo, icon: Icon, cor, itens }) {
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
              <span className={`text-sm font-semibold shrink-0 ${cor}`}>{moeda(item.valorDivergencia)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AccuracyReport({ ano, mes, showToast }) {
  const [relatorio, setRelatorio] = useState(null);
  const [ranking, setRanking] = useState(null);
  const [config, setConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const carregar = useCallback(async () => {
    try {
      setIsLoading(true);
      const [dadosRelatorio, dadosRanking, dadosConfig] = await Promise.all([
        buscarRelatorioAcuracidade(ano, mes),
        buscarRankingAcuracidade(ano, mes, { limite: 10 }),
        buscarConfiguracaoQualidade(),
      ]);
      setRelatorio(dadosRelatorio);
      setRanking(dadosRanking);
      setConfig(dadosConfig);
    } catch (erro) {
      showToast(erro.message || 'Erro ao carregar o relatório de acuracidade.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [ano, mes, showToast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (isLoading) {
    return <p className="text-dark-400 text-center py-16">Carregando...</p>;
  }
  if (!relatorio) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CardAgregado titulo="Centros de Distribuição" icon={Building2} linha={relatorio.cds} config={config} />
        <CardAgregado titulo="Lojas" icon={Store} linha={relatorio.lojas} config={config} />
        <CardAgregado titulo="Geral" icon={Layers} linha={relatorio.geral} config={config} />
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">Acuracidade por Filial</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th scope="col" className="table-header">Filial</th>
                <th scope="col" className="table-header">Tipo</th>
                <th scope="col" className="table-header">Acuracidade</th>
                <th scope="col" className="table-header">Variação</th>
                <th scope="col" className="table-header">Ajuste (R$)</th>
                <th scope="col" className="table-header">Produtos</th>
              </tr>
            </thead>
            <tbody>
              {relatorio.filiais.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-dark-400">Nenhuma filial cadastrada.</td>
                </tr>
              ) : (
                relatorio.filiais.map((linha) => (
                  <tr key={linha.filialId} className="hover:bg-dark-700/30 transition-colors">
                    <td className="table-cell font-medium text-white">
                      {linha.numeroFilial} - {linha.nome}
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${linha.tipoFilial === 'CD' ? 'badge-info' : linha.tipoFilial === 'LOJA' ? 'badge-success' : ''}`}>
                        {rotuloTipo(linha.tipoFilial)}
                      </span>
                    </td>
                    <td className="table-cell text-dark-100">
                      {linha.atual ? percentual(linha.atual.percentualAcuracidade) : '—'}
                    </td>
                    <td className="table-cell">
                      {linha.atual
                        ? <Variacao atual={linha.atual.percentualAcuracidade} anterior={linha.anterior?.percentualAcuracidade} />
                        : <span className="text-dark-400 text-sm">—</span>}
                    </td>
                    <td className="table-cell text-dark-100">
                      {linha.atual ? percentual(linha.atual.percentualInacuracia) : '—'}
                    </td>
                    <td className="table-cell text-dark-300">
                      {linha.atual ? linha.atual.totalProdutos : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ListaRanking titulo="Maiores Faltas" icon={ArrowDown} cor="text-red-400" itens={ranking?.maioresFaltas} />
        <ListaRanking titulo="Maiores Sobras" icon={ArrowUp} cor="text-green-400" itens={ranking?.maioresSobras} />
      </div>
    </div>
  );
}
