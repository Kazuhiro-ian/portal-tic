import { useState } from 'react';
import {
  AlertTriangle,
  Send,
  Tag,
  Layers,
  Settings,
  Plus,
  Edit,
  Trash2,
  History,
  Building2,
  CheckCircle2,
  Store,
} from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { Modal } from './Modal.jsx';

function branchLabel(branches, branchId) {
  const b = branches.find((br) => br.id === branchId);
  return b ? `Loja ${b.branchNumber} - ${b.name}` : branchId;
}

function getPendingBranches(quotas, distributions) {
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  return quotas.filter((quota) => {
    if (currentDay < quota.dispatchDay) return false;
    return !distributions.some((d) => {
      const dDate = new Date(d.date + 'T00:00:00');
      return (
        d.branchId === quota.branchId &&
        dDate.getMonth() === currentMonth &&
        dDate.getFullYear() === currentYear
      );
    });
  });
}

export function ZebraSupplies() {
  const [branches] = useLocalStorage('ithub_branches', []);
  const [quotas, setQuotas] = useLocalStorage('ithub_branch_quotas', []);
  const [distributions, setDistributions] = useLocalStorage('ithub_zebra_distributions', []);
  const [stockItems, setStockItems] = useLocalStorage('ithub_stock', []);

  const [dispatchForm, setDispatchForm] = useState({
    branchId: '',
    labelQuantity: 0,
    ribbonQuantity: 0,
    date: new Date().toISOString().split('T')[0],
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [editingQuota, setEditingQuota] = useState(null);
  const [quotaForm, setQuotaForm] = useState({
    branchId: '',
    defaultLabelQty: 5,
    defaultRibbonQty: 2,
    dispatchDay: 1,
  });

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const labelItems = stockItems.filter(
    (i) =>
      i.name.toLowerCase().includes('etiqueta') ||
      (i.subcategory && i.subcategory.toLowerCase().includes('etiqueta'))
  );
  const ribbonItems = stockItems.filter(
    (i) =>
      i.name.toLowerCase().includes('ribbon') ||
      (i.subcategory && i.subcategory.toLowerCase().includes('ribbon'))
  );
  const totalLabelStock = labelItems.reduce((sum, i) => sum + i.quantity, 0);
  const totalRibbonStock = ribbonItems.reduce((sum, i) => sum + i.quantity, 0);

  const pendingBranches = getPendingBranches(quotas, distributions);

  const thisMonthDistributions = distributions.filter((d) => {
    const dDate = new Date(d.date + 'T00:00:00');
    return dDate.getMonth() === currentMonth && dDate.getFullYear() === currentYear;
  });

  const sortedDistributions = [...distributions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const handleBranchSelect = (branchId) => {
    const quota = quotas.find((q) => q.branchId === branchId);
    setDispatchForm((prev) => ({
      ...prev,
      branchId,
      labelQuantity: quota ? quota.defaultLabelQty : 0,
      ribbonQuantity: quota ? quota.defaultRibbonQty : 0,
    }));
    setFormError('');
    setFormSuccess('');
  };

  const handleRegisterDispatch = () => {
    if (!dispatchForm.branchId) {
      setFormError('Selecione a filial de destino.');
      return;
    }
    if (dispatchForm.labelQuantity <= 0 && dispatchForm.ribbonQuantity <= 0) {
      setFormError('Informe ao menos uma quantidade maior que zero.');
      return;
    }
    if (dispatchForm.labelQuantity > 0 && dispatchForm.labelQuantity > totalLabelStock) {
      setFormError(`Estoque insuficiente de etiquetas. Disponivel: ${totalLabelStock} rolos.`);
      return;
    }
    if (dispatchForm.ribbonQuantity > 0 && dispatchForm.ribbonQuantity > totalRibbonStock) {
      setFormError(`Estoque insuficiente de ribbons. Disponivel: ${totalRibbonStock} unidades.`);
      return;
    }
    if (!dispatchForm.date) {
      setFormError('Informe a data do envio.');
      return;
    }

    let labelRemaining = dispatchForm.labelQuantity;
    let ribbonRemaining = dispatchForm.ribbonQuantity;

    const updatedStock = stockItems.map((item) => {
      const isLabel =
        item.name.toLowerCase().includes('etiqueta') ||
        (item.subcategory && item.subcategory.toLowerCase().includes('etiqueta'));
      const isRibbon =
        item.name.toLowerCase().includes('ribbon') ||
        (item.subcategory && item.subcategory.toLowerCase().includes('ribbon'));

      if (isLabel && labelRemaining > 0) {
        const deduct = Math.min(item.quantity, labelRemaining);
        labelRemaining -= deduct;
        return { ...item, quantity: item.quantity - deduct };
      }
      if (isRibbon && ribbonRemaining > 0) {
        const deduct = Math.min(item.quantity, ribbonRemaining);
        ribbonRemaining -= deduct;
        return { ...item, quantity: item.quantity - deduct };
      }
      return item;
    });

    setStockItems(updatedStock);

    const newDist = {
      id: Date.now().toString(),
      branchId: dispatchForm.branchId,
      labelQuantity: dispatchForm.labelQuantity,
      ribbonQuantity: dispatchForm.ribbonQuantity,
      date: dispatchForm.date,
    };
    setDistributions([newDist, ...distributions]);

    const label = branchLabel(branches, dispatchForm.branchId);
    setDispatchForm({
      branchId: '',
      labelQuantity: 0,
      ribbonQuantity: 0,
      date: new Date().toISOString().split('T')[0],
    });
    setFormError('');
    setFormSuccess(`Envio para "${label}" registrado com sucesso. Estoque atualizado.`);
    setTimeout(() => setFormSuccess(''), 4000);
  };

  const handleDeleteDistribution = (id) => {
    if (
      confirm(
        'Excluir este registro de envio?\n\nAtencao: o estoque NAO sera restaurado automaticamente.'
      )
    ) {
      setDistributions(distributions.filter((d) => d.id !== id));
    }
  };

  const openQuotaModal = () => {
    setEditingQuota(null);
    setQuotaForm({ branchId: '', defaultLabelQty: 5, defaultRibbonQty: 2, dispatchDay: 1 });
    setShowQuotaModal(true);
  };

  const handleEditQuota = (quota) => {
    setEditingQuota(quota);
    setQuotaForm({
      branchId: quota.branchId,
      defaultLabelQty: quota.defaultLabelQty,
      defaultRibbonQty: quota.defaultRibbonQty,
      dispatchDay: quota.dispatchDay,
    });
  };

  const handleSaveQuota = () => {
    if (!quotaForm.branchId) return;

    const alreadyHasQuota = quotas.some(
      (q) => q.branchId === quotaForm.branchId && (!editingQuota || q.id !== editingQuota.id)
    );
    if (alreadyHasQuota) return;

    if (editingQuota) {
      setQuotas(quotas.map((q) => (q.id === editingQuota.id ? { ...q, ...quotaForm } : q)));
    } else {
      setQuotas([...quotas, { id: Date.now().toString(), ...quotaForm }]);
    }
    setEditingQuota(null);
    setQuotaForm({ branchId: '', defaultLabelQty: 5, defaultRibbonQty: 2, dispatchDay: 1 });
  };

  const handleDeleteQuota = (id) => {
    if (confirm('Excluir esta cota de filial?')) {
      setQuotas(quotas.filter((q) => q.id !== id));
    }
  };

  const branchesWithoutQuota = branches.filter(
    (b) => !quotas.some((q) => q.branchId === b.id) || editingQuota !== null
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Controle de Insumos Zebra</h1>
          <p className="text-dark-400 mt-1">
            Distribuicao de etiquetas e ribbons para filiais
          </p>
        </div>
        <button onClick={openQuotaModal} className="btn-secondary">
          <Settings className="w-4 h-4" />
          Gerenciar Cotas
        </button>
      </div>

      {branches.length === 0 && (
        <div className="flex items-start gap-4 p-4 rounded-xl bg-dark-700/50 border border-dark-600">
          <Store className="w-5 h-5 text-dark-400 shrink-0 mt-0.5" />
          <p className="text-sm text-dark-300">
            Nenhuma filial cadastrada. Acesse{' '}
            <span className="font-semibold text-white">Gestao de Filiais</span> para cadastrar as
            lojas antes de registrar envios.
          </p>
        </div>
      )}

      {pendingBranches.length > 0 ? (
        <div className="flex items-start gap-4 p-4 rounded-xl bg-accent-500/10 border border-accent-500/30">
          <div className="w-10 h-10 bg-accent-500/20 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5 text-accent-400" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-accent-300">
              {pendingBranches.length}{' '}
              {pendingBranches.length === 1 ? 'envio pendente' : 'envios pendentes'} este mes
            </p>
            <p className="text-sm text-dark-300 mt-1">
              Atencao: Enviar insumos para:{' '}
              <span className="font-semibold text-white">
                {pendingBranches.map((b) => branchLabel(branches, b.branchId)).join(', ')}
              </span>
            </p>
          </div>
        </div>
      ) : (
        quotas.length > 0 && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-primary-500/10 border border-primary-500/30">
            <CheckCircle2 className="w-5 h-5 text-primary-400 shrink-0" />
            <p className="text-sm text-primary-300 font-medium">
              Todos os envios do mes estao em dia!
            </p>
          </div>
        )
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 card">
          <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
            <Send className="w-5 h-5 text-primary-400" />
            Registrar Novo Envio
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Filial de Destino *
              </label>
              <select
                value={dispatchForm.branchId}
                onChange={(e) => handleBranchSelect(e.target.value)}
                className="select-field"
                disabled={branches.length === 0}
              >
                <option value="">
                  {branches.length === 0
                    ? 'Nenhuma filial cadastrada'
                    : '-- Selecione a filial --'}
                </option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    Loja {b.branchNumber} - {b.name}
                  </option>
                ))}
              </select>
              {dispatchForm.branchId &&
                !quotas.some((q) => q.branchId === dispatchForm.branchId) && (
                  <p className="text-xs text-accent-400 mt-1.5">
                    Esta filial nao possui cota cadastrada. Os valores nao serao preenchidos automaticamente.
                  </p>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  <span className="flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-primary-400" />
                    Etiquetas (rolos)
                  </span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={dispatchForm.labelQuantity}
                  onChange={(e) => {
                    setDispatchForm({
                      ...dispatchForm,
                      labelQuantity: parseInt(e.target.value) || 0,
                    });
                    setFormError('');
                  }}
                  className="input-field"
                />
                <p className="text-xs mt-1.5">
                  Disponivel:{' '}
                  <span
                    className={
                      totalLabelStock === 0
                        ? 'text-red-400 font-semibold'
                        : totalLabelStock <= 5
                          ? 'text-accent-400 font-semibold'
                          : 'text-primary-400 font-semibold'
                    }
                  >
                    {totalLabelStock} rolos
                  </span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-accent-400" />
                    Ribbons (unid.)
                  </span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={dispatchForm.ribbonQuantity}
                  onChange={(e) => {
                    setDispatchForm({
                      ...dispatchForm,
                      ribbonQuantity: parseInt(e.target.value) || 0,
                    });
                    setFormError('');
                  }}
                  className="input-field"
                />
                <p className="text-xs mt-1.5">
                  Disponivel:{' '}
                  <span
                    className={
                      totalRibbonStock === 0
                        ? 'text-red-400 font-semibold'
                        : totalRibbonStock <= 3
                          ? 'text-accent-400 font-semibold'
                          : 'text-primary-400 font-semibold'
                    }
                  >
                    {totalRibbonStock} unid.
                  </span>
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Data do Envio *
              </label>
              <input
                type="date"
                value={dispatchForm.date}
                onChange={(e) => setDispatchForm({ ...dispatchForm, date: e.target.value })}
                className="input-field"
              />
            </div>

            {formError && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-300">{formError}</p>
              </div>
            )}

            {formSuccess && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-primary-500/10 border border-primary-500/30">
                <CheckCircle2 className="w-4 h-4 text-primary-400 shrink-0 mt-0.5" />
                <p className="text-sm text-primary-300">{formSuccess}</p>
              </div>
            )}

            <button
              onClick={handleRegisterDispatch}
              disabled={branches.length === 0}
              className="btn-primary w-full justify-center py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              Registrar Envio e Dar Baixa no Estoque
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="card">
            <h3 className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-4">
              Resumo do Mes
            </h3>
            <div className="space-y-2">
              {[
                {
                  label: 'Envios realizados',
                  value: thisMonthDistributions.length,
                  color: 'text-white',
                },
                {
                  label: 'Etiquetas enviadas',
                  value: `${thisMonthDistributions.reduce((s, d) => s + d.labelQuantity, 0)} rolos`,
                  color: 'text-primary-400',
                },
                {
                  label: 'Ribbons enviados',
                  value: `${thisMonthDistributions.reduce((s, d) => s + d.ribbonQuantity, 0)} unid.`,
                  color: 'text-accent-400',
                },
                {
                  label: 'Pendentes',
                  value: pendingBranches.length,
                  color: pendingBranches.length > 0 ? 'text-red-400' : 'text-primary-400',
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-dark-700/50"
                >
                  <span className="text-sm text-dark-300">{stat.label}</span>
                  <span className={`font-bold text-sm ${stat.color}`}>{stat.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-4">
              Estoque Zebra
            </h3>
            {labelItems.length === 0 && ribbonItems.length === 0 ? (
              <p className="text-dark-400 text-sm text-center py-4">
                Nenhum item Zebra cadastrado no estoque.
              </p>
            ) : (
              <div className="space-y-2">
                {[...labelItems, ...ribbonItems].map((item) => {
                  const isCritical = item.quantity <= item.minQuantity;
                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-lg border transition-colors ${
                        isCritical
                          ? 'bg-red-500/10 border-red-500/30'
                          : 'bg-dark-700/50 border-dark-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm text-white font-medium truncate">{item.name}</p>
                        <span
                          className={`font-bold text-base shrink-0 ${
                            isCritical ? 'text-red-400' : 'text-white'
                          }`}
                        >
                          {item.quantity}
                        </span>
                      </div>
                      <p className="text-xs text-dark-400 mt-0.5">
                        Min: {item.minQuantity} &bull; {item.location}
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
            Historico de Envios
          </h2>
          <span className="badge badge-info">{distributions.length} registros</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Data</th>
                <th className="table-header">Filial</th>
                <th className="table-header text-center">
                  <span className="flex items-center justify-center gap-1">
                    <Tag className="w-3.5 h-3.5" />
                    Etiquetas
                  </span>
                </th>
                <th className="table-header text-center">
                  <span className="flex items-center justify-center gap-1">
                    <Layers className="w-3.5 h-3.5" />
                    Ribbons
                  </span>
                </th>
                <th className="table-header text-right">Acao</th>
              </tr>
            </thead>
            <tbody>
              {sortedDistributions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-dark-400">
                    Nenhum envio registrado
                  </td>
                </tr>
              ) : (
                sortedDistributions.map((d) => {
                  const dDate = new Date(d.date + 'T00:00:00');
                  const isCurrentMonth =
                    dDate.getMonth() === currentMonth && dDate.getFullYear() === currentYear;
                  const label = branchLabel(branches, d.branchId);
                  return (
                    <tr
                      key={d.id}
                      className={`hover:bg-dark-700/30 transition-colors ${
                        isCurrentMonth ? 'bg-primary-500/5' : ''
                      }`}
                    >
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <span className="text-white">
                            {dDate.toLocaleDateString('pt-BR')}
                          </span>
                          {isCurrentMonth && (
                            <span className="badge badge-success">Este mes</span>
                          )}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-dark-400 shrink-0" />
                          <span className="font-medium text-white">{label}</span>
                        </div>
                      </td>
                      <td className="table-cell text-center">
                        <span className="inline-flex items-center gap-1 font-semibold text-primary-400">
                          {d.labelQuantity > 0 ? (
                            <>
                              <Tag className="w-3.5 h-3.5" />
                              {d.labelQuantity}
                            </>
                          ) : (
                            <span className="text-dark-500">—</span>
                          )}
                        </span>
                      </td>
                      <td className="table-cell text-center">
                        <span className="inline-flex items-center gap-1 font-semibold text-accent-400">
                          {d.ribbonQuantity > 0 ? (
                            <>
                              <Layers className="w-3.5 h-3.5" />
                              {d.ribbonQuantity}
                            </>
                          ) : (
                            <span className="text-dark-500">—</span>
                          )}
                        </span>
                      </td>
                      <td className="table-cell text-right">
                        <button
                          onClick={() => handleDeleteDistribution(d.id)}
                          className="btn-danger px-3 py-1.5"
                          title="Excluir registro"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
        onClose={() => {
          setShowQuotaModal(false);
          setEditingQuota(null);
          setQuotaForm({ branchId: '', defaultLabelQty: 5, defaultRibbonQty: 2, dispatchDay: 1 });
        }}
        title="Gerenciar Cotas das Filiais"
        size="lg"
      >
        {branches.length === 0 ? (
          <div className="text-center py-8">
            <Store className="w-10 h-10 text-dark-600 mx-auto mb-3" />
            <p className="text-dark-400">
              Cadastre filiais em <span className="font-semibold text-white">Gestao de Filiais</span> para definir cotas.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-5 p-4 rounded-xl bg-dark-700/50 border border-dark-600">
              <h3 className="text-sm font-semibold text-white mb-4">
                {editingQuota
                  ? `Editando: ${branchLabel(branches, editingQuota.branchId)}`
                  : 'Adicionar Nova Cota'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Filial *
                  </label>
                  <select
                    value={quotaForm.branchId}
                    onChange={(e) => setQuotaForm({ ...quotaForm, branchId: e.target.value })}
                    className="select-field"
                    disabled={!!editingQuota}
                  >
                    <option value="">-- Selecione a filial --</option>
                    {(editingQuota
                      ? branches
                      : branches.filter((b) => !quotas.some((q) => q.branchId === b.id))
                    ).map((b) => (
                      <option key={b.id} value={b.id}>
                        Loja {b.branchNumber} - {b.name}
                      </option>
                    ))}
                  </select>
                  {!editingQuota && branchesWithoutQuota.length === 0 && (
                    <p className="text-xs text-accent-400 mt-1.5">
                      Todas as filiais ja possuem cota cadastrada.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Etiquetas Padrao (rolos)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={quotaForm.defaultLabelQty}
                    onChange={(e) =>
                      setQuotaForm({
                        ...quotaForm,
                        defaultLabelQty: parseInt(e.target.value) || 0,
                      })
                    }
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Ribbons Padrao (unid.)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={quotaForm.defaultRibbonQty}
                    onChange={(e) =>
                      setQuotaForm({
                        ...quotaForm,
                        defaultRibbonQty: parseInt(e.target.value) || 0,
                      })
                    }
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Dia do Mes para Envio (1–31)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={quotaForm.dispatchDay}
                    onChange={(e) =>
                      setQuotaForm({
                        ...quotaForm,
                        dispatchDay: Math.min(31, Math.max(1, parseInt(e.target.value) || 1)),
                      })
                    }
                    className="input-field"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 mt-4">
                {editingQuota && (
                  <button
                    onClick={() => {
                      setEditingQuota(null);
                      setQuotaForm({
                        branchId: '',
                        defaultLabelQty: 5,
                        defaultRibbonQty: 2,
                        dispatchDay: 1,
                      });
                    }}
                    className="btn-secondary"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  onClick={handleSaveQuota}
                  disabled={!quotaForm.branchId}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingQuota ? (
                    'Salvar Alteracoes'
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Adicionar Cota
                    </>
                  )}
                </button>
              </div>
            </div>

            <h3 className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3">
              Cotas Cadastradas ({quotas.length})
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
              {quotas.length === 0 ? (
                <p className="text-dark-400 text-center py-8">Nenhuma cota cadastrada</p>
              ) : (
                quotas.map((q) => (
                  <div
                    key={q.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      editingQuota?.id === q.id
                        ? 'border-primary-500/50 bg-primary-500/10'
                        : 'border-dark-600 bg-dark-700/50'
                    }`}
                  >
                    <div className="w-8 h-8 bg-dark-600 rounded-lg flex items-center justify-center shrink-0">
                      <Store className="w-4 h-4 text-dark-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">
                        {branchLabel(branches, q.branchId)}
                      </p>
                      <p className="text-xs text-dark-400">
                        Dia {q.dispatchDay} &bull;{' '}
                        <span className="text-primary-400">{q.defaultLabelQty} etiquetas</span>{' '}
                        &bull;{' '}
                        <span className="text-accent-400">{q.defaultRibbonQty} ribbons</span>
                      </p>
                    </div>
                    <button
                      onClick={() => handleEditQuota(q)}
                      className="btn-secondary px-2.5 py-1.5 shrink-0"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteQuota(q.id)}
                      className="btn-danger px-2.5 py-1.5 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
