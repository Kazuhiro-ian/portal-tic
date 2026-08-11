import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus, Edit, Trash2, Sparkles, Save, AlertTriangle, AlertCircle,
  ClipboardList, CalendarDays, Lock, FileSpreadsheet,
} from 'lucide-react';
import { Modal } from './Modal.jsx';
import { InventoryResultPanel } from './InventoryResultPanel.jsx';
import {
  listarFiliais, listarInventarios, salvarInventario, atualizarInventario,
  deletarInventario, gerarPlanoInventario, salvarPlanoInventario, listarConflitosRecebimento,
} from '../services/api.js';
import { toISO, formatarBR, limitesDoMes, diasNoMes } from '../utils/datas.js';
import { grupoLabels, grupoBadge, MOTIVOS, STATUS_INVENTARIO as STATUS } from '../utils/qualidade.js';
import { useConfirm } from '../hooks/useConfirm.jsx';

const emptyForm = {
  filialId: '', data: '', horarioInicio: '', horarioFim: '', status: 'PLANEJADO',
  responsavel: '', observacao: '', cienteConflitoRecebimento: false,
};

export function InventoryPlan({ ano, mes, canWrite, showToast, conflitosExternos }) {
  const { confirmar, dialogoConfirmacao } = useConfirm();
  const [filiais, setFiliais] = useState([]);
  const [inventarios, setInventarios] = useState([]);
  const [conflitos, setConflitos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [proposta, setProposta] = useState(null); // { itens, avisos } — ainda não salva
  const [gerando, setGerando] = useState(false);
  const [salvandoPlano, setSalvandoPlano] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [conflitoPendente, setConflitoPendente] = useState(false);

  // Inventário cujo resultado (relatório do Protheus) está aberto para importar/consultar.
  const [inventarioResultado, setInventarioResultado] = useState(null);

  const filialPorId = useMemo(
    () => new Map(filiais.map((f) => [f.id, f])),
    [filiais],
  );

  const nomeFilial = useCallback(
    (id) => {
      const f = filialPorId.get(id);
      return f ? `${f.numeroFilial} — ${f.nome}` : `#${id} (filial removida)`;
    },
    [filialPorId],
  );

  const carregar = useCallback(async () => {
    try {
      setIsLoading(true);
      const { inicio, fim } = limitesDoMes(ano, mes);
      const [dadosFiliais, dadosInv, dadosConflitos] = await Promise.all([
        listarFiliais(),
        listarInventarios(inicio, fim),
        listarConflitosRecebimento(inicio, fim),
      ]);
      setFiliais(dadosFiliais.sort((a, b) => a.numeroFilial - b.numeroFilial));
      setInventarios(dadosInv);
      setConflitos(dadosConflitos);
    } catch (error) {
      showToast(error.message || 'Erro ao carregar o plano de inventário.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [ano, mes, showToast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // O calendário de recebimento mudou em outra aba: reflete os conflitos sem recarregar tudo.
  useEffect(() => {
    if (conflitosExternos) setConflitos(conflitosExternos);
  }, [conflitosExternos]);

  // Trocar de mês invalida a proposta em tela.
  useEffect(() => {
    setProposta(null);
  }, [ano, mes]);

  // --- Geração e salvamento do plano ---

  const handleGerar = async () => {
    setGerando(true);
    try {
      const resp = await gerarPlanoInventario(ano, mes);
      setProposta(resp);
      showToast(`Proposta gerada para ${resp.itens.length} filiais. Revise antes de salvar.`);
    } catch (error) {
      showToast(error.message || 'Erro ao gerar o plano.', 'error');
    } finally {
      setGerando(false);
    }
  };

  const alterarDataProposta = (filialId, novaData) => {
    setProposta((atual) => ({
      ...atual,
      itens: atual.itens.map((i) =>
        i.filialId === filialId ? { ...i, dataSugerida: novaData } : i,
      ),
    }));
  };

  const handleSalvarPlano = async () => {
    const itens = proposta.itens
      .filter((i) => i.editavel && i.dataSugerida)
      .map((i) => ({
        filialId: i.filialId,
        data: i.dataSugerida,
        diaPreferencial: i.diaPreferencial,
      }));

    if (itens.length === 0) {
      showToast('Nenhum item do plano pode ser salvo.', 'error');
      return;
    }

    setSalvandoPlano(true);
    try {
      const resp = await salvarPlanoInventario({ ano, mes, itens });
      const partes = [`${resp.criados} criados`, `${resp.atualizados} atualizados`];
      if (resp.ignoradosRealizados > 0) {
        partes.push(`${resp.ignoradosRealizados} ignorados (já realizados)`);
      }
      showToast(`Plano salvo: ${partes.join(', ')}.`);
      setProposta(null);
      await carregar();
    } catch (error) {
      showToast(error.message || 'Erro ao salvar o plano.', 'error');
    } finally {
      setSalvandoPlano(false);
    }
  };

  // --- CRUD manual ---

  const openNew = () => {
    setEditando(null);
    setForm({ ...emptyForm, data: toISO(new Date(ano, mes - 1, 1)) });
    setFormError('');
    setConflitoPendente(false);
    setShowModal(true);
  };

  const openEdit = (inv) => {
    setEditando(inv);
    setForm({
      filialId: String(inv.filialId),
      data: inv.data,
      horarioInicio: inv.horarioInicio || '',
      horarioFim: inv.horarioFim || '',
      status: inv.status,
      responsavel: inv.responsavel || '',
      observacao: inv.observacao || '',
      cienteConflitoRecebimento: Boolean(inv.cienteConflitoRecebimento),
    });
    setFormError('');
    setConflitoPendente(Boolean(inv.cienteConflitoRecebimento));
    setShowModal(true);
  };

  // Filial ou data mudaram: a ciência dada para a combinação anterior não vale mais.
  const alterarFilialOuData = (campo, valor) => {
    setForm((atual) => ({ ...atual, [campo]: valor, cienteConflitoRecebimento: false }));
    setConflitoPendente(false);
    setFormError('');
  };

  const handleSave = async () => {
    if (!form.filialId) {
      setFormError('Selecione a filial.');
      return;
    }
    if (!form.data) {
      setFormError('Informe a data do inventário.');
      return;
    }
    if (conflitoPendente && (!form.cienteConflitoRecebimento || !form.observacao.trim())) {
      setFormError('Marque "Estou ciente do conflito" e informe uma observação para confirmar o agendamento mesmo assim.');
      return;
    }

    try {
      const payload = {
        filialId: Number(form.filialId),
        data: form.data,
        horarioInicio: form.horarioInicio || null,
        horarioFim: form.horarioFim || null,
        status: form.status,
        responsavel: form.responsavel.trim() || null,
        observacao: form.observacao.trim() || null,
        cienteConflitoRecebimento: form.cienteConflitoRecebimento,
      };

      if (editando) {
        // Preserva a âncora do dia-do-mês ao editar.
        await atualizarInventario(editando.id, { ...payload, diaPreferencial: editando.diaPreferencial });
        showToast('Inventário atualizado.');
      } else {
        await salvarInventario(payload);
        showToast('Inventário agendado.');
      }
      setShowModal(false);
      await carregar();
    } catch (error) {
      // O backend devolve a regra violada em texto claro — mostrar tal e qual.
      setFormError(error.message || 'Erro ao salvar o inventário.');
      if (error.codigo === 'CONFLITO_RECEBIMENTO') {
        setConflitoPendente(true);
      }
    }
  };

  const handleDelete = async (inv) => {
    const confirmado = await confirmar({
      titulo: 'Excluir inventário',
      mensagem: `Excluir o inventário da filial "${nomeFilial(inv.filialId)}" em ${formatarBR(inv.data)}?`,
    });
    if (!confirmado) return;

    try {
      await deletarInventario(inv.id);
      showToast('Inventário excluído.');
      await carregar();
    } catch (error) {
      showToast(error.message || 'Erro ao excluir o inventário.', 'error');
    }
  };

  // --- Visão de calendário ---

  const porData = useMemo(() => {
    const mapa = new Map();
    for (const inv of inventarios) {
      if (inv.status === 'CANCELADO') continue;
      if (!mapa.has(inv.data)) mapa.set(inv.data, []);
      mapa.get(inv.data).push(inv);
    }
    return mapa;
  }, [inventarios]);

  const total = diasNoMes(ano, mes);
  const primeiroDiaSemana = new Date(ano, mes - 1, 1).getDay();
  const celulas = [
    ...Array(primeiroDiaSemana).fill(null),
    ...Array.from({ length: total }, (_, i) => new Date(ano, mes - 1, i + 1)),
  ];

  const semGrupo = filiais.filter((f) => !f.grupoRecebimento);

  return (
    <div className="space-y-6">
      {dialogoConfirmacao}

      {/* Avisos */}
      {semGrupo.length > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-200">
            <p className="font-semibold">
              {semGrupo.length} {semGrupo.length === 1 ? 'filial está' : 'filiais estão'} sem grupo de recebimento
            </p>
            <p className="text-amber-200/80 mt-0.5">
              {semGrupo.map((f) => `${f.numeroFilial} — ${f.nome}`).join(' · ')}. Defina o grupo em
              Gestão de Filiais para incluí-{semGrupo.length === 1 ? 'la' : 'las'} no plano.
            </p>
          </div>
        </div>
      )}

      {conflitos.length > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="text-sm text-red-200">
            <p className="font-semibold">
              {conflitos.length} {conflitos.length === 1 ? 'inventário conflita' : 'inventários conflitam'} com o calendário de recebimento
            </p>
            <ul className="mt-1 space-y-0.5 text-red-200/80">
              {conflitos.map((c) => (
                <li key={c.inventarioId}>
                  Filial {c.numeroFilial} — {c.nomeFilial}: {c.mensagem}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Gerador */}
      {canWrite && (
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary-400" />
                Gerar plano do mês
              </h2>
              <p className="text-dark-400 text-sm mt-1">
                Repete o dia do mês anterior de cada loja, desviando dos dias de recebimento.
                A proposta é editável antes de salvar.
              </p>
            </div>
            <button onClick={handleGerar} className="btn-primary shrink-0" disabled={gerando}>
              <Sparkles className="w-4 h-4" />
              {gerando ? 'Gerando...' : 'Gerar plano'}
            </button>
          </div>

          {proposta && (
            <div className="mt-6 pt-6 border-t border-dark-700">
              {proposta.avisos?.length > 0 && (
                <div className="mb-4 space-y-1">
                  {proposta.avisos.map((aviso, i) => (
                    <p key={i} className="text-sm text-amber-300 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      {aviso}
                    </p>
                  ))}
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th scope="col" className="table-header">Filial</th>
                      <th scope="col" className="table-header">Grupo</th>
                      <th scope="col" className="table-header">Data atual</th>
                      <th scope="col" className="table-header">Data sugerida</th>
                      <th scope="col" className="table-header">Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proposta.itens.map((item) => (
                      <tr key={item.filialId} className="hover:bg-dark-700/30 transition-colors">
                        <td className="table-cell font-medium text-white">
                          {item.numeroFilial} — {item.nomeFilial}
                        </td>
                        <td className="table-cell">
                          {item.grupo ? (
                            <span className={`badge ${grupoBadge(item.grupo)}`}>
                              {grupoLabels[item.grupo]}
                            </span>
                          ) : (
                            <span className="badge">—</span>
                          )}
                        </td>
                        <td className="table-cell text-dark-400">{formatarBR(item.dataAtual)}</td>
                        <td className="table-cell">
                          {item.editavel ? (
                            <input
                              type="date"
                              value={item.dataSugerida || ''}
                              onChange={(e) => alterarDataProposta(item.filialId, e.target.value)}
                              className="input-field py-1.5"
                            />
                          ) : (
                            <span className="text-dark-400 flex items-center gap-1.5">
                              <Lock className="w-3.5 h-3.5" />
                              {formatarBR(item.dataSugerida)}
                            </span>
                          )}
                        </td>
                        <td className="table-cell">
                          <span
                            className={`badge ${MOTIVOS[item.motivo]?.badge || 'badge'}`}
                            title={item.descricaoMotivo}
                          >
                            {MOTIVOS[item.motivo]?.label || item.motivo}
                          </span>
                          <p className="text-xs text-dark-400 mt-1">{item.descricaoMotivo}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-3 mt-5">
                <button onClick={() => setProposta(null)} className="btn-secondary">Descartar</button>
                <button onClick={handleSalvarPlano} className="btn-primary" disabled={salvandoPlano}>
                  <Save className="w-4 h-4" />
                  {salvandoPlano ? 'Salvando...' : 'Salvar plano'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Inventários salvos */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary-400" />
            Inventários do mês
            <span className="text-sm font-normal text-dark-400">({inventarios.length})</span>
          </h2>
          {canWrite && (
            <button onClick={openNew} className="btn-primary">
              <Plus className="w-4 h-4" />
              Novo Inventário
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th scope="col" className="table-header">Filial</th>
                <th scope="col" className="table-header">Data</th>
                <th scope="col" className="table-header">Status</th>
                <th scope="col" className="table-header">Responsável</th>
                {canWrite && <th scope="col" className="table-header text-right">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {inventarios.length === 0 ? (
                <tr>
                  <td colSpan={canWrite ? 5 : 4} className="text-center py-16 text-dark-400">
                    {isLoading ? 'Carregando...' : 'Nenhum inventário planejado para este mês.'}
                  </td>
                </tr>
              ) : (
                [...inventarios]
                  .sort((a, b) => a.data.localeCompare(b.data))
                  .map((inv) => (
                    <tr key={inv.id} className="hover:bg-dark-700/30 transition-colors">
                      <td className="table-cell font-medium text-white">{nomeFilial(inv.filialId)}</td>
                      <td className="table-cell">{formatarBR(inv.data)}</td>
                      <td className="table-cell">
                        <span className={`badge ${STATUS[inv.status]?.badge || 'badge'}`}>
                          {STATUS[inv.status]?.label || inv.status}
                        </span>
                      </td>
                      <td className="table-cell text-dark-300">{inv.responsavel || '—'}</td>
                      {canWrite && (
                        <td className="table-cell text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setInventarioResultado(inv)}
                              className="btn-secondary px-3 py-1.5"
                              title="Resultado do inventário"
                              aria-label="Resultado do inventário"
                            >
                              <FileSpreadsheet className="w-4 h-4" />
                            </button>
                            <button onClick={() => openEdit(inv)} className="btn-secondary px-3 py-1.5" title="Editar" aria-label="Editar">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(inv)} className="btn-danger px-3 py-1.5" title="Excluir" aria-label="Excluir">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visão de calendário */}
      <div className="card">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-6">
          <CalendarDays className="w-5 h-5 text-primary-400" />
          Distribuição no mês
        </h2>

        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-dark-400 uppercase tracking-wider py-2">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {celulas.map((data, idx) => {
            if (!data) return <div key={`vazio-${idx}`} />;

            const iso = toISO(data);
            const doDia = porData.get(iso) || [];

            return (
              <div
                key={iso}
                className={`min-h-24 rounded-lg border p-2 ${
                  doDia.length > 0
                    ? 'bg-primary-500/10 border-primary-500/30'
                    : 'bg-dark-800 border-dark-700'
                }`}
              >
                <span className={`text-sm font-bold ${doDia.length > 0 ? 'text-primary-300' : 'text-dark-500'}`}>
                  {data.getDate()}
                </span>
                <div className="mt-1 space-y-0.5">
                  {doDia.map((inv) => {
                    const f = filialPorId.get(inv.filialId);
                    return (
                      <p key={inv.id} className="text-[10px] leading-tight text-dark-200 truncate"
                         title={nomeFilial(inv.filialId)}>
                        {f ? f.numeroFilial : '?'} — {f ? f.nome : 'removida'}
                      </p>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editando ? 'Editar Inventário' : 'Novo Inventário'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Filial *</label>
            <select
              value={form.filialId}
              onChange={(e) => alterarFilialOuData('filialId', e.target.value)}
              className="select-field"
            >
              <option value="">Selecione a filial...</option>
              {filiais.map((f) => (
                <option key={f.id} value={f.id} disabled={!f.grupoRecebimento}>
                  {f.numeroFilial} — {f.nome}
                  {f.grupoRecebimento ? ` (${grupoLabels[f.grupoRecebimento]})` : ' — sem grupo'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Data *</label>
            <input
              type="date"
              value={form.data}
              onChange={(e) => alterarFilialOuData('data', e.target.value)}
              className="input-field"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Horário de início</label>
              <input
                type="time"
                value={form.horarioInicio}
                onChange={(e) => setForm({ ...form, horarioInicio: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Horário de término</label>
              <input
                type="time"
                value={form.horarioFim}
                onChange={(e) => setForm({ ...form, horarioFim: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="select-field"
            >
              <option value="PLANEJADO">Planejado</option>
              <option value="REALIZADO">Realizado</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Responsável</label>
            <input
              type="text"
              value={form.responsavel}
              onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
              className="input-field"
              placeholder="Quem vai conduzir o inventário"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Observação{conflitoPendente ? ' *' : ''}
            </label>
            <input
              type="text"
              value={form.observacao}
              onChange={(e) => { setForm({ ...form, observacao: e.target.value }); if (formError) setFormError(''); }}
              className="input-field"
              placeholder={conflitoPendente ? 'Justifique o inventário no mesmo dia do recebimento' : 'Opcional'}
            />
          </div>

          {conflitoPendente && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-200 flex-1">
                <p>
                  Essa filial recebe material nessa data. O cadastro não é mais bloqueado, mas
                  é preciso confirmar ciência e justificar na observação acima.
                </p>
                <label className="flex items-center gap-3 cursor-pointer mt-3">
                  <input
                    type="checkbox"
                    checked={form.cienteConflitoRecebimento}
                    onChange={(e) => { setForm({ ...form, cienteConflitoRecebimento: e.target.checked }); if (formError) setFormError(''); }}
                    className="w-5 h-5 rounded border-dark-600 bg-dark-700 text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-amber-100">
                    Estou ciente do conflito e confirmo o agendamento mesmo assim.
                  </span>
                </label>
              </div>
            </div>
          )}

          {formError && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
            <button onClick={handleSave} className="btn-primary">
              {editando ? 'Salvar Alterações' : 'Agendar Inventário'}
            </button>
          </div>
        </div>
      </Modal>

      {inventarioResultado && (
        <InventoryResultPanel
          inventario={inventarioResultado}
          nomeFilial={nomeFilial(inventarioResultado.filialId)}
          canWrite={canWrite}
          showToast={showToast}
          onClose={() => setInventarioResultado(null)}
          onImportado={carregar}
        />
      )}
    </div>
  );
}
