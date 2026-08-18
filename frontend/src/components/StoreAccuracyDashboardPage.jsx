import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, ArrowLeftRight, ArrowLeft,
  Layers, Store, Warehouse, BarChart3,
} from 'lucide-react';
import { ResultadoArmazemCard } from './ResultadoArmazemCard.jsx';
import { Toast } from './Toast.jsx';
import { useToast } from '../hooks/useToast.js';
import { buscarDetalheFilialAcuracidade, buscarConfiguracaoQualidade } from '../services/api.js';
import { moeda, percentual, inteiro, unidade } from '../utils/formato.js';
import { MESES } from '../utils/datas.js';

/** Comparação Loja x Estoque de um indicador, em barras horizontais finas. */
function BarraComparativa({ rotulo, valorLoja, valorEstoque, formatador }) {
  const max = Math.max(Number(valorLoja) || 0, Number(valorEstoque) || 0, 0.0001);
  const series = [
    { nome: 'Loja', valor: valorLoja, cor: 'bg-primary-400' },
    { nome: 'Estoque', valor: valorEstoque, cor: 'bg-amber-400' },
  ];
  return (
    <div className="space-y-2">
      <p className="text-xs text-dark-400 uppercase tracking-wider">{rotulo}</p>
      {series.map((s) => (
        <div key={s.nome} className="flex items-center gap-3">
          <span className="w-16 text-xs text-dark-300 shrink-0">{s.nome}</span>
          <div className="flex-1 h-2 rounded-full bg-dark-700 overflow-hidden">
            <div
              className={`h-full rounded-full ${s.cor}`}
              style={{ width: `${Math.max((Number(s.valor) || 0) / max * 100, 2)}%` }}
            />
          </div>
          <span className="w-16 text-xs text-dark-200 text-right shrink-0">{formatador(s.valor)}</span>
        </div>
      ))}
    </div>
  );
}

/** Rosca de distribuição de produtos (acurados / inacurados / zerados). */
function RoscaProdutos({ resultado }) {
  if (!resultado) {
    return <p className="text-dark-400 text-sm text-center py-8">Sem dados no período.</p>;
  }

  const acurados = resultado.produtosAcurados || 0;
  const inacurados = resultado.produtosInacurados || 0;
  const zerados = resultado.produtosZerados || 0;
  const total = acurados + inacurados + zerados;
  if (total === 0) {
    return <p className="text-dark-400 text-sm text-center py-8">Sem produtos no período.</p>;
  }

  const raio = 60;
  const circunferencia = 2 * Math.PI * raio;
  const segmentos = [
    { rotulo: 'Acurados', valor: acurados, corTexto: 'text-green-400' },
    { rotulo: 'Inacurados', valor: inacurados, corTexto: 'text-red-400' },
    { rotulo: 'Zerados', valor: zerados, corTexto: 'text-dark-400' },
  ];

  let acumulado = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <svg viewBox="0 0 160 160" className="w-40 h-40 shrink-0" role="img" aria-label="Distribuição de produtos por acuracidade">
        <circle cx="80" cy="80" r={raio} fill="none" stroke="currentColor" strokeWidth="20" className="text-dark-700" />
        {segmentos.filter((s) => s.valor > 0).map((s) => {
          const comprimentoTotal = (s.valor / total) * circunferencia;
          const comprimentoVisivel = Math.max(comprimentoTotal - 3, 0);
          const elemento = (
            <circle
              key={s.rotulo}
              cx="80" cy="80" r={raio} fill="none" stroke="currentColor" strokeWidth="20"
              className={s.corTexto}
              strokeDasharray={`${comprimentoVisivel} ${circunferencia}`}
              strokeDashoffset={-acumulado}
              transform="rotate(-90 80 80)"
            />
          );
          acumulado += comprimentoTotal;
          return elemento;
        })}
      </svg>
      <div className="space-y-2">
        {segmentos.map((s) => (
          <div key={s.rotulo} className="flex items-center gap-2 text-sm">
            <span className={`w-3 h-3 rounded-full shrink-0 bg-current ${s.corTexto}`} />
            <span className="text-dark-300 w-20">{s.rotulo}</span>
            <span className="text-dark-100 font-medium">{s.valor} ({percentual(total > 0 ? s.valor / total : 0)})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Ranking de maiores divergências como barras horizontais de magnitude. */
function RankingBarras({ titulo, itens, cor }) {
  const corBarra = cor === 'text-red-400' ? 'bg-red-400' : 'bg-green-400';
  return (
    <div className="card">
      <h3 className="font-semibold text-white mb-4">{titulo}</h3>
      {!itens || itens.length === 0 ? (
        <p className="text-dark-400 text-sm text-center py-8">Nada nesse período.</p>
      ) : (
        <div className="space-y-3">
          {(() => {
            const max = Math.max(...itens.map((i) => Math.abs(Number(i.valorDivergencia) || 0)), 0.0001);
            return itens.map((item, idx) => (
              <div key={`${item.codProduto}-${idx}`} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-dark-200 truncate">{item.descricao || item.codProduto}</span>
                  <span className={`shrink-0 font-medium ${cor}`}>{moeda(item.valorDivergencia)}</span>
                </div>
                <div className="h-2 rounded-full bg-dark-700 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${corBarra}`}
                    style={{ width: `${Math.max(Math.abs(Number(item.valorDivergencia) || 0) / max * 100, 2)}%` }}
                  />
                </div>
              </div>
            ));
          })()}
        </div>
      )}
    </div>
  );
}

export function StoreAccuracyDashboardPage() {
  const { filialId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast, showToast, hideToast } = useToast();

  const hoje = new Date();
  const ano = Number(searchParams.get('ano')) || hoje.getFullYear();
  const mes = Number(searchParams.get('mes')) || hoje.getMonth() + 1;

  const [detalhe, setDetalhe] = useState(null);
  const [config, setConfig] = useState(null);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    try {
      setCarregando(true);
      const [dadosDetalhe, dadosConfig] = await Promise.all([
        buscarDetalheFilialAcuracidade(filialId, ano, mes),
        buscarConfiguracaoQualidade(),
      ]);
      setDetalhe(dadosDetalhe);
      setConfig(dadosConfig);
    } catch (erro) {
      showToast(erro.message || 'Erro ao carregar o dashboard da filial.', 'error');
    } finally {
      setCarregando(false);
    }
  }, [filialId, ano, mes, showToast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const mudarMes = (delta) => {
    const d = new Date(ano, mes - 1 + delta, 1);
    setSearchParams({ ano: String(d.getFullYear()), mes: String(d.getMonth() + 1) });
  };

  if (carregando) {
    return <p className="text-dark-400 text-center py-16">Carregando...</p>;
  }
  if (!detalhe) return null;

  const geral = detalhe.geral?.atual;
  const armazem01 = detalhe.armazem01?.atual;
  const armazem03 = detalhe.armazem03?.atual;

  return (
    <div className="space-y-6">
      <Toast toast={toast} onClose={hideToast} />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <Link to="/qualidade" className="text-sm text-dark-400 hover:text-white inline-flex items-center gap-1 mb-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar para Qualidade
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary-400" />
            {detalhe.numeroFilial} — {detalhe.nome}
          </h1>
          <p className="text-dark-400 mt-1">Dashboard de acuracidade de estoque</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => mudarMes(-1)} className="btn-secondary px-3 py-2" title="Mês anterior" aria-label="Mês anterior">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="px-4 py-2 rounded-lg bg-dark-800 border border-dark-700 min-w-44 text-center">
            <span className="text-white font-semibold">{MESES[mes - 1]} {ano}</span>
          </div>
          <button onClick={() => mudarMes(1)} className="btn-secondary px-3 py-2" title="Próximo mês" aria-label="Próximo mês">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${detalhe.estoqueDividido ? 'lg:grid-cols-3' : ''} gap-4`}>
        <ResultadoArmazemCard titulo="Geral" icon={Layers} resultado={geral} anterior={detalhe.geral?.anterior} config={config} />
        {detalhe.estoqueDividido && (
          <>
            <ResultadoArmazemCard titulo="Loja" icon={Store} resultado={armazem01} anterior={detalhe.armazem01?.anterior} config={config} />
            <ResultadoArmazemCard titulo="Estoque" icon={Warehouse} resultado={armazem03} anterior={detalhe.armazem03?.anterior} config={config} />
          </>
        )}
      </div>

      <div className={`grid grid-cols-1 ${detalhe.estoqueDividido ? 'lg:grid-cols-2' : ''} gap-4`}>
        {detalhe.estoqueDividido && (
          <div className="card">
            <h3 className="font-semibold text-white mb-4">Loja x Estoque</h3>
            <div className="space-y-5">
              <BarraComparativa
                rotulo="Acuracidade"
                valorLoja={armazem01?.percentualAcuracidade}
                valorEstoque={armazem03?.percentualAcuracidade}
                formatador={percentual}
              />
              <BarraComparativa
                rotulo="Ajuste (R$)"
                valorLoja={armazem01?.percentualInacuracia}
                valorEstoque={armazem03?.percentualInacuracia}
                formatador={percentual}
              />
            </div>
          </div>
        )}

        <div className="card">
          <h3 className="font-semibold text-white mb-4">Distribuição de produtos (Geral)</h3>
          <RoscaProdutos resultado={geral} />
        </div>
      </div>

      {detalhe.estoqueDividido && detalhe.divergenciasCruzadas?.length > 0 && (
        <div className="card border-amber-500/30 bg-amber-500/5">
          <h3 className="font-semibold text-amber-200 mb-2 flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4" />
            Possíveis transferências entre estoques ({detalhe.divergenciasCruzadas.length}{' '}
            {detalhe.divergenciasCruzadas.length === 1 ? 'produto' : 'produtos'})
          </h3>
          <p className="text-xs text-amber-200/80 mb-4">
            Produtos com sobra num armazém e falta exatamente igual no outro — provável
            movimentação entre Loja e Estoque nunca lançada no sistema. A divergência líquida
            desses produtos é zero, então o &quot;Geral&quot; já conta todos eles como acurados;
            compare abaixo com o que o Geral seria se eles continuassem contando como
            inacurados, do jeito que já contam em Loja e Estoque isoladamente.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div className="p-4 rounded-xl bg-dark-800/60 border border-dark-600">
              <p className="text-xs text-dark-400 uppercase tracking-wider">
                Acuracidade Geral · considerando as transferências
              </p>
              <p className="text-2xl font-bold text-white mt-1">{percentual(geral?.percentualAcuracidade)}</p>
              <p className="text-xs text-dark-400 mt-1">{inteiro(geral?.produtosAcurados)} produtos acurados</p>
            </div>
            <div className="p-4 rounded-xl bg-dark-800/60 border border-dark-600">
              <p className="text-xs text-dark-400 uppercase tracking-wider">
                Acuracidade Geral · sem considerar as transferências
              </p>
              <p className="text-2xl font-bold text-amber-300 mt-1">
                {percentual(detalhe.percentualAcuracidadeGeralSemTransferencias)}
              </p>
              <p className="text-xs text-dark-400 mt-1">
                {inteiro(detalhe.produtosAcuradosGeralSemTransferencias)} produtos acurados
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {detalhe.divergenciasCruzadas.map((d) => (
              <div key={d.codProduto} className="p-3 rounded-lg bg-dark-800/60 border border-dark-600">
                <p className="text-sm text-white truncate">{d.descricao || d.codProduto}</p>
                <p className="text-xs text-dark-400 mb-1">{d.codProduto}</p>
                <p className="text-xs">
                  <span className="text-dark-300">Loja: </span>
                  <span className={Number(d.divergenciaLoja) > 0 ? 'text-green-400' : 'text-red-400'}>
                    {unidade(d.divergenciaLoja)}
                  </span>
                  <span className="text-dark-300"> · Estoque: </span>
                  <span className={Number(d.divergenciaEstoque) > 0 ? 'text-green-400' : 'text-red-400'}>
                    {unidade(d.divergenciaEstoque)}
                  </span>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RankingBarras titulo="Maiores Faltas" itens={detalhe.maioresFaltas} cor="text-red-400" />
        <RankingBarras titulo="Maiores Sobras" itens={detalhe.maioresSobras} cor="text-green-400" />
      </div>
    </div>
  );
}
