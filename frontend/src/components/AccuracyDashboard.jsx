import { useState } from 'react';
import {
  ChevronDown, ChevronUp, ArrowLeftRight, ArrowDown, ArrowUp,
  Layers, Store, Warehouse, PieChart, Scale,
} from 'lucide-react';
import { ResultadoArmazemCard } from './ResultadoArmazemCard.jsx';
import { DeltaBadge } from './DeltaBadge.jsx';
import { moeda, percentual, inteiro, unidade } from '../utils/formato.js';

/**
 * Duas séries (Loja/Estoque) são identidade, não status -- por isso ganham cores
 * categóricas (azul/violeta) em vez de verde/vermelho, que na mesma tela já
 * significam "acurado/inacurado" na rosca e nos KPIs. Reaproveitar verde aqui
 * criaria duas leituras diferentes pra mesma cor na mesma tela.
 */
const COR_LOJA = { bar: 'bg-blue-400', dot: 'bg-blue-400', texto: 'text-blue-300' };
const COR_ESTOQUE = { bar: 'bg-violet-400', dot: 'bg-violet-400', texto: 'text-violet-300' };

/** Quantos produtos com divergência cruzada mostrar antes do "ver todos". */
const PREVIA_DIVERGENCIAS = 6;

/** Grande número de destaque (KPI) com meta e variação vs mês anterior. */
function HeroKpi({ titulo, valor, atingiu, meta, delta, extra }) {
  const cor = atingiu == null ? 'text-white' : atingiu ? 'text-green-400' : 'text-red-400';
  return (
    <div className="min-w-0">
      <p className="text-xs uppercase tracking-wider text-dark-400">{titulo}</p>
      <p className={`text-4xl sm:text-5xl font-bold mt-1 tabular-nums ${cor}`}>{valor}</p>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        {delta}
        {meta && <span className="text-xs text-dark-500">{meta}</span>}
      </div>
      {extra}
    </div>
  );
}

/** Comparação Loja x Estoque de um indicador, em barras horizontais finas. */
function BarraComparativa({ rotulo, valorLoja, valorEstoque, formatador }) {
  const max = Math.max(Number(valorLoja) || 0, Number(valorEstoque) || 0, 0.0001);
  const series = [
    { nome: 'Loja', valor: valorLoja, ...COR_LOJA },
    { nome: 'Estoque', valor: valorEstoque, ...COR_ESTOQUE },
  ];
  return (
    <div className="space-y-2">
      <p className="text-xs text-dark-400 uppercase tracking-wider">{rotulo}</p>
      {series.map((s) => (
        <div key={s.nome} className="flex items-center gap-3" title={`${s.nome}: ${formatador(s.valor)}`}>
          <span className="w-16 text-xs text-dark-300 shrink-0 flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
            {s.nome}
          </span>
          <div className="flex-1 h-2 rounded-full bg-dark-700 overflow-hidden">
            <div
              className={`h-full rounded-full ${s.bar} transition-[width] duration-500`}
              style={{ width: `${Math.max((Number(s.valor) || 0) / max * 100, 2)}%` }}
            />
          </div>
          <span className="w-16 text-xs text-dark-200 text-right shrink-0 tabular-nums">{formatador(s.valor)}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Falta (R$) x Sobra (R$) de cada linha (Loja/Estoque/Geral), como barra divergente a
 * partir de um eixo central -- deixa visível de um lado só quanto cada armazém "perdeu"
 * e "ganhou" em valor, sem precisar ler os dois números soltos numa tabela.
 */
function BarraFaltaSobra({ linhas }) {
  const maxLado = Math.max(
    ...linhas.map((l) => Math.abs(Number(l.falta) || 0)),
    ...linhas.map((l) => Number(l.sobra) || 0),
    0.0001,
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between text-xs text-dark-400 uppercase tracking-wider">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400" /> Falta</span>
        <span className="flex items-center gap-1.5">Sobra <span className="w-2 h-2 rounded-full bg-green-400" /></span>
      </div>
      {linhas.map((l) => (
        <div key={l.nome} className="space-y-1.5">
          <div className="flex items-center justify-between text-xs tabular-nums">
            <span className="text-red-400 font-medium" title={`${l.nome} · Falta: ${moeda(l.falta)}`}>{moeda(l.falta)}</span>
            <span className="text-dark-300 font-medium">{l.nome}</span>
            <span className="text-green-400 font-medium" title={`${l.nome} · Sobra: ${moeda(l.sobra)}`}>{moeda(l.sobra)}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="flex-1 flex justify-end h-2.5 rounded-full bg-dark-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-red-400 transition-[width] duration-500"
                style={{ width: `${Math.max((Math.abs(Number(l.falta) || 0) / maxLado) * 100, Number(l.falta) ? 1.5 : 0)}%` }}
              />
            </div>
            <div className="w-px h-4 bg-dark-600 shrink-0" />
            <div className="flex-1 h-2.5 rounded-full bg-dark-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-green-400 transition-[width] duration-500"
                style={{ width: `${Math.max((Number(l.sobra) || 0) / maxLado * 100, Number(l.sobra) ? 1.5 : 0)}%` }}
              />
            </div>
          </div>
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
      <div className="relative shrink-0">
        <svg viewBox="0 0 160 160" className="w-40 h-40" role="img" aria-label="Distribuição de produtos por acuracidade">
          <circle cx="80" cy="80" r={raio} fill="none" stroke="currentColor" strokeWidth="20" className="text-dark-700" />
          {segmentos.filter((s) => s.valor > 0).map((s) => {
            const comprimentoTotal = (s.valor / total) * circunferencia;
            const comprimentoVisivel = Math.max(comprimentoTotal - 3, 0);
            const elemento = (
              <circle
                key={s.rotulo}
                cx="80" cy="80" r={raio} fill="none" stroke="currentColor" strokeWidth="20"
                className={`${s.corTexto} transition-[stroke-dasharray] duration-500`}
                strokeDasharray={`${comprimentoVisivel} ${circunferencia}`}
                strokeDashoffset={-acumulado}
                strokeLinecap="round"
                transform="rotate(-90 80 80)"
              >
                <title>{s.rotulo}: {inteiro(s.valor)} ({percentual(total > 0 ? s.valor / total : 0)})</title>
              </circle>
            );
            acumulado += comprimentoTotal;
            return elemento;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-white tabular-nums">{inteiro(total)}</span>
          <span className="text-[11px] text-dark-400 uppercase tracking-wider">produtos</span>
        </div>
      </div>
      <div className="space-y-2.5 w-full">
        {segmentos.map((s) => (
          <div key={s.rotulo} className="flex items-center gap-2 text-sm">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 bg-current ${s.corTexto}`} />
            <span className="text-dark-300 w-20 shrink-0">{s.rotulo}</span>
            <div className="flex-1 h-1.5 rounded-full bg-dark-700 overflow-hidden hidden sm:block">
              <div
                className={`h-full rounded-full bg-current ${s.corTexto}`}
                style={{ width: `${total > 0 ? (s.valor / total) * 100 : 0}%` }}
              />
            </div>
            <span className="text-dark-100 font-medium tabular-nums shrink-0">
              {inteiro(s.valor)} <span className="text-dark-400">({percentual(total > 0 ? s.valor / total : 0)})</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Ranking de maiores divergências como barras horizontais de magnitude. */
function RankingBarras({ titulo, icon: Icon, itens, cor }) {
  const corBarra = cor === 'text-red-400' ? 'bg-red-400' : 'bg-green-400';
  return (
    <div className="card">
      <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
        {Icon && <Icon className={`w-4 h-4 ${cor}`} />}
        {titulo}
      </h3>
      {!itens || itens.length === 0 ? (
        <p className="text-dark-400 text-sm text-center py-8">Nada nesse período.</p>
      ) : (
        <div className="space-y-3">
          {(() => {
            const max = Math.max(...itens.map((i) => Math.abs(Number(i.valorDivergencia) || 0)), 0.0001);
            return itens.map((item, idx) => (
              <div
                key={`${item.codProduto}-${idx}`}
                className="space-y-1"
                title={`${item.descricao || item.codProduto}: ${moeda(item.valorDivergencia)}`}
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-dark-200 truncate">{item.descricao || item.codProduto}</span>
                  <span className={`shrink-0 font-medium tabular-nums ${cor}`}>{moeda(item.valorDivergencia)}</span>
                </div>
                <div className="h-2 rounded-full bg-dark-700 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${corBarra} transition-[width] duration-500`}
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

/**
 * Corpo visual do dashboard de acuracidade (KPIs, comparativo Loja x Estoque, rosca de
 * produtos, rankings) -- sem cabeçalho nem navegação de mês, que ficam a cargo de quem
 * usa este componente (aba Dashboards de Qualidade). `detalhe` tem o mesmo formato tanto
 * para uma filial quanto para um grupo (Lojas/CDs/Geral), vindo de
 * `buscarDetalheFilialAcuracidade`/`buscarDetalheGrupoAcuracidade`.
 */
export function AccuracyDashboard({ detalhe, config, carregando }) {
  const [divergenciasExpandidas, setDivergenciasExpandidas] = useState(false);

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!detalhe) {
    return <p className="text-dark-400 text-center py-16">Sem dados no período.</p>;
  }

  const geral = detalhe.geral?.atual;
  const geralAnterior = detalhe.geral?.anterior;
  const armazem01 = detalhe.armazem01?.atual;
  const armazem03 = detalhe.armazem03?.atual;

  const atingiuAcuracidade = geral && config?.metaAcuracidade != null
    ? Number(geral.percentualAcuracidade) >= Number(config.metaAcuracidade)
    : null;
  const atingiuAjuste = geral && config?.metaInacuracia != null
    ? Number(geral.percentualInacuracia) <= Number(config.metaInacuracia)
    : null;

  const temDivergencias = detalhe.estoqueDividido && detalhe.divergenciasCruzadas?.length > 0;
  const divergenciasVisiveis = temDivergencias
    ? (divergenciasExpandidas ? detalhe.divergenciasCruzadas : detalhe.divergenciasCruzadas.slice(0, PREVIA_DIVERGENCIAS))
    : [];

  const linhasFaltaSobra = [
    geral && { nome: 'Geral', falta: geral.perdaValor, sobra: geral.ganhoValor },
    detalhe.estoqueDividido && armazem01 && { nome: 'Loja', falta: armazem01.perdaValor, sobra: armazem01.ganhoValor },
    detalhe.estoqueDividido && armazem03 && { nome: 'Estoque', falta: armazem03.perdaValor, sobra: armazem03.ganhoValor },
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Hero: o número que importa, em destaque -- Loja/Estoque (mais abaixo) são o
          detalhamento, não a manchete. */}
      <div className="card border-primary-500/25 bg-gradient-to-br from-dark-800 to-dark-800/40">
        <div className="flex items-center gap-2 mb-5">
          <Layers className="w-5 h-5 text-primary-400" />
          <h2 className="font-semibold text-white text-lg">Acuracidade Geral</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
          <HeroKpi
            titulo="Acuracidade"
            valor={percentual(geral?.percentualAcuracidade)}
            atingiu={atingiuAcuracidade}
            meta={config ? `Meta: mínimo ${percentual(config.metaAcuracidade)}` : null}
            delta={geralAnterior && (
              <DeltaBadge atual={geral?.percentualAcuracidade} anterior={geralAnterior.percentualAcuracidade} />
            )}
            extra={temDivergencias && (
              <p className="text-xs text-dark-400 mt-1.5">
                Sem transferências:{' '}
                <span className="text-amber-300 font-medium tabular-nums">
                  {percentual(detalhe.percentualAcuracidadeGeralSemTransferencias)}
                </span>
              </p>
            )}
          />
          <HeroKpi
            titulo="Ajuste (R$)"
            valor={percentual(geral?.percentualInacuracia)}
            atingiu={atingiuAjuste}
            meta={config ? `Meta: máximo ${percentual(config.metaInacuracia)}` : null}
            delta={geralAnterior && (
              <DeltaBadge atual={geral?.percentualInacuracia} anterior={geralAnterior.percentualInacuracia} invertido />
            )}
          />
        </div>
      </div>

      {detalhe.estoqueDividido ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ResultadoArmazemCard titulo="Loja" icon={Store} resultado={armazem01} anterior={detalhe.armazem01?.anterior} config={config} />
          <ResultadoArmazemCard titulo="Estoque" icon={Warehouse} resultado={armazem03} anterior={detalhe.armazem03?.anterior} config={config} />
        </div>
      ) : (
        <ResultadoArmazemCard titulo="Detalhamento" icon={Layers} resultado={geral} anterior={geralAnterior} config={config} />
      )}

      {linhasFaltaSobra.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-white mb-5 flex items-center gap-2">
            <Scale className="w-4 h-4 text-primary-400" />
            Falta x Sobra (R$){detalhe.estoqueDividido ? ' — Loja, Estoque e Geral' : ''}
          </h3>
          <BarraFaltaSobra linhas={linhasFaltaSobra} />
        </div>
      )}

      <div className={`grid grid-cols-1 ${detalhe.estoqueDividido ? 'lg:grid-cols-2' : ''} gap-4`}>
        {detalhe.estoqueDividido && (
          <div className="card">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-primary-400" />
              Loja x Estoque
            </h3>
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
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-primary-400" />
            Distribuição de produtos (Geral)
          </h3>
          <RoscaProdutos resultado={geral} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RankingBarras titulo="Maiores Faltas" icon={ArrowDown} itens={detalhe.maioresFaltas} cor="text-red-400" />
        <RankingBarras titulo="Maiores Sobras" icon={ArrowUp} itens={detalhe.maioresSobras} cor="text-green-400" />
      </div>

      {temDivergencias && (
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
              <p className="text-2xl font-bold text-white mt-1 tabular-nums">{percentual(geral?.percentualAcuracidade)}</p>
              <p className="text-xs text-dark-400 mt-1">{inteiro(geral?.produtosAcurados)} produtos acurados</p>
            </div>
            <div className="p-4 rounded-xl bg-dark-800/60 border border-dark-600">
              <p className="text-xs text-dark-400 uppercase tracking-wider">
                Acuracidade Geral · sem considerar as transferências
              </p>
              <p className="text-2xl font-bold text-amber-300 mt-1 tabular-nums">
                {percentual(detalhe.percentualAcuracidadeGeralSemTransferencias)}
              </p>
              <p className="text-xs text-dark-400 mt-1">
                {inteiro(detalhe.produtosAcuradosGeralSemTransferencias)} produtos acurados
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {divergenciasVisiveis.map((d) => (
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

          {detalhe.divergenciasCruzadas.length > PREVIA_DIVERGENCIAS && (
            <button
              onClick={() => setDivergenciasExpandidas((v) => !v)}
              className="btn-secondary w-full justify-center text-sm mt-4"
            >
              {divergenciasExpandidas ? (
                <>Mostrar menos <ChevronUp className="w-4 h-4" /></>
              ) : (
                <>Mostrar todos os {detalhe.divergenciasCruzadas.length} produtos <ChevronDown className="w-4 h-4" /></>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
