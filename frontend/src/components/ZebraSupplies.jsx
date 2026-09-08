import { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle, Send, Tag, Layers, Settings, Edit, Trash2, CalendarDays,
  CheckCircle2, Store, FileText, Upload, Loader2, XCircle, TrendingUp,
} from 'lucide-react';
import { SidePanel } from './SidePanel.jsx';
import { DataTable } from './DataTable.jsx';
import { SearchableSelect } from './SearchableSelect.jsx';
import { Paginacao } from './Paginacao.jsx';
import { usePaginacao } from '../hooks/usePaginacao.js';
import {
  listarFiliais,
  listarEstoqueItens,
  listarZebraCotas, salvarZebraCota, atualizarZebraCota, deletarZebraCota,
  listarZebraEnvios, salvarZebraEnvio, confirmarZebraEnvio, cancelarZebraEnvio,
  importarCronogramaZebra, deletarZebraEnvio,
  buscarResumoConsumoZebra, buscarPrevisaoConsumoZebra, buscarRankingConsumoZebra,
} from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useConfirm } from '../hooks/useConfirm.jsx';
import { useToast } from '../hooks/useToast.js';
import { Toast } from './Toast.jsx';
import { getBranchNumber, branchLabel } from '../utils/filiais.js';
import { toISO, limitesDoMes, MESES } from '../utils/datas.js';
import { STATUS_ZEBRA_ENVIO } from '../utils/zebra.js';

const CLASSIFICACAO_BADGE = {
  'Muito Alto Consumo': 'badge-danger',
  'Alto Consumo': 'badge-warning',
  'Médio/Baixo Consumo': 'badge-info',
  'Sem histórico': 'badge',
};

function colunasCronogramaZebra(branches) {
  return [
    {
      chave: 'filial',
      header: 'Filial',
      mobile: 'titulo',
      tdClassName: 'font-medium text-white',
      render: (d) => branchLabel(branches, d.filialId),
    },
    {
      chave: 'quinzena',
      header: 'Quinzena',
      render: (d) => (d.envioNumero ? `${d.envioNumero}º envio` : '—'),
    },
    {
      chave: 'dataPrevista',
      header: 'Data prevista',
      mobile: 'subtitulo',
      tdClassName: 'whitespace-nowrap',
      render: (d) => d.dataPrevista ? new Date(d.dataPrevista + 'T00:00:00').toLocaleDateString('pt-BR') : '—',
    },
    {
      chave: 'status',
      header: 'Status',
      mobile: 'badge',
      render: (d) => (
        <span className={`badge ${STATUS_ZEBRA_ENVIO[d.status]?.badge || 'badge'}`}>
          {STATUS_ZEBRA_ENVIO[d.status]?.label || d.status}
        </span>
      ),
    },
    {
      chave: 'etiquetas',
      header: 'Etiquetas',
      tdClassName: 'text-center',
      render: (d) => (
        <span className="inline-flex items-center gap-1 font-semibold text-primary-400">
          {d.qtdEtiquetas > 0 ? (
            <>
              <Tag className="w-3.5 h-3.5" />
              {d.qtdEtiquetas}
            </>
          ) : (
            <span className="text-dark-500">—</span>
          )}
        </span>
      ),
    },
    {
      chave: 'ribbons',
      header: 'Ribbons',
      tdClassName: 'text-center',
      render: (d) => (
        <span className="inline-flex items-center gap-1 font-semibold text-accent-400">
          {d.qtdRibbons > 0 ? (
            <>
              <Layers className="w-3.5 h-3.5" />
              {d.qtdRibbons}
            </>
          ) : (
            <span className="text-dark-500">—</span>
          )}
        </span>
      ),
    },
    {
      chave: 'dataReal',
      header: 'Data real',
      tdClassName: 'whitespace-nowrap text-dark-300',
      render: (d) => d.dataEnvio ? new Date(d.dataEnvio + 'T00:00:00').toLocaleDateString('pt-BR') : '—',
    },
  ];
}

function colunasResumoConsumo() {
  return [
    {
      chave: 'filial',
      header: 'Filial',
      mobile: 'titulo',
      tdClassName: 'font-medium text-white',
      render: (r) => `${r.numeroFilial} — ${r.nomeFilial}`,
    },
    { chave: 'etiquetas', header: 'Etiquetas', tdClassName: 'text-center', render: (r) => r.totalEtiquetas },
    { chave: 'ribbons', header: 'Ribbons', tdClassName: 'text-center', render: (r) => r.totalRibbons },
    {
      chave: 'classificacao',
      header: 'Classificação',
      mobile: 'badge',
      render: (r) => (
        <span className={`badge ${CLASSIFICACAO_BADGE[r.classificacao] || 'badge'}`}>{r.classificacao}</span>
      ),
    },
  ];
}

const emptyDispatchForm = {
  filialId: '', // Guarda o NUMERO da filial (numero_filial)
  qtdEtiquetas: 0,
  qtdRibbons: 0,
  dataPrevista: toISO(new Date()),
  tipoEnvio: 'REGULAR',
  motivoExtra: '',
  jaEnviado: true,
};

export function ZebraSupplies() {
  const { canWrite } = useAuth();
  const { confirmar, dialogoConfirmacao } = useConfirm();
  const { toast, showToast, hideToast } = useToast();
  const [branches, setBranches] = useState([]);
  const [quotas, setQuotas] = useState([]);
  const [distributions, setDistributions] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const isMesAtual = ano === hoje.getFullYear() && mes === hoje.getMonth() + 1;

  const [dispatchForm, setDispatchForm] = useState(emptyDispatchForm);

  // Só validação de campo (síncrona, antes de qualquer chamada) fica inline, perto do
  // formulário -- o resultado da submissão em si (sucesso ou erro do backend) vira toast.
  const [formError, setFormError] = useState('');

  // Modais
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [editingQuota, setEditingQuota] = useState(null);
  const [quotaForm, setQuotaForm] = useState({
    filialId: '', etiquetasPadrao: 5, ribbonsPadrao: 2, diaEnvio1: 5, diaEnvio2: 20,
  });

  // Confirmação de envio (PREVISTO -> ENVIADO)
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmandoEnvio, setConfirmandoEnvio] = useState(null);
  const [confirmForm, setConfirmForm] = useState({ dataEnvio: toISO(new Date()), qtdEtiquetas: 0, qtdRibbons: 0 });

  // Importação da planilha de cronograma
  const [arquivoCronograma, setArquivoCronograma] = useState(null);
  const [importandoCronograma, setImportandoCronograma] = useState(false);

  // Análise de consumo
  const [resumoConsumo, setResumoConsumo] = useState([]);
  const [previsaoConsumo, setPrevisaoConsumo] = useState([]);
  const [rankingConsumo, setRankingConsumo] = useState([]);
  const [carregandoAnalytics, setCarregandoAnalytics] = useState(false);

  const carregarDados = useCallback(async () => {
    try {
      setIsLoading(true);
      const { inicio, fim } = limitesDoMes(ano, mes);
      const [filiaisData, cotasData, enviosData, estoqueData] = await Promise.all([
        listarFiliais(),
        listarZebraCotas(),
        listarZebraEnvios(inicio, fim),
        listarEstoqueItens()
      ]);
      setBranches(filiaisData);
      setQuotas(cotasData);
      setDistributions(enviosData);
      setStockItems(estoqueData);
    } catch (error) {
      showToast('Erro ao carregar dados do servidor.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [ano, mes, showToast]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const carregarAnalytics = useCallback(async () => {
    try {
      setCarregandoAnalytics(true);
      const [resumo, previsao, ranking] = await Promise.all([
        buscarResumoConsumoZebra(ano, mes),
        buscarPrevisaoConsumoZebra(),
        buscarRankingConsumoZebra(ano, mes, 5),
      ]);
      setResumoConsumo(resumo);
      setPrevisaoConsumo(previsao);
      setRankingConsumo(ranking);
    } catch (error) {
      showToast('Erro ao carregar a análise de consumo.', 'error');
    } finally {
      setCarregandoAnalytics(false);
    }
  }, [ano, mes, showToast]);

  useEffect(() => {
    carregarAnalytics();
  }, [carregarAnalytics]);

  const paginacaoDistribuicoes = usePaginacao(distributions);

  const currentDay = hoje.getDate();

  // Filtragem de estoque considerando categoriaZebra ou nome
  const labelItems = stockItems.filter(i => i.categoriaZebra === 'ETIQUETA' || (!i.categoriaZebra && i.name.toLowerCase().includes('etiqueta')));
  const ribbonItems = stockItems.filter(i => i.categoriaZebra === 'RIBBON' || (!i.categoriaZebra && i.name.toLowerCase().includes('ribbon')));

  const totalLabelStock = labelItems.reduce((sum, i) => sum + i.quantity, 0);
  const totalRibbonStock = ribbonItems.reduce((sum, i) => sum + i.quantity, 0);

  // Só envios já confirmados contam como consumo de fato -- os PREVISTO ainda não tocaram o estoque.
  const enviadosDoMes = distributions.filter((d) => d.status === 'ENVIADO');

  // Lógica de Identificação de Envios Pendentes (Quinzena) -- só faz sentido olhando o mês atual.
  const pendingBranches = isMesAtual ? quotas.filter((quota) => {
    const enviosRegularesNoMes = distributions.filter(d =>
      d.filialId.toString() === quota.filialId.toString() &&
      d.tipoEnvio === 'REGULAR' &&
      d.status !== 'CANCELADO'
    );

    if (enviosRegularesNoMes.length === 0 && currentDay >= quota.diaEnvio1) return true;
    if (enviosRegularesNoMes.length === 1 && currentDay >= quota.diaEnvio2) return true;
    return false;
  }) : [];

  // Autopreenchimento Dinâmico ao Selecionar Filial pelo Número
  const handleBranchSelect = (branchNumStr) => {
    if (!branchNumStr) {
      setDispatchForm(emptyDispatchForm);
      return;
    }

    const filialNum = Number(branchNumStr);
    const quota = quotas.find((q) => q.filialId.toString() === filialNum.toString());

    // Verifica se há pendência regular para sugerir o tipo
    const isPending = pendingBranches.some(q => q.filialId.toString() === filialNum.toString());
    const tipoSugerido = isPending ? 'REGULAR' : 'EXTRA';

    setDispatchForm({
      ...dispatchForm,
      filialId: filialNum,
      tipoEnvio: tipoSugerido,
      qtdEtiquetas: quota && tipoSugerido === 'REGULAR' ? quota.etiquetasPadrao : 0,
      qtdRibbons: quota && tipoSugerido === 'REGULAR' ? quota.ribbonsPadrao : 0,
      motivoExtra: '',
    });
    setFormError('');
  };

  const handleRegisterDispatch = async () => {
    setFormError('');

    if (!dispatchForm.filialId && dispatchForm.filialId !== 0) {
      setFormError('Selecione a filial de destino.'); return;
    }
    if (dispatchForm.qtdEtiquetas <= 0 && dispatchForm.qtdRibbons <= 0) {
      setFormError('Informe ao menos uma quantidade maior que zero.'); return;
    }
    // Estoque só é conferido de verdade quando o envio já sai confirmado -- um PREVISTO
    // pode ser cadastrado mesmo sem estoque hoje, e ser confirmado depois de reabastecer.
    if (dispatchForm.jaEnviado && dispatchForm.qtdEtiquetas > totalLabelStock) {
      setFormError(`Estoque insuficiente de etiquetas. Disponível: ${totalLabelStock} rolos.`); return;
    }
    if (dispatchForm.jaEnviado && dispatchForm.qtdRibbons > totalRibbonStock) {
      setFormError(`Estoque insuficiente de ribbons. Disponível: ${totalRibbonStock} unidades.`); return;
    }
    if (dispatchForm.tipoEnvio === 'EXTRA' && !dispatchForm.motivoExtra.trim()) {
      setFormError('Para envios extras, você deve informar obrigatoriamente o motivo.'); return;
    }

    try {
      const payload = {
        filialId: dispatchForm.filialId,
        qtdEtiquetas: dispatchForm.qtdEtiquetas,
        qtdRibbons: dispatchForm.qtdRibbons,
        dataPrevista: dispatchForm.dataPrevista,
        tipoEnvio: dispatchForm.tipoEnvio,
        motivoExtra: dispatchForm.motivoExtra,
      };
      // Uma única chamada: se jaEnviado, o backend cria o PREVISTO e já confirma (baixa
      // o estoque) na mesma transação -- nada fica gravado pela metade se algo falhar no meio.
      await salvarZebraEnvio(payload, dispatchForm.jaEnviado);

      const label = branchLabel(branches, dispatchForm.filialId);
      showToast(
        dispatchForm.jaEnviado
          ? `Envio (${dispatchForm.tipoEnvio}) para "${label}" registrado. Estoque atualizado!`
          : `Envio (${dispatchForm.tipoEnvio}) para "${label}" adicionado ao cronograma como previsto.`
      );

      setDispatchForm(emptyDispatchForm);
      await carregarDados();
      await carregarAnalytics();
    } catch (error) {
      showToast(error.message || 'Erro de comunicação ao salvar envio.', 'error');
    }
  };

  const openConfirmModal = (envio) => {
    setConfirmandoEnvio(envio);
    setConfirmForm({
      dataEnvio: toISO(new Date()),
      qtdEtiquetas: envio.qtdEtiquetas,
      qtdRibbons: envio.qtdRibbons,
    });
    setShowConfirmModal(true);
  };

  const handleConfirmarEnvio = async () => {
    try {
      await confirmarZebraEnvio(confirmandoEnvio.id, confirmForm);
      showToast('Envio confirmado e estoque atualizado.');
      setShowConfirmModal(false);
      await carregarDados();
      await carregarAnalytics();
    } catch (error) {
      showToast(error.message || 'Erro ao confirmar envio.', 'error');
    }
  };

  const handleCancelarEnvio = async (envio) => {
    const confirmado = await confirmar({
      titulo: 'Cancelar envio previsto',
      mensagem: `Cancelar o envio previsto para "${branchLabel(branches, envio.filialId)}"? Isso não afeta o estoque.`,
    });
    if (!confirmado) return;

    try {
      await cancelarZebraEnvio(envio.id);
      showToast('Envio cancelado.');
      await carregarDados();
    } catch (error) {
      showToast(error.message || 'Erro ao cancelar envio.', 'error');
    }
  };

  const handleDeleteDistribution = async (d) => {
    const confirmado = await confirmar({
      titulo: 'Excluir registro de envio',
      mensagem: 'Excluir este registro do cronograma?',
    });
    if (!confirmado) return;

    try {
      await deletarZebraEnvio(d.id);
      await carregarDados();
    } catch (error) {
      showToast(error.message || 'Erro ao excluir registro.', 'error');
    }
  };

  const handleImportarCronograma = async () => {
    if (!arquivoCronograma) {
      showToast('Selecione o arquivo da planilha antes de importar.', 'error');
      return;
    }
    setImportandoCronograma(true);
    try {
      const resp = await importarCronogramaZebra(arquivoCronograma);
      showToast(
        `Planilha importada: ${resp.criados} criados, ${resp.atualizados} atualizados, ${resp.ignorados} ignorados.`
      );
      if (resp.avisos?.length > 0) {
        showToast(resp.avisos[0], 'error');
      }
      setArquivoCronograma(null);
      await carregarDados();
      await carregarAnalytics();
    } catch (error) {
      showToast(error.message || 'Erro ao importar a planilha.', 'error');
    } finally {
      setImportandoCronograma(false);
    }
  };

  const handleSaveQuota = async () => {
    if (!quotaForm.filialId && quotaForm.filialId !== 0) return;

    try {
      const payload = {
        ...quotaForm,
        filialId: Number(quotaForm.filialId)
      };

      if (editingQuota) {
        await atualizarZebraCota(editingQuota.id, payload);
      } else {
        await salvarZebraCota(payload);
      }

      await carregarDados();
      setShowQuotaModal(false);
    } catch (error) {
      showToast(error.message || 'Erro ao salvar cota.', 'error');
    }
  };

  const handleDeleteQuota = async (id) => {
    const confirmado = await confirmar({
      titulo: 'Excluir cota',
      mensagem: 'Excluir esta cota de filial?',
    });
    if (!confirmado) return;

    try {
      await deletarZebraCota(id);
      await carregarDados();
    } catch (error) {
      showToast('Erro ao excluir cota.', 'error');
    }
  };

  // Filtra filiais sem cota considerando o número da filial
  const branchesWithoutQuota = branches.filter(
    (b) => {
      const num = getBranchNumber(b);
      return !quotas.some((q) => q.filialId.toString() === num?.toString()) ||
             (editingQuota && editingQuota.filialId.toString() === num?.toString());
    }
  );

  const totalEtiquetasPrevistas = previsaoConsumo.reduce((s, p) => s + p.etiquetasPrevistas, 0);
  const totalRibbonsPrevistas = previsaoConsumo.reduce((s, p) => s + p.ribbonsPrevistas, 0);
  const maiorConsumoRanking = Math.max(...rankingConsumo.map((r) => r.totalEtiquetas + r.totalRibbons), 1);

  return (
    <div className="space-y-6">
      {dialogoConfirmacao}

      <Toast toast={toast} onClose={hideToast} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Logística de Insumos Zebra</h1>
          <p className="text-dark-400 mt-1">
            Cronograma quinzenal de etiquetas e ribbons -- previsto até confirmado
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select value={mes} onChange={(e) => setMes(Number(e.target.value))} className="select-field w-auto">
            {MESES.map((nome, i) => (
              <option key={nome} value={i + 1}>{nome}</option>
            ))}
          </select>
          <select value={ano} onChange={(e) => setAno(Number(e.target.value))} className="select-field w-auto">
            {[ano - 1, ano, ano + 1].map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          {canWrite && (
            <button
              onClick={() => {
                setEditingQuota(null);
                setQuotaForm({ filialId: '', etiquetasPadrao: 5, ribbonsPadrao: 2, diaEnvio1: 5, diaEnvio2: 20 });
                setShowQuotaModal(true);
              }}
              className="btn-secondary"
            >
              <Settings className="w-4 h-4" />
              Gerenciar Cronogramas
            </button>
          )}
        </div>
      </div>

      {/* AVISO QUANDO NÃO EXISTIR FILIAL NO BANCO DE DADOS */}
      {!isLoading && branches.length === 0 && (
        <div className="flex items-start gap-4 p-4 rounded-xl bg-dark-700/50 border border-dark-600">
          <Store className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-dark-300">
            Nenhuma filial cadastrada no banco de dados. Acesse{' '}
            <span className="font-semibold text-white">Gestão de Filiais</span> para cadastrar as
            lojas antes de registrar envios.
          </p>
        </div>
      )}

      {/* PAINEL INTELIGENTE DE ALERTAS (só no mês atual) */}
      {isMesAtual && !isLoading && pendingBranches.length > 0 ? (
        <div className="flex items-start gap-4 p-4 rounded-xl bg-accent-500/10 border border-accent-500/30">
          <div className="w-10 h-10 bg-accent-500/20 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5 text-accent-400" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-accent-300">
              {pendingBranches.length} {pendingBranches.length === 1 ? 'filial aguarda envio' : 'filiais aguardam envio'} na quinzena atual
            </p>
            <p className="text-sm text-dark-300 mt-1">
              Atenção: Priorize o envio de insumos para as lojas:{' '}
              <span className="font-semibold text-white">
                {pendingBranches.map((q) => branchLabel(branches, q.filialId)).join(', ')}
              </span>
            </p>
          </div>
        </div>
      ) : (
        isMesAtual && !isLoading && quotas.length > 0 && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-primary-500/10 border border-primary-500/30">
            <CheckCircle2 className="w-5 h-5 text-primary-400 shrink-0" />
            <p className="text-sm text-primary-300 font-medium">
              Todos os envios da quinzena atual estão em dia!
            </p>
          </div>
        )
      )}

      <div className="grid grid-cols-1 c-md:grid-cols-5 gap-6">
        {canWrite && (
        <div className="c-md:col-span-3 card">
          <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
            <Send className="w-5 h-5 text-primary-400" />
            Registrar Saída de Material
          </h2>

          <div className="space-y-4">
            <div>
              <label id="zebra-filial-label" className="block text-sm font-medium text-dark-300 mb-2">Filial de Destino *</label>
              <SearchableSelect
                items={branches.map((b) => {
                  const num = getBranchNumber(b);
                  return { value: num, label: branchLabel(branches, num) };
                })}
                value={dispatchForm.filialId || null}
                onChange={(item) => handleBranchSelect(item.value)}
                labelId="zebra-filial-label"
                placeholder={branches.length === 0 ? 'Nenhuma filial cadastrada' : '-- Selecione a filial --'}
                searchPlaceholder="Pesquisar filial..."
                vazio="Nenhuma filial encontrada"
                disabled={isLoading || branches.length === 0}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="zebra-tipo-envio" className="block text-sm font-medium text-dark-300 mb-2">Tipo de Envio</label>
                <select
                  id="zebra-tipo-envio"
                  value={dispatchForm.tipoEnvio}
                  onChange={(e) => {
                    const tipo = e.target.value;
                    const quota = quotas.find(q => q.filialId.toString() === dispatchForm.filialId.toString());
                    setDispatchForm({
                      ...dispatchForm,
                      tipoEnvio: tipo,
                      qtdEtiquetas: tipo === 'REGULAR' && quota ? quota.etiquetasPadrao : 0,
                      qtdRibbons: tipo === 'REGULAR' && quota ? quota.ribbonsPadrao : 0,
                      motivoExtra: tipo === 'REGULAR' ? '' : dispatchForm.motivoExtra
                    });
                  }}
                  className="select-field bg-dark-700"
                >
                  <option value="REGULAR">Envio Regular (Quinzena)</option>
                  <option value="EXTRA">Envio Extra / Emergência</option>
                </select>
              </div>
              <div>
                <label htmlFor="zebra-data-envio" className="block text-sm font-medium text-dark-300 mb-2">
                  {dispatchForm.jaEnviado ? 'Data do Envio *' : 'Data Prevista *'}
                </label>
                <input
                  id="zebra-data-envio"
                  type="date"
                  value={dispatchForm.dataPrevista}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, dataPrevista: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>

            {/* Expansão para Motivo Extra */}
            {dispatchForm.tipoEnvio === 'EXTRA' && (
              <div className="p-3 bg-accent-500/10 border border-accent-500/30 rounded-lg animate-fade-in">
                <label htmlFor="zebra-motivo-extra" className="block text-sm font-medium text-accent-300 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Motivo do Envio Extra *
                </label>
                <input
                  id="zebra-motivo-extra"
                  type="text"
                  value={dispatchForm.motivoExtra}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, motivoExtra: e.target.value })}
                  className="input-field bg-dark-800 border-accent-500/30 focus:border-accent-500 text-sm"
                  placeholder="Ex: Impressora danificou fita, alto volume de impressão..."
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-dark-600 pt-4">
              <div>
                <label htmlFor="zebra-qtd-etiquetas" className="block text-sm font-medium text-dark-300 mb-2 flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-primary-400" /> Etiquetas (rolos)
                </label>
                <input
                  id="zebra-qtd-etiquetas"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={dispatchForm.qtdEtiquetas}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, qtdEtiquetas: parseInt(e.target.value) || 0 })}
                  className="input-field"
                />
                <p className="text-xs mt-1.5 text-dark-400">
                  Estoque: <span className="text-primary-400 font-bold">{totalLabelStock}</span>
                </p>
              </div>

              <div>
                <label htmlFor="zebra-qtd-ribbons" className="block text-sm font-medium text-dark-300 mb-2 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-accent-400" /> Ribbons (unid.)
                </label>
                <input
                  id="zebra-qtd-ribbons"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={dispatchForm.qtdRibbons}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, qtdRibbons: parseInt(e.target.value) || 0 })}
                  className="input-field"
                />
                <p className="text-xs mt-1.5 text-dark-400">
                  Estoque: <span className="text-primary-400 font-bold">{totalRibbonStock}</span>
                </p>
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg bg-dark-700/50 border border-dark-600">
              <input
                type="checkbox"
                checked={dispatchForm.jaEnviado}
                onChange={(e) => setDispatchForm({ ...dispatchForm, jaEnviado: e.target.checked })}
                className="w-5 h-5 rounded border-dark-600 bg-dark-700 text-primary-500 focus:ring-primary-500"
              />
              <span className="text-sm text-dark-200">
                Já foi enviado <span className="text-dark-400">(desmarque para só planejar -- o estoque só é descontado na confirmação)</span>
              </span>
            </label>

            {formError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-sm text-red-300">{formError}</p>
              </div>
            )}

            <button
              onClick={handleRegisterDispatch}
              disabled={isLoading || (!dispatchForm.filialId && dispatchForm.filialId !== 0) || branches.length === 0}
              className="btn-primary w-full justify-center py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              {dispatchForm.jaEnviado ? 'Confirmar e Dar Baixa no Estoque' : 'Adicionar ao Cronograma (Previsto)'}
            </button>
          </div>
        </div>
        )}

        <div className={canWrite ? 'c-md:col-span-2 space-y-4' : 'c-md:col-span-5 grid grid-cols-1 md:grid-cols-2 gap-4'}>
          <div className="card">
            <h3 className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-4">
              Visão Geral do Mês
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-dark-700/50">
                <span className="text-sm text-dark-300">Envios Confirmados</span>
                <span className="font-bold text-sm text-white">{enviadosDoMes.length}</span>
              </div>
              <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-dark-700/50">
                <span className="text-sm text-dark-300">Etiquetas Consumidas</span>
                <span className="font-bold text-sm text-primary-400">
                  {enviadosDoMes.reduce((s, d) => s + d.qtdEtiquetas, 0)} rolos
                </span>
              </div>
              <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-dark-700/50">
                <span className="text-sm text-dark-300">Ribbons Consumidos</span>
                <span className="font-bold text-sm text-accent-400">
                  {enviadosDoMes.reduce((s, d) => s + d.qtdRibbons, 0)} unid.
                </span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-4">
              Estoque Físico (Itens Zebra)
            </h3>
            {labelItems.length === 0 && ribbonItems.length === 0 ? (
              <p className="text-dark-400 text-sm text-center py-4">
                Nenhum item sinalizado como Insumo Zebra no módulo de Estoque.
              </p>
            ) : (
              <div className="space-y-2">
                {[...labelItems, ...ribbonItems].map((item) => {
                  const isCritical = item.quantity <= item.minQuantity;
                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-lg border transition-colors ${
                        isCritical ? 'bg-red-500/10 border-red-500/30' : 'bg-dark-700/50 border-dark-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm text-white font-medium truncate">{item.name}</p>
                        <span className={`font-bold text-base shrink-0 ${isCritical ? 'text-red-400' : 'text-white'}`}>
                          {item.quantity}
                        </span>
                      </div>
                      <p className="text-xs text-dark-400 mt-0.5">
                        Mínimo ideal: {item.minQuantity} &bull; {item.location}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {canWrite && (
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary-400" />
            Importar Planilha de Cronograma
          </h2>
          <p className="text-dark-400 text-sm mb-4">
            Importa um arquivo .csv com o cronograma de envios previstos do mês. Linhas que já
            batem com um envio existente são atualizadas; envios já confirmados nunca são
            sobrescritos.
          </p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setArquivoCronograma(e.target.files?.[0] || null)}
              disabled={importandoCronograma}
              className="input-field file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:bg-dark-700 file:text-dark-200 file:text-sm disabled:opacity-50"
            />
            <button
              onClick={handleImportarCronograma}
              disabled={importandoCronograma || !arquivoCronograma}
              className="btn-primary shrink-0 disabled:opacity-50"
            >
              {importandoCronograma ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {importandoCronograma ? 'Importando...' : 'Importar'}
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary-400" />
            Cronograma do Mês
          </h2>
          <span className="badge badge-info">{distributions.length} registros</span>
        </div>

        <DataTable
          colunas={colunasCronogramaZebra(branches)}
          dados={paginacaoDistribuicoes.itensPagina}
          carregando={isLoading}
          vazio="Nenhum envio no cronograma deste mês."
          acoes={(d) =>
            canWrite && (
              <>
                {d.status === 'PREVISTO' && (
                  <>
                    <button onClick={() => openConfirmModal(d)} className="btn-secondary px-3 py-1.5" title="Confirmar envio" aria-label="Confirmar envio">
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleCancelarEnvio(d)} className="btn-secondary px-3 py-1.5" title="Cancelar" aria-label="Cancelar">
                      <XCircle className="w-4 h-4" />
                    </button>
                  </>
                )}
                {d.status !== 'ENVIADO' && (
                  <button onClick={() => handleDeleteDistribution(d)} className="btn-danger px-3 py-1.5" title="Excluir" aria-label="Excluir">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </>
            )
          }
        />
        <Paginacao {...paginacaoDistribuicoes} rotulo="envios" />
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary-400" />
          Análise de Consumo
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-dark-700/50 border border-dark-600">
            <h3 className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3">
              Média Mensal / Previsão do Próximo Mês
            </h3>
            <p className="text-xs text-dark-400 mb-3">Baseada na média dos últimos 3 meses confirmados.</p>
            <div className="flex items-center gap-6">
              <div>
                <p className="text-2xl font-bold text-primary-400">{totalEtiquetasPrevistas.toFixed(1)}</p>
                <p className="text-xs text-dark-400">etiquetas/mês</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-accent-400">{totalRibbonsPrevistas.toFixed(1)}</p>
                <p className="text-xs text-dark-400">ribbons/mês</p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-dark-700/50 border border-dark-600">
            <h3 className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3">
              Filiais que Mais Consumiram ({MESES[mes - 1]}/{ano})
            </h3>
            {rankingConsumo.length === 0 ? (
              <p className="text-dark-400 text-sm py-2">Nenhum envio confirmado neste mês.</p>
            ) : (
              <div className="space-y-2">
                {rankingConsumo.map((r, i) => {
                  const total = r.totalEtiquetas + r.totalRibbons;
                  const largura = Math.round((total / maiorConsumoRanking) * 100);
                  return (
                    <div key={r.filialId} className="relative p-2.5 rounded-lg border border-dark-600 bg-dark-800 overflow-hidden">
                      <div className="absolute inset-y-0 left-0 bg-primary-500/15" style={{ width: `${largura}%` }} />
                      <div className="relative flex items-center justify-between gap-2 text-sm">
                        <span className="text-white font-medium truncate">
                          #{i + 1} {r.numeroFilial} — {r.nomeFilial}
                        </span>
                        <span className="text-xs text-dark-300 shrink-0">
                          <span className="text-primary-400 font-semibold">{r.totalEtiquetas}</span> etiq. &bull;{' '}
                          <span className="text-accent-400 font-semibold">{r.totalRibbons}</span> ribbons
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <h3 className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3">
          Classificação de Consumo por Filial ({MESES[mes - 1]}/{ano})
        </h3>
        <DataTable
          colunas={colunasResumoConsumo()}
          dados={resumoConsumo}
          carregando={carregandoAnalytics}
          vazio="Sem dados de consumo para este mês."
        />
      </div>

      <SidePanel
        isOpen={showQuotaModal}
        onClose={() => setShowQuotaModal(false)}
        title="Cronogramas e Cotas das Filiais"
        size="lg"
      >
        <div className="mb-5 p-4 rounded-xl bg-dark-700/50 border border-dark-600">
          <h3 className="text-sm font-semibold text-white mb-4">
            {editingQuota ? `Editando: ${branchLabel(branches, editingQuota.filialId)}` : 'Adicionar Novo Cronograma'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="cota-filial" className="block text-sm font-medium text-dark-300 mb-2">Filial *</label>
              <select
                id="cota-filial"
                value={quotaForm.filialId}
                onChange={(e) => setQuotaForm({ ...quotaForm, filialId: e.target.value })}
                className="select-field"
                disabled={!!editingQuota || branches.length === 0}
              >
                <option value="">
                  {branches.length === 0 ? 'Nenhuma filial cadastrada' : '-- Selecione a filial --'}
                </option>
                {(editingQuota ? branches : branchesWithoutQuota).map((b) => {
                  const num = getBranchNumber(b);
                  return (
                    <option key={b.id} value={num}>
                      {branchLabel(branches, num)}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label htmlFor="cota-etiquetas" className="block text-sm font-medium text-dark-300 mb-2">Etiquetas / Quinzena</label>
              <input id="cota-etiquetas" type="number" min="0" value={quotaForm.etiquetasPadrao} onChange={(e) => setQuotaForm({ ...quotaForm, etiquetasPadrao: parseInt(e.target.value) || 0 })} className="input-field" />
            </div>
            <div>
              <label htmlFor="cota-ribbons" className="block text-sm font-medium text-dark-300 mb-2">Ribbons / Quinzena</label>
              <input id="cota-ribbons" type="number" min="0" value={quotaForm.ribbonsPadrao} onChange={(e) => setQuotaForm({ ...quotaForm, ribbonsPadrao: parseInt(e.target.value) || 0 })} className="input-field" />
            </div>
            <div>
              <label htmlFor="cota-dia-envio1" className="block text-sm font-medium text-dark-300 mb-2">1º Envio (Dia do Mês)</label>
              <input id="cota-dia-envio1" type="number" min="1" max="31" value={quotaForm.diaEnvio1} onChange={(e) => setQuotaForm({ ...quotaForm, diaEnvio1: Math.min(31, Math.max(1, parseInt(e.target.value) || 1)) })} className="input-field" />
            </div>
            <div>
              <label htmlFor="cota-dia-envio2" className="block text-sm font-medium text-dark-300 mb-2">2º Envio (Dia do Mês)</label>
              <input id="cota-dia-envio2" type="number" min="1" max="31" value={quotaForm.diaEnvio2} onChange={(e) => setQuotaForm({ ...quotaForm, diaEnvio2: Math.min(31, Math.max(1, parseInt(e.target.value) || 1)) })} className="input-field" />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-5">
            {editingQuota && (
              <button onClick={() => { setEditingQuota(null); setQuotaForm({ filialId: '', etiquetasPadrao: 5, ribbonsPadrao: 2, diaEnvio1: 5, diaEnvio2: 20 }); }} className="btn-secondary">Cancelar</button>
            )}
            <button onClick={handleSaveQuota} disabled={(!quotaForm.filialId && quotaForm.filialId !== 0) || branches.length === 0} className="btn-primary flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed">
              {editingQuota ? 'Salvar Alterações' : 'Adicionar Cronograma'}
            </button>
          </div>
        </div>

        <h3 className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3">
          Cronogramas Cadastrados ({quotas.length})
        </h3>
        <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
          {quotas.length === 0 ? (
            <p className="text-dark-400 text-center py-4">Nenhum cronograma cadastrado</p>
          ) : (
            quotas.map((q) => (
              <div key={q.id} className="flex items-center gap-3 p-3 rounded-lg border border-dark-600 bg-dark-700/50">
                <div className="w-8 h-8 bg-dark-600 rounded-lg flex items-center justify-center shrink-0">
                  <Store className="w-4 h-4 text-dark-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">{branchLabel(branches, q.filialId)}</p>
                  <p className="text-xs text-dark-400 mt-0.5">
                    Dias <span className="text-white">{q.diaEnvio1}</span> e <span className="text-white">{q.diaEnvio2}</span> &bull;
                    <span className="text-primary-400 ml-1">{q.etiquetasPadrao} etiq.</span> &bull;
                    <span className="text-accent-400">{q.ribbonsPadrao} ribbons</span>
                  </p>
                </div>
                <button onClick={() => { setEditingQuota(q); setQuotaForm(q); }} className="btn-secondary px-2.5 py-1.5 shrink-0"><Edit className="w-4 h-4" /></button>
                <button onClick={() => handleDeleteQuota(q.id)} className="btn-danger px-2.5 py-1.5 shrink-0"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))
          )}
        </div>
      </SidePanel>

      <SidePanel
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirmar Envio"
        size="sm"
      >
        {confirmandoEnvio && (
          <div className="space-y-4">
            <p className="text-sm text-dark-300">
              Confirmando o envio previsto para{' '}
              <span className="font-semibold text-white">{branchLabel(branches, confirmandoEnvio.filialId)}</span>.
            </p>
            <div>
              <label htmlFor="confirmar-data" className="block text-sm font-medium text-dark-300 mb-2">Data real do envio *</label>
              <input
                id="confirmar-data"
                type="date"
                value={confirmForm.dataEnvio}
                onChange={(e) => setConfirmForm({ ...confirmForm, dataEnvio: e.target.value })}
                className="input-field"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="confirmar-etiquetas" className="block text-sm font-medium text-dark-300 mb-2">Etiquetas</label>
                <input
                  id="confirmar-etiquetas"
                  type="number"
                  min="0"
                  value={confirmForm.qtdEtiquetas}
                  onChange={(e) => setConfirmForm({ ...confirmForm, qtdEtiquetas: parseInt(e.target.value) || 0 })}
                  className="input-field"
                />
              </div>
              <div>
                <label htmlFor="confirmar-ribbons" className="block text-sm font-medium text-dark-300 mb-2">Ribbons</label>
                <input
                  id="confirmar-ribbons"
                  type="number"
                  min="0"
                  value={confirmForm.qtdRibbons}
                  onChange={(e) => setConfirmForm({ ...confirmForm, qtdRibbons: parseInt(e.target.value) || 0 })}
                  className="input-field"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowConfirmModal(false)} className="btn-secondary">Cancelar</button>
              <button onClick={handleConfirmarEnvio} className="btn-primary">
                <CheckCircle2 className="w-4 h-4" />
                Confirmar Envio
              </button>
            </div>
          </div>
        )}
      </SidePanel>
    </div>
  );
}
