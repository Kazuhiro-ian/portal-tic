import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WeeklyAccuracyDashboard } from './WeeklyAccuracyDashboard.jsx';

const resultado = {
  percentualAcuracidade: 0.97, percentualInacuracia: 0.01,
  estoqueInicialValor: 1000, estoqueFinalValor: 990, perdaValor: -10, ganhoValor: 0,
  totalAjusteValor: 10, totalProdutos: 100, produtosContados: 100, produtosZerados: 0,
  produtosAcurados: 97, produtosInacurados: 3, produtosComPerda: 3, produtosComGanho: 0,
  quantidadeInicial: 500, quantidadeFinal: 495, unidadesPerda: -5, unidadesGanho: 0,
};

const detalheSemanal = {
  filialId: 1, numeroFilial: 0, nome: 'CD 00', ano: 2026, mes: 8,
  semanas: [
    { numero: 1, data: '2026-08-01', resultado },
    { numero: 2, data: '2026-08-08', resultado },
  ],
  geral: resultado,
  maioresFaltas: [],
  maioresSobras: [],
};

describe('WeeklyAccuracyDashboard', () => {
  it('renderiza uma coluna por semana do mês, mais o Geral', () => {
    render(<WeeklyAccuracyDashboard detalhe={detalheSemanal} config={null} carregando={false} />);
    expect(screen.getByText('Geral do mês')).toBeInTheDocument();
    expect(screen.getByText(/Semana 01 — 01\/08\/2026/)).toBeInTheDocument();
    expect(screen.getByText(/Semana 02 — 08\/08\/2026/)).toBeInTheDocument();
  });

  it('mostra spinner enquanto carrega, sem tocar em detalhe', () => {
    const { container } = render(
      <WeeklyAccuracyDashboard detalhe={undefined} config={null} carregando />
    );
    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });

  it('mostra "sem dados" quando não há detalhe', () => {
    render(<WeeklyAccuracyDashboard detalhe={null} config={null} carregando={false} />);
    expect(screen.getByText(/Sem dados no período/)).toBeInTheDocument();
  });

  it('mostra "nenhuma semana" quando o mês não tem inventário importado', () => {
    render(
      <WeeklyAccuracyDashboard
        detalhe={{ ...detalheSemanal, semanas: [] }} config={null} carregando={false}
      />
    );
    expect(screen.getByText(/Nenhuma semana importada/)).toBeInTheDocument();
  });

  // --- Regressão do bug da "tela azul" do CD 00 ---
  // Antes, `detalhe.semanas.length` era lido direto: qualquer payload sem `semanas` lançava
  // TypeError durante o render, o React desmontava a árvore inteira e sobrava só o fundo
  // bg-dark-900 do <body> -- a tal "tela completamente azul".
  it.each([
    ['payload do endpoint mensal (sem o campo semanas)', { nome: 'CD 00', geral: { atual: resultado } }],
    ['objeto vazio', {}],
    ['semanas nula', { semanas: null }],
    ['semanas como objeto em vez de lista', { semanas: {} }],
  ])('não quebra o render com %s', (_rotulo, detalhe) => {
    expect(() =>
      render(<WeeklyAccuracyDashboard detalhe={detalhe} config={null} carregando={false} />)
    ).not.toThrow();
    expect(screen.getByText(/Nenhuma semana importada/)).toBeInTheDocument();
  });

  it('não quebra quando uma semana vem sem data ou com data inválida', () => {
    render(
      <WeeklyAccuracyDashboard
        detalhe={{
          ...detalheSemanal,
          semanas: [
            { numero: 1, data: null, resultado },
            { numero: 2, data: 'nao-e-data', resultado },
          ],
        }}
        config={null} carregando={false}
      />
    );
    // Cai no rótulo sem data em vez de renderizar "Invalid Date".
    expect(screen.getByText('Semana 01')).toBeInTheDocument();
    expect(screen.getByText('Semana 02')).toBeInTheDocument();
    expect(screen.queryByText(/Invalid Date/)).not.toBeInTheDocument();
  });
});
