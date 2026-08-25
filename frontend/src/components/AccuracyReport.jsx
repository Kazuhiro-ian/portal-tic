import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, Minus, Building2, Store, Layers, ArrowDown, ArrowUp, AlertTriangle } from 'lucide-react';
import {
  buscarRelatorioAcuracidade, buscarRankingAcuracidade, buscarConfiguracaoQualidade,
} from '../services/api.js';
import { DataTable } from './DataTable.jsx';
import { ListaRanking } from './ListaRanking.jsx';
import { StoreAccuracyDetailPanel } from './StoreAccuracyDetailPanel.jsx';
import { Paginacao } from './Paginacao.jsx';
import { usePaginacao } from '../hooks/usePaginacao.js';
import { percentual, moeda } from '../utils/formato.js';

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

const COLUNAS = [
  {
    chave: 'filial',
    header: 'Filial',
    mobile: 'titulo',
    tdClassName: 'font-medium text-white',
    render: (linha) => `${linha.numeroFilial} - ${linha.nome}`,
  },
  {
    chave: 'tipo',
    header: 'Tipo',
    mobile: 'badge',
    render: (linha) => (
      <span className={`badge ${linha.tipoFilial === 'CD' ? 'badge-info' : linha.tipoFilial === 'LOJA' ? 'badge-success' : ''}`}>
        {rotuloTipo(linha.tipoFilial)}
      </span>
    ),
  },
  {
    chave: 'acuracidade',
    header: 'Acuracidade',
    tdClassName: 'text-dark-100',
    render: (linha) => (linha.atual ? percentual(linha.atual.percentualAcuracidade) : '—'),
  },
  {
    chave: 'variacao',
    header: 'Variação',
    render: (linha) =>
      linha.atual ? (
        <Variacao atual={linha.atual.percentualAcuracidade} anterior={linha.anterior?.percentualAcuracidade} />
      ) : (
        <span className="text-dark-400 text-sm">—</span>
      ),
  },
  {
    chave: 'ajuste',
    header: 'Ajuste (R$)',
    tdClassName: 'text-dark-100',
    render: (linha) => (linha.atual ? percentual(linha.atual.percentualInacuracia) : '—'),
  },
  {
    chave: 'produtos',
    header: 'Produtos',
    tdClassName: 'text-dark-300',
    render: (linha) => (linha.atual ? linha.atual.totalProdutos : '—'),
  },
  {
    chave: 'divergenciaCruzada',
    header: '',
    mobile: 'badge',
    render: (linha) =>
      linha.produtosComDivergenciaCruzada > 0 ? (
        <span
          className="badge badge-warning inline-flex items-center gap-1"
          title={`${linha.produtosComDivergenciaCruzada} produto(s) com possível transferência entre Loja e Estoque`}
        >
          <AlertTriangle className="w-3 h-3" />
          {linha.produtosComDivergenciaCruzada}
        </span>
      ) : null,
  },
];

export function AccuracyReport({ ano, mes, showToast, onAbrirDashboard }) {
  const [relatorio, setRelatorio] = useState(null);
  const [ranking, setRanking] = useState(null);
  const [config, setConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filialSelecionada, setFilialSelecionada] = useState(null);

  const paginacao = usePaginacao(relatorio?.filiais || []);

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
        <DataTable
          colunas={COLUNAS}
          dados={paginacao.itensPagina}
          chaveLinha={(linha) => linha.filialId}
          vazio="Nenhuma filial cadastrada."
          aoClicarLinha={(linha) => setFilialSelecionada(linha)}
        />
        <Paginacao {...paginacao} rotulo="filiais" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ListaRanking titulo="Maiores Faltas" icon={ArrowDown} cor="text-red-400" itens={ranking?.maioresFaltas} />
        <ListaRanking titulo="Maiores Sobras" icon={ArrowUp} cor="text-green-400" itens={ranking?.maioresSobras} />
      </div>

      {filialSelecionada && (
        <StoreAccuracyDetailPanel
          filialId={filialSelecionada.filialId}
          nomeFilial={`${filialSelecionada.numeroFilial} - ${filialSelecionada.nome}`}
          ano={ano}
          mes={mes}
          onClose={() => setFilialSelecionada(null)}
          showToast={showToast}
          onAbrirDashboard={onAbrirDashboard}
        />
      )}
    </div>
  );
}
