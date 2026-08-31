import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { BarChart3 } from 'lucide-react';
import { AccuracyDashboard } from './AccuracyDashboard.jsx';
import { WeeklyAccuracyDashboard } from './WeeklyAccuracyDashboard.jsx';
import {
  buscarRelatorioAcuracidade, buscarDetalheFilialAcuracidade, buscarDetalheGrupoAcuracidade,
  buscarDetalheSemanalAcuracidade, buscarConfiguracaoQualidade,
} from '../services/api.js';

const valorDaSelecao = (selecao) => {
  if (selecao.tipo === 'FILIAL') return `filial:${selecao.filialId}`;
  if (selecao.tipo === 'GRUPO') return `grupo:${selecao.grupo}`;
  return 'geral';
};

const selecaoDoValor = (valor) => {
  if (valor.startsWith('filial:')) return { tipo: 'FILIAL', filialId: Number(valor.slice('filial:'.length)) };
  if (valor.startsWith('grupo:')) return { tipo: 'GRUPO', grupo: valor.slice('grupo:'.length) };
  return { tipo: 'GERAL' };
};

/**
 * Identidade da requisição que produz um `detalhe`. Inclui `semanal` porque a MESMA filial no
 * MESMO mês tem dois formatos de resposta possíveis (mês-a-mês x por semana), servidos por
 * endpoints diferentes -- sem isso não dá para saber se o `detalhe` em mãos é o do componente
 * que está prestes a renderizar.
 */
const chaveDaRequisicao = (selecao, ano, mes, semanal) =>
  `${valorDaSelecao(selecao)}|${ano}-${mes}|${semanal ? 'semanal' : 'mensal'}`;

/**
 * Aba "Dashboards" de Qualidade: o mesmo dashboard de acuracidade que antes só existia
 * como página cheia (aberta em nova guia) para uma filial, agora selecionável também por
 * grupo (Lojas/CDs) ou geral, sem sair da tela. `selecaoExterna` permite que outra aba
 * (o botão "Ver dashboard completo" do painel de detalhe da filial) pré-selecione uma
 * filial aqui.
 */
export function QualityDashboards({ ano, mes, showToast, selecaoExterna }) {
  const [filiais, setFiliais] = useState([]);
  const [config, setConfig] = useState(null);
  const [selecao, setSelecao] = useState({ tipo: 'GERAL' });
  const [detalhe, setDetalhe] = useState(null);
  const [carregando, setCarregando] = useState(true);
  // Chave da última requisição disparada. Trocar de seleção rápido deixa mais de um fetch no
  // ar, e eles podem voltar fora de ordem: sem este guarda, a resposta antiga (que chega por
  // último) sobrescreveria a nova com uma chave que não bate mais e a tela ficaria presa no
  // spinner para sempre.
  const requisicaoAtualRef = useRef(null);

  useEffect(() => {
    if (selecaoExterna) setSelecao(selecaoExterna);
  }, [selecaoExterna]);

  useEffect(() => {
    buscarRelatorioAcuracidade(ano, mes)
      .then((relatorio) => setFiliais(relatorio.filiais || []))
      .catch((erro) => showToast(erro.message || 'Erro ao carregar a lista de filiais.', 'error'));
    buscarConfiguracaoQualidade()
      .then(setConfig)
      .catch(() => {});
  }, [ano, mes, showToast]);

  // Periodicidade só existe por filial (agregados de grupo não têm um valor único) --
  // decide se busca o detalhe mês-a-mês de sempre ou o dashboard por semana do CD 00.
  const filialSelecionada = selecao.tipo === 'FILIAL'
    ? filiais.find((f) => f.filialId === selecao.filialId)
    : null;
  // `selecao.semanal` é preenchido por quem já sabe a periodicidade no momento de navegar
  // (botão "Ver dashboard completo"). Ele cobre a janela em que `filiais` ainda não chegou:
  // sem isso, ehSemanal começaria false para o CD 00, buscaria o endpoint mensal e só depois
  // viraria true -- trocando de componente com o payload do formato errado em mãos.
  const ehSemanal = filialSelecionada
    ? filialSelecionada.periodicidadeInventario === 'SEMANAL'
    : selecao.tipo === 'FILIAL' && selecao.semanal === true;

  const carregarDetalhe = useCallback(async () => {
    const chave = chaveDaRequisicao(selecao, ano, mes, ehSemanal);
    requisicaoAtualRef.current = chave;
    try {
      setCarregando(true);
      // Descarta o detalhe da seleção anterior ANTES de buscar o novo: ele está no formato do
      // outro endpoint e não pode chegar ao componente que vai renderizar agora.
      setDetalhe(null);
      const dados = selecao.tipo === 'FILIAL' && ehSemanal
        ? await buscarDetalheSemanalAcuracidade(selecao.filialId, ano, mes)
        : selecao.tipo === 'FILIAL'
          ? await buscarDetalheFilialAcuracidade(selecao.filialId, ano, mes)
          : await buscarDetalheGrupoAcuracidade(selecao.tipo === 'GRUPO' ? selecao.grupo : null, ano, mes);
      if (requisicaoAtualRef.current !== chave) return;
      setDetalhe({ chave, dados });
    } catch (erro) {
      if (requisicaoAtualRef.current !== chave) return;
      showToast(erro.message || 'Erro ao carregar o dashboard.', 'error');
      setDetalhe({ chave, dados: null });
    } finally {
      if (requisicaoAtualRef.current === chave) setCarregando(false);
    }
  }, [selecao, ano, mes, showToast, ehSemanal]);

  useEffect(() => {
    carregarDetalhe();
  }, [carregarDetalhe]);

  const lojas = useMemo(() => filiais.filter((f) => f.tipoFilial === 'LOJA'), [filiais]);
  const cds = useMemo(() => filiais.filter((f) => f.tipoFilial === 'CD'), [filiais]);

  const valorSelecionado = valorDaSelecao(selecao);

  // Um `detalhe` só é entregue ao dashboard se veio da requisição que corresponde ao que está
  // sendo renderizado agora. Trocar de seleção muda `ehSemanal` (e o componente escolhido) no
  // mesmo render, mas o fetch novo só termina depois -- sem esta checagem, o dashboard semanal
  // recebia o payload mensal da seleção anterior e quebrava no primeiro acesso a `semanas`.
  const chaveAtual = chaveDaRequisicao(selecao, ano, mes, ehSemanal);
  const detalheSincronizado = detalhe?.chave === chaveAtual ? detalhe.dados : null;
  // Enquanto o par (componente, dados) não bate, a tela está de fato carregando.
  const carregandoDetalhe = carregando || detalhe?.chave !== chaveAtual;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary-400" />
            {detalheSincronizado
              ? (detalheSincronizado.numeroFilial
                ? `${detalheSincronizado.numeroFilial} — ${detalheSincronizado.nome}`
                : detalheSincronizado.nome)
              : 'Dashboard de acuracidade'}
          </h2>
          <p className="text-dark-400 text-sm mt-1">Escolha uma loja, um CD, um grupo ou o dashboard geral.</p>
        </div>

        <select
          aria-label="Selecionar dashboard"
          value={valorSelecionado}
          onChange={(e) => setSelecao(selecaoDoValor(e.target.value))}
          className="select-field lg:max-w-xs"
        >
          <option value="geral">Geral (todas as filiais)</option>
          <optgroup label="Grupos">
            <option value="grupo:LOJA">Lojas (grupo)</option>
            <option value="grupo:CD">CDs (grupo)</option>
          </optgroup>
          {lojas.length > 0 && (
            <optgroup label="Lojas">
              {lojas.map((f) => (
                <option key={f.filialId} value={`filial:${f.filialId}`}>{f.numeroFilial} - {f.nome}</option>
              ))}
            </optgroup>
          )}
          {cds.length > 0 && (
            <optgroup label="CDs">
              {cds.map((f) => (
                <option key={f.filialId} value={`filial:${f.filialId}`}>{f.numeroFilial} - {f.nome}</option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      {ehSemanal ? (
        <WeeklyAccuracyDashboard
          key={chaveAtual}
          detalhe={detalheSincronizado} config={config} carregando={carregandoDetalhe}
        />
      ) : (
        <AccuracyDashboard
          key={chaveAtual}
          detalhe={detalheSincronizado} config={config} carregando={carregandoDetalhe}
        />
      )}
    </div>
  );
}
