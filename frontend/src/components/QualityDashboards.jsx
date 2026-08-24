import { useState, useEffect, useCallback, useMemo } from 'react';
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
  const ehSemanal = filialSelecionada?.periodicidadeInventario === 'SEMANAL';

  const carregarDetalhe = useCallback(async () => {
    try {
      setCarregando(true);
      const dados = selecao.tipo === 'FILIAL' && ehSemanal
        ? await buscarDetalheSemanalAcuracidade(selecao.filialId, ano, mes)
        : selecao.tipo === 'FILIAL'
          ? await buscarDetalheFilialAcuracidade(selecao.filialId, ano, mes)
          : await buscarDetalheGrupoAcuracidade(selecao.tipo === 'GRUPO' ? selecao.grupo : null, ano, mes);
      setDetalhe(dados);
    } catch (erro) {
      showToast(erro.message || 'Erro ao carregar o dashboard.', 'error');
      setDetalhe(null);
    } finally {
      setCarregando(false);
    }
  }, [selecao, ano, mes, showToast, ehSemanal]);

  useEffect(() => {
    carregarDetalhe();
  }, [carregarDetalhe]);

  const lojas = useMemo(() => filiais.filter((f) => f.tipoFilial === 'LOJA'), [filiais]);
  const cds = useMemo(() => filiais.filter((f) => f.tipoFilial === 'CD'), [filiais]);

  const valorSelecionado = valorDaSelecao(selecao);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary-400" />
            {detalhe ? (detalhe.numeroFilial ? `${detalhe.numeroFilial} — ${detalhe.nome}` : detalhe.nome) : 'Dashboard de acuracidade'}
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
          key={`${valorSelecionado}-${ano}-${mes}`}
          detalhe={detalhe} config={config} carregando={carregando}
        />
      ) : (
        <AccuracyDashboard key={`${valorSelecionado}-${ano}-${mes}`} detalhe={detalhe} config={config} carregando={carregando} />
      )}
    </div>
  );
}
