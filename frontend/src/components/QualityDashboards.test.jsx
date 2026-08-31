import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../services/api.js', () => ({
  buscarRelatorioAcuracidade: vi.fn(),
  buscarDetalheFilialAcuracidade: vi.fn(),
  buscarDetalheGrupoAcuracidade: vi.fn(),
  buscarDetalheSemanalAcuracidade: vi.fn(),
  buscarConfiguracaoQualidade: vi.fn(),
}));

import * as api from '../services/api.js';
import { QualityDashboards } from './QualityDashboards.jsx';
import { ErrorBoundary } from './ErrorBoundary.jsx';

const resultado = {
  percentualAcuracidade: 0.97, percentualInacuracia: 0.01,
  estoqueInicialValor: 1000, estoqueFinalValor: 990, perdaValor: -10, ganhoValor: 0,
  totalAjusteValor: 10, totalProdutos: 100, produtosContados: 100, produtosZerados: 0,
  produtosAcurados: 97, produtosInacurados: 3, produtosComPerda: 3, produtosComGanho: 0,
  quantidadeInicial: 500, quantidadeFinal: 495, unidadesPerda: -5, unidadesGanho: 0,
};

// CD 00 e a filial com a regra diferente: periodicidade SEMANAL.
const FILIAIS = [
  { filialId: 1, numeroFilial: 0, nome: 'CD Matriz', tipoFilial: 'CD', periodicidadeInventario: 'SEMANAL' },
  { filialId: 2, numeroFilial: 10, nome: 'Loja Centro', tipoFilial: 'LOJA', periodicidadeInventario: 'MENSAL' },
];

// Resposta de DetalheFilialAcuracidadeResponse: NAO tem o campo `semanas`.
const detalheMensal = {
  filialId: 2, numeroFilial: 10, nome: 'Loja Centro', estoqueDividido: false,
  geral: { atual: resultado, anterior: null },
  armazem01: null, armazem03: null, divergenciasCruzadas: [],
  maioresFaltas: [], maioresSobras: [],
};

// Resposta de DetalheFilialSemanalAcuracidadeResponse: tem `semanas`, nao tem `estoqueDividido`.
const detalheSemanal = {
  filialId: 1, numeroFilial: 0, nome: 'CD Matriz', ano: 2026, mes: 8,
  semanas: [{ numero: 1, data: '2026-08-01', resultado }],
  geral: resultado, maioresFaltas: [], maioresSobras: [],
};

const renderTela = () =>
  render(
    <ErrorBoundary>
      <QualityDashboards ano={2026} mes={8} showToast={vi.fn()} selecaoExterna={null} />
    </ErrorBoundary>
  );

/** Falha o teste se o ErrorBoundary tiver capturado um crash de render. */
const esperarSemCrash = () => {
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
};

const esperarFiliaisCarregadas = async () => {
  await waitFor(() => expect(screen.getAllByRole('option').length).toBeGreaterThan(3));
};

beforeEach(() => {
  vi.clearAllMocks();
  api.buscarRelatorioAcuracidade.mockResolvedValue({ filiais: FILIAIS });
  api.buscarConfiguracaoQualidade.mockResolvedValue({ metaAcuracidade: 0.95, metaInacuracia: 0.02 });
  api.buscarDetalheGrupoAcuracidade.mockResolvedValue({ ...detalheMensal, nome: 'Geral' });
  api.buscarDetalheFilialAcuracidade.mockResolvedValue(detalheMensal);
  api.buscarDetalheSemanalAcuracidade.mockResolvedValue(detalheSemanal);
});

describe('QualityDashboards', () => {
  it('abre no dashboard Geral (agregado de grupo)', async () => {
    renderTela();
    await waitFor(() => expect(api.buscarDetalheGrupoAcuracidade).toHaveBeenCalled());
    expect(await screen.findByText('Acuracidade Geral')).toBeInTheDocument();
    esperarSemCrash();
  });

  // --- Regressao do bug da "tela azul" do CD 00 ---
  // Trocar a selecao muda `ehSemanal` (e portanto o componente renderizado) no mesmo render,
  // mas o payload novo so chega depois. Antes, o WeeklyAccuracyDashboard era montado com o
  // `detalhe` no formato mensal da selecao anterior e estourava em `detalhe.semanas.length`.
  it('nao quebra ao trocar de uma filial MENSAL para o CD 00 (SEMANAL)', async () => {
    const user = userEvent.setup();
    renderTela();

    const seletor = await screen.findByLabelText('Selecionar dashboard');
    await esperarFiliaisCarregadas();

    // 1) filial mensal -> popula `detalhe` no formato do endpoint mensal
    await user.selectOptions(seletor, 'filial:2');
    await waitFor(() => expect(api.buscarDetalheFilialAcuracidade).toHaveBeenCalledWith(2, 2026, 8));
    expect(await screen.findByText('Acuracidade Geral')).toBeInTheDocument();

    // 2) troca para o CD 00 -- o momento exato em que a tela ficava azul
    await user.selectOptions(seletor, 'filial:1');

    esperarSemCrash();
    await waitFor(() => expect(api.buscarDetalheSemanalAcuracidade).toHaveBeenCalledWith(1, 2026, 8));
    expect(await screen.findByText('Semanas do mês')).toBeInTheDocument();
    esperarSemCrash();
  });

  it('nao quebra ao voltar do CD 00 para uma filial MENSAL', async () => {
    const user = userEvent.setup();
    renderTela();
    const seletor = await screen.findByLabelText('Selecionar dashboard');
    await esperarFiliaisCarregadas();

    await user.selectOptions(seletor, 'filial:1');
    expect(await screen.findByText('Semanas do mês')).toBeInTheDocument();

    await user.selectOptions(seletor, 'filial:2');
    esperarSemCrash();
    expect(await screen.findByText('Acuracidade Geral')).toBeInTheDocument();
    esperarSemCrash();
  });

  it('usa o endpoint semanal para o CD 00 e o mensal para as demais', async () => {
    const user = userEvent.setup();
    renderTela();
    const seletor = await screen.findByLabelText('Selecionar dashboard');
    await esperarFiliaisCarregadas();

    await user.selectOptions(seletor, 'filial:1');
    await waitFor(() => expect(api.buscarDetalheSemanalAcuracidade).toHaveBeenCalledWith(1, 2026, 8));
    expect(api.buscarDetalheFilialAcuracidade).not.toHaveBeenCalledWith(1, 2026, 8);

    await user.selectOptions(seletor, 'filial:2');
    await waitFor(() => expect(api.buscarDetalheFilialAcuracidade).toHaveBeenCalledWith(2, 2026, 8));
    expect(api.buscarDetalheSemanalAcuracidade).not.toHaveBeenCalledWith(2, 2026, 8);
  });

  // Deep-link do botao "Ver dashboard completo": `filiais` ainda nao chegou quando a selecao
  // ja aponta para o CD 00. `selecao.semanal` evita buscar o endpoint mensal por engano.
  it('respeita a periodicidade recebida via selecaoExterna antes das filiais carregarem', async () => {
    let liberarFiliais;
    api.buscarRelatorioAcuracidade.mockReturnValue(
      new Promise((resolve) => { liberarFiliais = () => resolve({ filiais: FILIAIS }); })
    );

    render(
      <ErrorBoundary>
        <QualityDashboards
          ano={2026} mes={8} showToast={vi.fn()}
          selecaoExterna={{ tipo: 'FILIAL', filialId: 1, semanal: true }}
        />
      </ErrorBoundary>
    );

    await waitFor(() => expect(api.buscarDetalheSemanalAcuracidade).toHaveBeenCalledWith(1, 2026, 8));
    expect(api.buscarDetalheFilialAcuracidade).not.toHaveBeenCalled();

    await act(async () => { liberarFiliais(); });
    expect(await screen.findByText('Semanas do mês')).toBeInTheDocument();
    esperarSemCrash();
  });

  // Respostas fora de ordem: a lenta (selecao antiga) chega DEPOIS da rapida (selecao nova).
  // A antiga precisa ser descartada, senao a tela fica presa no spinner.
  it('descarta resposta atrasada de uma selecao ja abandonada', async () => {
    const user = userEvent.setup();
    let liberarMensalAtrasada;
    api.buscarDetalheFilialAcuracidade.mockReturnValue(
      new Promise((resolve) => { liberarMensalAtrasada = () => resolve(detalheMensal); })
    );

    renderTela();
    const seletor = await screen.findByLabelText('Selecionar dashboard');
    await esperarFiliaisCarregadas();

    await user.selectOptions(seletor, 'filial:2');       // lenta, fica pendurada
    await user.selectOptions(seletor, 'filial:1');       // rapida, resolve ja
    expect(await screen.findByText('Semanas do mês')).toBeInTheDocument();

    await act(async () => { liberarMensalAtrasada(); }); // a atrasada chega agora

    // Continua no dashboard semanal, sem voltar para o spinner nem crashar.
    expect(screen.getByText('Semanas do mês')).toBeInTheDocument();
    esperarSemCrash();
  });

  it('avisa por toast quando o endpoint falha, sem derrubar a tela', async () => {
    const showToast = vi.fn();
    api.buscarDetalheGrupoAcuracidade.mockRejectedValue(new Error('backend fora do ar'));
    render(
      <ErrorBoundary>
        <QualityDashboards ano={2026} mes={8} showToast={showToast} selecaoExterna={null} />
      </ErrorBoundary>
    );
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('backend fora do ar', 'error'));
    esperarSemCrash();
  });
});
