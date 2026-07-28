import { useState, useEffect, useCallback } from 'react';
import { CalendarDays, Wand2, Pin, Info } from 'lucide-react';
import { Modal } from './Modal.jsx';
import { listarDiasRecebimento, aplicarPadraoMensal, salvarDiaRecebimento } from '../services/api.js';
import { toISO, formatarBR, limitesDoMes, diasNoMes, DIAS_SEMANA } from '../utils/datas.js';
import { TIPOS_DIA } from '../utils/qualidade.js';
import { useToast } from '../hooks/useToast.js';

const padraoVazio = () =>
  DIAS_SEMANA.reduce((acc, d) => ({ ...acc, [d.java]: 'SEM_PEDIDOS' }), {});

export function ReceivingCalendar({ ano, mes, canWrite, showToast, onCalendarioMudou }) {
  const [dias, setDias] = useState({});
  const [padrao, setPadrao] = useState(padraoVazio);
  const [sobrescrever, setSobrescrever] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [diaSelecionado, setDiaSelecionado] = useState(null);
  const [form, setForm] = useState({ tipo: 'SEM_PEDIDOS', observacao: '' });
  const [formError, setFormError] = useState('');

  const carregar = useCallback(async () => {
    try {
      setIsLoading(true);
      const { inicio, fim } = limitesDoMes(ano, mes);
      const data = await listarDiasRecebimento(inicio, fim);
      setDias(Object.fromEntries(data.map((d) => [d.data, d])));
    } catch (error) {
      showToast(error.message || 'Erro ao carregar o calendário de recebimento.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [ano, mes, showToast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const handleAplicarPadrao = async () => {
    setSalvando(true);
    try {
      const resp = await aplicarPadraoMensal({
        ano,
        mes,
        padrao,
        sobrescreverAjustesManuais: sobrescrever,
      });
      const partes = [`${resp.criados} criados`, `${resp.atualizados} atualizados`];
      if (resp.preservados > 0) partes.push(`${resp.preservados} preservados`);
      showToast(`Padrão aplicado: ${partes.join(', ')}.`);
      await carregar();
      onCalendarioMudou?.(resp.conflitos || []);
    } catch (error) {
      showToast(error.message || 'Erro ao aplicar o padrão do mês.', 'error');
    } finally {
      setSalvando(false);
    }
  };

  const abrirDia = (iso) => {
    if (!canWrite) return;
    const existente = dias[iso];
    setDiaSelecionado(iso);
    setForm({ tipo: existente?.tipo || 'SEM_PEDIDOS', observacao: existente?.observacao || '' });
    setFormError('');
  };

  const handleSalvarDia = async () => {
    try {
      await salvarDiaRecebimento({
        data: diaSelecionado,
        tipo: form.tipo,
        observacao: form.observacao.trim() || null,
      });
      showToast(`Dia ${formatarBR(diaSelecionado)} atualizado.`);
      setDiaSelecionado(null);
      await carregar();
      onCalendarioMudou?.(null);
    } catch (error) {
      setFormError(error.message || 'Erro ao salvar o dia.');
    }
  };

  // Grade do mês: começa no domingo, com células vazias antes do dia 1.
  const total = diasNoMes(ano, mes);
  const primeiroDiaSemana = new Date(ano, mes - 1, 1).getDay(); // 0 = domingo
  const celulas = [
    ...Array(primeiroDiaSemana).fill(null),
    ...Array.from({ length: total }, (_, i) => new Date(ano, mes - 1, i + 1)),
  ];

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-1">
          <Wand2 className="w-5 h-5 text-primary-400" />
          Padrão da semana
        </h2>
        <p className="text-dark-400 text-sm mb-5">
          Defina o que é cada dia da semana e aplique ao mês inteiro. Ajustes pontuais
          (feriados, entregas extras) podem ser feitos depois clicando em um dia do calendário.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {DIAS_SEMANA.map((d) => (
            <div key={d.java}>
              <label className="block text-sm font-medium text-dark-300 mb-2">{d.curto}</label>
              <select
                value={padrao[d.java]}
                onChange={(e) => setPadrao({ ...padrao, [d.java]: e.target.value })}
                className="select-field"
                disabled={!canWrite}
              >
                <option value="GRUPO_1">Grupo 1</option>
                <option value="GRUPO_2">Grupo 2</option>
                <option value="SEM_PEDIDOS">Sem pedidos</option>
              </select>
            </div>
          ))}
        </div>

        {canWrite && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-5 pt-5 border-t border-dark-700">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={sobrescrever}
                onChange={(e) => setSobrescrever(e.target.checked)}
                className="w-5 h-5 rounded border-dark-600 bg-dark-700 text-primary-500 focus:ring-primary-500"
              />
              <span className="text-dark-300 text-sm">
                Sobrescrever ajustes manuais (feriados já marcados neste mês)
              </span>
            </label>
            <button onClick={handleAplicarPadrao} className="btn-primary" disabled={salvando}>
              <Wand2 className="w-4 h-4" />
              {salvando ? 'Aplicando...' : 'Aplicar ao mês'}
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary-400" />
            Calendário do mês
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {Object.entries(TIPOS_DIA).map(([chave, cfg]) => (
              <span key={chave} className={`badge ${cfg.badge}`}>{cfg.label}</span>
            ))}
          </div>
        </div>

        {isLoading ? (
          <p className="text-center py-16 text-dark-400">Carregando calendário...</p>
        ) : (
          <>
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
                const dia = dias[iso];
                const cfg = dia ? TIPOS_DIA[dia.tipo] : null;

                return (
                  <button
                    key={iso}
                    onClick={() => abrirDia(iso)}
                    disabled={!canWrite}
                    title={dia?.observacao || cfg?.label || 'Não configurado'}
                    className={`min-h-24 rounded-lg border p-2 flex flex-col items-start justify-between transition-colors text-left ${
                      cfg ? cfg.celula : 'bg-dark-800 border-dark-700 text-dark-500'
                    } ${canWrite ? 'hover:brightness-125 cursor-pointer' : 'cursor-default'}`}
                  >
                    <div className="flex items-start justify-between w-full">
                      <span className="text-sm font-bold">{data.getDate()}</span>
                      {dia?.ajusteManual && <Pin className="w-3 h-3 shrink-0 opacity-80" />}
                    </div>
                    <span className="text-[10px] leading-tight font-medium opacity-90">
                      {cfg ? cfg.label : '—'}
                    </span>
                  </button>
                );
              })}
            </div>

            {canWrite && (
              <p className="text-xs text-dark-400 mt-4 flex items-center gap-2">
                <Info className="w-3.5 h-3.5 shrink-0" />
                Clique em um dia para ajustá-lo individualmente. Dias com
                <Pin className="w-3 h-3 inline" /> foram ajustados à mão e resistem a uma nova
                aplicação do padrão.
              </p>
            )}
          </>
        )}
      </div>

      <Modal
        isOpen={diaSelecionado !== null}
        onClose={() => setDiaSelecionado(null)}
        title={`Ajustar dia — ${formatarBR(diaSelecionado)}`}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Recebimento neste dia</label>
            <select
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              className="select-field"
            >
              <option value="GRUPO_1">Grupo 1 recebe material</option>
              <option value="GRUPO_2">Grupo 2 recebe material</option>
              <option value="SEM_PEDIDOS">Sem pedidos — nenhum grupo recebe</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Observação</label>
            <input
              type="text"
              value={form.observacao}
              onChange={(e) => setForm({ ...form, observacao: e.target.value })}
              className="input-field"
              placeholder="Ex: Feriado municipal"
            />
          </div>

          <p className="text-xs text-dark-400">
            Este dia será marcado como ajuste manual e não será alterado ao reaplicar o
            padrão da semana.
          </p>

          {formError && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setDiaSelecionado(null)} className="btn-secondary">Cancelar</button>
            <button onClick={handleSalvarDia} className="btn-primary">Salvar Dia</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
