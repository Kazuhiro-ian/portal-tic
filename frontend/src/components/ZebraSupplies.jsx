import { useState, useEffect } from 'react';
import {
  AlertTriangle, Send, Tag, Layers, Settings, Plus, Edit, Trash2, History,
  Building2, CheckCircle2, Store, FileText, Info
} from 'lucide-react';
import { Modal } from './Modal.jsx';
import {
  listarFiliais,
  listarEstoqueItens, atualizarEstoqueItem,
  listarZebraCotas, salvarZebraCota, atualizarZebraCota, deletarZebraCota,
  listarZebraEnvios, salvarZebraEnvio, deletarZebraEnvio
} from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

// Retorna com segurança o número da filial baseado na coluna real do banco (numero_filial)
function getBranchNumber(b) {
  if (!b) return null;
  return b.numero_filial !== undefined && b.numero_filial !== null ? b.numero_filial : (b.numero_loja ?? b.branchNumber ?? b.number ?? b.numero ?? b.id);
}

// Formata o rótulo para exibição unificada: "Loja X - Nome"
function branchLabel(branches, branchNum) {
  if (branchNum === undefined || branchNum === null || branchNum === '') return '-';
  const b = branches.find((br) => getBranchNumber(br)?.toString() === branchNum.toString());
  if (!b) return `Filial ${branchNum}`;
  
  const num = getBranchNumber(b);
  return `Loja ${num} - ${b.name || b.nome || ''}`;
}

export function ZebraSupplies() {
  const { canWrite } = useAuth();
  const [branches, setBranches] = useState([]);
  const [quotas, setQuotas] = useState([]);
  const [distributions, setDistributions] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [dispatchForm, setDispatchForm] = useState({
    filialId: '', // Guarda o NUMERO da filial (numero_filial)
    qtdEtiquetas: 0,
    qtdRibbons: 0,
    dataEnvio: new Date().toISOString().split('T')[0],
    tipoEnvio: 'REGULAR',
    motivoExtra: '',
  });

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Modais
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [editingQuota, setEditingQuota] = useState(null);
  const [quotaForm, setQuotaForm] = useState({
    filialId: '', etiquetasPadrao: 5, ribbonsPadrao: 2, diaEnvio1: 5, diaEnvio2: 20,
  });

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setIsLoading(true);
      const [filiaisData, cotasData, enviosData, estoqueData] = await Promise.all([
        listarFiliais(),
        listarZebraCotas(),
        listarZebraEnvios(),
        listarEstoqueItens()
      ]);
      setBranches(filiaisData);
      setQuotas(cotasData);
      setDistributions(enviosData);
      setStockItems(estoqueData);
    } catch (error) {
      console.error(error);
      setFormError('Erro ao carregar dados do servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const currentDay = today.getDate();

  // Filtragem de estoque considerando categoriaZebra ou nome
  const labelItems = stockItems.filter(i => i.categoriaZebra === 'ETIQUETA' || (!i.categoriaZebra && i.name.toLowerCase().includes('etiqueta')));
  const ribbonItems = stockItems.filter(i => i.categoriaZebra === 'RIBBON' || (!i.categoriaZebra && i.name.toLowerCase().includes('ribbon')));
  
  const totalLabelStock = labelItems.reduce((sum, i) => sum + i.quantity, 0);
  const totalRibbonStock = ribbonItems.reduce((sum, i) => sum + i.quantity, 0);

  // Lógica de Identificação de Envios Pendentes (Quinzena)
  const pendingBranches = quotas.filter((quota) => {
    const enviosRegularesNoMes = distributions.filter(d => {
      const dDate = new Date(d.dataEnvio + 'T00:00:00');
      return d.filialId.toString() === quota.filialId.toString() && 
             d.tipoEnvio === 'REGULAR' && 
             dDate.getMonth() === currentMonth && 
             dDate.getFullYear() === currentYear;
    });

    if (enviosRegularesNoMes.length === 0 && currentDay >= quota.diaEnvio1) return true;
    if (enviosRegularesNoMes.length === 1 && currentDay >= quota.diaEnvio2) return true;
    return false;
  });

  const thisMonthDistributions = distributions.filter((d) => {
    const dDate = new Date(d.dataEnvio + 'T00:00:00');
    return dDate.getMonth() === currentMonth && dDate.getFullYear() === currentYear;
  });

  // Autopreenchimento Dinâmico ao Selecionar Filial pelo Número
  const handleBranchSelect = (branchNumStr) => {
    if (!branchNumStr) {
      setDispatchForm({
        filialId: '', qtdEtiquetas: 0, qtdRibbons: 0,
        dataEnvio: new Date().toISOString().split('T')[0],
        tipoEnvio: 'REGULAR', motivoExtra: '',
      });
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
    setFormSuccess('');
  };

  const handleRegisterDispatch = async () => {
    setFormError('');
    setFormSuccess('');

    if (!dispatchForm.filialId && dispatchForm.filialId !== 0) {
      setFormError('Selecione a filial de destino.'); return;
    }
    if (dispatchForm.qtdEtiquetas <= 0 && dispatchForm.qtdRibbons <= 0) {
      setFormError('Informe ao menos uma quantidade maior que zero.'); return;
    }
    if (dispatchForm.qtdEtiquetas > totalLabelStock) {
      setFormError(`Estoque insuficiente de etiquetas. Disponível: ${totalLabelStock} rolos.`); return;
    }
    if (dispatchForm.qtdRibbons > totalRibbonStock) {
      setFormError(`Estoque insuficiente de ribbons. Disponível: ${totalRibbonStock} unidades.`); return;
    }
    if (dispatchForm.tipoEnvio === 'EXTRA' && !dispatchForm.motivoExtra.trim()) {
      setFormError('Para envios extras, você deve informar obrigatoriamente o motivo.'); return;
    }

    try {
      // 1. Dar baixa no estoque real via API
      let labelRemaining = dispatchForm.qtdEtiquetas;
      let ribbonRemaining = dispatchForm.qtdRibbons;

      for (let item of stockItems) {
        const isLabel = item.categoriaZebra === 'ETIQUETA' || (!item.categoriaZebra && item.name.toLowerCase().includes('etiqueta'));
        const isRibbon = item.categoriaZebra === 'RIBBON' || (!item.categoriaZebra && item.name.toLowerCase().includes('ribbon'));

        if (isLabel && labelRemaining > 0) {
          const deduct = Math.min(item.quantity, labelRemaining);
          labelRemaining -= deduct;
          await atualizarEstoqueItem(item.id, { ...item, quantity: item.quantity - deduct });
        }
        if (isRibbon && ribbonRemaining > 0) {
          const deduct = Math.min(item.quantity, ribbonRemaining);
          ribbonRemaining -= deduct;
          await atualizarEstoqueItem(item.id, { ...item, quantity: item.quantity - deduct });
        }
      }

      // 2. Registrar o envio no banco
      await salvarZebraEnvio(dispatchForm);

      const label = branchLabel(branches, dispatchForm.filialId);
      setFormSuccess(`Envio (${dispatchForm.tipoEnvio}) para "${label}" registrado. Estoque atualizado!`);
      
      setDispatchForm({
        filialId: '', qtdEtiquetas: 0, qtdRibbons: 0,
        dataEnvio: new Date().toISOString().split('T')[0],
        tipoEnvio: 'REGULAR', motivoExtra: '',
      });
      
      await carregarDados(); 
      setTimeout(() => setFormSuccess(''), 5000);

    } catch (error) {
      setFormError(error.message || 'Erro de comunicação ao salvar envio.');
    }
  };

  const handleDeleteDistribution = async (id) => {
    if (confirm('Excluir este registro de envio?\n\nAtenção: O estoque NÃO será restaurado automaticamente.')) {
      try {
        await deletarZebraEnvio(id);
        await carregarDados();
      } catch (error) {
        setFormError('Erro ao excluir registro.');
      }
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
      alert(error.message || 'Erro ao salvar cota.');
    }
  };

  const handleDeleteQuota = async (id) => {
    if (confirm('Excluir esta cota de filial?')) {
      try {
        await deletarZebraCota(id);
        await carregarDados();
      } catch (error) {
        alert('Erro ao excluir cota.');
      }
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Logística de Insumos Zebra</h1>
          <p className="text-dark-400 mt-1">
            Distribuição quinzenal de etiquetas e ribbons
          </p>
        </div>
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

      {/* PAINEL INTELIGENTE DE ALERTAS */}
      {!isLoading && pendingBranches.length > 0 ? (
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
        !isLoading && quotas.length > 0 && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-primary-500/10 border border-primary-500/30">
            <CheckCircle2 className="w-5 h-5 text-primary-400 shrink-0" />
            <p className="text-sm text-primary-300 font-medium">
              Todos os envios da quinzena atual estão em dia!
            </p>
          </div>
        )
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {canWrite && (
        <div className="lg:col-span-3 card">
          <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
            <Send className="w-5 h-5 text-primary-400" />
            Registrar Saída de Material
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Filial de Destino *</label>
              <select
                value={dispatchForm.filialId}
                onChange={(e) => handleBranchSelect(e.target.value)}
                className="select-field"
                disabled={isLoading || branches.length === 0}
              >
                <option value="">
                  {branches.length === 0 ? 'Nenhuma filial cadastrada' : '-- Selecione a filial --'}
                </option>
                {branches.map((b) => {
                  const num = getBranchNumber(b);
                  return (
                    <option key={b.id} value={num}>
                      {branchLabel(branches, num)}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Tipo de Envio</label>
                <select
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
                <label className="block text-sm font-medium text-dark-300 mb-2">Data do Envio *</label>
                <input
                  type="date"
                  value={dispatchForm.dataEnvio}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, dataEnvio: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>

            {/* Expansão para Motivo Extra */}
            {dispatchForm.tipoEnvio === 'EXTRA' && (
              <div className="p-3 bg-accent-500/10 border border-accent-500/30 rounded-lg animate-fade-in">
                <label className="block text-sm font-medium text-accent-300 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Motivo do Envio Extra *
                </label>
                <input
                  type="text"
                  value={dispatchForm.motivoExtra}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, motivoExtra: e.target.value })}
                  className="input-field bg-dark-800 border-accent-500/30 focus:border-accent-500 text-sm"
                  placeholder="Ex: Impressora danificou fita, alto volume de impressão..."
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 border-t border-dark-600 pt-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2 flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-primary-400" /> Etiquetas (rolos)
                </label>
                <input
                  type="number"
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
                <label className="block text-sm font-medium text-dark-300 mb-2 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-accent-400" /> Ribbons (unid.)
                </label>
                <input
                  type="number"
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

            {formError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-sm text-red-300">{formError}</p>
              </div>
            )}
            {formSuccess && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary-500/10 border border-primary-500/30">
                <CheckCircle2 className="w-4 h-4 text-primary-400 shrink-0" />
                <p className="text-sm text-primary-300">{formSuccess}</p>
              </div>
            )}

            <button
              onClick={handleRegisterDispatch}
              disabled={isLoading || (!dispatchForm.filialId && dispatchForm.filialId !== 0) || branches.length === 0}
              className="btn-primary w-full justify-center py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              Confirmar e Dar Baixa no Estoque
            </button>
          </div>
        </div>
        )}

        <div className={canWrite ? 'lg:col-span-2 space-y-4' : 'lg:col-span-5 grid grid-cols-1 md:grid-cols-2 gap-4'}>
          <div className="card">
            <h3 className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-4">
              Visão Geral do Mês
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-dark-700/50">
                <span className="text-sm text-dark-300">Total de Entregas</span>
                <span className="font-bold text-sm text-white">{thisMonthDistributions.length}</span>
              </div>
              <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-dark-700/50">
                <span className="text-sm text-dark-300">Etiquetas Consumidas</span>
                <span className="font-bold text-sm text-primary-400">
                  {thisMonthDistributions.reduce((s, d) => s + d.qtdEtiquetas, 0)} rolos
                </span>
              </div>
              <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-dark-700/50">
                <span className="text-sm text-dark-300">Ribbons Consumidos</span>
                <span className="font-bold text-sm text-accent-400">
                  {thisMonthDistributions.reduce((s, d) => s + d.qtdRibbons, 0)} unid.
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

      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-primary-400" />
            Histórico de Envios
          </h2>
          <span className="badge badge-info">{distributions.length} registros</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Data</th>
                <th className="table-header">Tipo</th>
                <th className="table-header">Filial</th>
                <th className="table-header text-center">Etiquetas</th>
                <th className="table-header text-center">Ribbons</th>
                <th className="table-header text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-8 text-dark-400">Carregando histórico...</td></tr>
              ) : distributions.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-dark-400">Nenhum envio registrado.</td></tr>
              ) : (
                distributions.map((d) => {
                  const dDate = new Date(d.dataEnvio + 'T00:00:00');
                  const isExtra = d.tipoEnvio === 'EXTRA';
                  
                  return (
                    <tr key={d.id} className="hover:bg-dark-700/30 transition-colors">
                      <td className="table-cell whitespace-nowrap">
                        <span className="text-white">{dDate.toLocaleDateString('pt-BR')}</span>
                      </td>
                      <td className="table-cell">
                        {isExtra ? (
                           <div className="flex items-center gap-1.5 group relative cursor-help">
                             <span className="badge bg-accent-500/10 text-accent-400 border-accent-500/30">Extra</span>
                             <Info className="w-4 h-4 text-dark-400 group-hover:text-accent-400 transition-colors" />
                             <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2 bg-dark-800 border border-dark-600 rounded-lg shadow-xl text-xs text-white opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 text-center">
                               {d.motivoExtra}
                             </div>
                           </div>
                        ) : (
                           <span className="badge badge-success">Regular</span>
                        )}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-dark-400 shrink-0" />
                          <span className="font-medium text-white">{branchLabel(branches, d.filialId)}</span>
                        </div>
                      </td>
                      <td className="table-cell text-center">
                        <span className="inline-flex items-center gap-1 font-semibold text-primary-400">
                          {d.qtdEtiquetas > 0 ? <><Tag className="w-3.5 h-3.5" />{d.qtdEtiquetas}</> : <span className="text-dark-500">—</span>}
                        </span>
                      </td>
                      <td className="table-cell text-center">
                        <span className="inline-flex items-center gap-1 font-semibold text-accent-400">
                          {d.qtdRibbons > 0 ? <><Layers className="w-3.5 h-3.5" />{d.qtdRibbons}</> : <span className="text-dark-500">—</span>}
                        </span>
                      </td>
                      <td className="table-cell text-right">
                        {canWrite && (
                          <button onClick={() => handleDeleteDistribution(d.id)} className="btn-danger px-3 py-1.5" title="Excluir">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
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
              <label className="block text-sm font-medium text-dark-300 mb-2">Filial *</label>
              <select
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
              <label className="block text-sm font-medium text-dark-300 mb-2">Etiquetas / Quinzena</label>
              <input type="number" min="0" value={quotaForm.etiquetasPadrao} onChange={(e) => setQuotaForm({ ...quotaForm, etiquetasPadrao: parseInt(e.target.value) || 0 })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Ribbons / Quinzena</label>
              <input type="number" min="0" value={quotaForm.ribbonsPadrao} onChange={(e) => setQuotaForm({ ...quotaForm, ribbonsPadrao: parseInt(e.target.value) || 0 })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">1º Envio (Dia do Mês)</label>
              <input type="number" min="1" max="31" value={quotaForm.diaEnvio1} onChange={(e) => setQuotaForm({ ...quotaForm, diaEnvio1: Math.min(31, Math.max(1, parseInt(e.target.value) || 1)) })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">2º Envio (Dia do Mês)</label>
              <input type="number" min="1" max="31" value={quotaForm.diaEnvio2} onChange={(e) => setQuotaForm({ ...quotaForm, diaEnvio2: Math.min(31, Math.max(1, parseInt(e.target.value) || 1)) })} className="input-field" />
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
      </Modal>
    </div>
  );
}