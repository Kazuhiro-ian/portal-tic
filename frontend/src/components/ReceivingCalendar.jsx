import { useState, useEffect, useCallback } from 'react';
import { CalendarDays, Wand2, Pin, Info, Save, X } from 'lucide-react';
import { listarDiasRecebimento, aplicarPadraoMensal, salvarDiasRecebimento } from '../services/api.js';
import { toISO, limitesDoMes, diasNoMes, DIAS_SEMANA } from '../utils/datas.js';
import { TIPOS_DIA } from '../utils/qualidade.js';

const padraoVazio = () =>
  DIAS_SEMANA.reduce((acc, d) => ({ ...acc, [d.java]: 'SEM_PEDIDOS' }), {});

export function ReceivingCalendar({ ano, mes, canWrite, showToast, onCalendarioMudou }) {
  const [dias, setDias] = useState({});
  const [padrao, setPadrao] = useState(padraoVazio);
  const [sobrescrever, setSobrescrever] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [aplicandoPadrao, setAplicandoPadrao] = useState(false);

  const [tipoSelecionado, setTipoSelecionado] = useState('GRUPO_1');
  const [salvando, setSalvando] = useState(false);
  // Cliques ainda não salvos: iso -> tipo escolhido. Só vira alteração de verdade no banco
  // quando o usuário clica em Salvar.
  const [pendentes, setPendentes] = useState({});

  const carregar = useCallback(async () => {
    try {
      setIsLoading(true);
      const { inicio, fim } = limitesDoMes(ano, mes);
      const data = await listarDiasRecebimento(inicio, fim);
      setDias(Object.fromEntries(data.map((d) => [d.data, d])));
      setPendentes({});
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
    setAplicandoPadrao(true);
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
      setAplicandoPadrao(false);
    }
  };

  const tipoAtual = (iso) => {
    if (Object.prototype.hasOwnProperty.call(pendentes, iso)) return pendentes[iso];
    return dias[iso]?.tipo || null;
  };

  // Clicar pinta o dia com o tipo selecionado; clicar de novo no mesmo tipo desfaz só a
  // pendência (volta pro que já estava salvo -- não existe "apagar" um dia configurado).
  const pintarDia = (iso) => {
    if (!canWrite) return;
    setPendentes((prev) => {
      const copia = { ...prev };
      if (tipoAtual(iso) === tipoSelecionado) {
        delete copia[iso];
      } else {
        copia[iso] = tipoSelecionado;
      }
      return copia;
    });
  };

  const descartarAlteracoes = () => setPendentes({});

  const salvarAlteracoes = async () => {
    const itens = Object.entries(pendentes).map(([data, tipo]) => ({ data, tipo }));
    if (itens.length === 0) return;
    try {
      setSalvando(true);
      await salvarDiasRecebimento(itens);
      showToast(`${itens.length} ${itens.length === 1 ? 'dia atualizado' : 'dias atualizados'} no calendário de recebimento.`);
      await carregar();
      onCalendarioMudou?.(null);
    } catch (error) {
      showToast(error.message || 'Erro ao salvar o calendário de recebimento.', 'error');
    } finally {
      setSalvando(false);
    }
  };

  // Grade do mês: começa no domingo, com células vazias antes do dia 1.
  const total = diasNoMes(ano, mes);
  const primeiroDiaSemana = new Date(ano, mes - 1, 1).getDay(); // 0 = domingo
  const celulas = [
    ...Array(primeiroDiaSemana).fill(null),
    ...Array.from({ length: total }, (_, i) => new Date(ano, mes - 1, i + 1)),
  ];

  const qtdPendentes = Object.keys(pendentes).length;

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-1">
          <Wand2 className="w-5 h-5 text-primary-400" />
          Padrão da semana
        </h2>
        <p className="text-dark-400 text-sm mb-5">
          Defina o que é cada dia da semana e aplique ao mês inteiro. Ajustes pontuais
          (feriados, entregas extras) podem ser feitos depois clicando nos dias do calendário.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {DIAS_SEMANA.map((d) => (
            <div key={d.java}>
              <label htmlFor={`padrao-dia-${d.java}`} className="block text-sm font-medium text-dark-300 mb-2">{d.curto}</label>
              <select
                id={`padrao-dia-${d.java}`}
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
            <button onClick={handleAplicarPadrao} className="btn-primary" disabled={aplicandoPadrao}>
              <Wand2 className="w-4 h-4" />
              {aplicandoPadrao ? 'Aplicando...' : 'Aplicar ao mês'}
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
              <button
                key={chave}
                onClick={() => setTipoSelecionado(chave)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors border ${
                  tipoSelecionado === chave
                    ? 'bg-primary-600 border-primary-600 text-white'
                    : 'border-dark-700 text-dark-300 hover:text-white'
                }`}
              >
                {cfg.label}
              </button>
            ))}
          </div>
        </div>

        {canWrite && (
          <p className="text-xs text-dark-400 mb-4">
            Clique nos dias para marcar &quot;{TIPOS_DIA[tipoSelecionado].label}&quot; neles. As
            alterações só valem depois de clicar em Salvar.
          </p>
        )}

        {isLoading ? (
          <p className="text-center py-16 text-dark-400">Carregando calendário...</p>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
                <div key={d} className="text-center text-[10px] sm:text-xs font-semibold text-dark-400 uppercase tracking-wider py-1 sm:py-2">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {celulas.map((data, idx) => {
                if (!data) return <div key={`vazio-${idx}`} />;

                const iso = toISO(data);
                const alterado = Object.prototype.hasOwnProperty.call(pendentes, iso);
                const tipo = tipoAtual(iso);
                const cfg = tipo ? TIPOS_DIA[tipo] : null;
                const dia = dias[iso];

                return (
                  <button
                    key={iso}
                    onClick={() => pintarDia(iso)}
                    disabled={!canWrite}
                    title={cfg?.label || 'Não configurado'}
                    className={`min-h-14 sm:min-h-20 md:min-h-24 rounded-lg border p-1.5 sm:p-2 flex flex-col items-start justify-between transition-colors text-left ${
                      cfg ? cfg.celula : 'bg-dark-800 border-dark-700 text-dark-500'
                    } ${alterado ? 'ring-2 ring-primary-400 ring-offset-1 ring-offset-dark-900' : ''} ${
                      canWrite ? 'hover:brightness-125 cursor-pointer' : 'cursor-default'
                    }`}
                  >
                    <div className="flex items-start justify-between w-full">
                      <span className="text-xs sm:text-sm font-bold">{data.getDate()}</span>
                      {!alterado && dia?.ajusteManual && <Pin className="w-3 h-3 shrink-0 opacity-80" />}
                    </div>
                    <span className="hidden xs:block text-[9px] sm:text-[10px] leading-tight font-medium opacity-90">
                      {cfg ? cfg.label : '—'}
                    </span>
                  </button>
                );
              })}
            </div>

            {canWrite && (
              <p className="text-xs text-dark-400 mt-4 flex items-center gap-2">
                <Info className="w-3.5 h-3.5 shrink-0" />
                Dias com <Pin className="w-3 h-3 inline" /> já foram ajustados à mão e resistem a
                uma nova aplicação do padrão semanal.
              </p>
            )}

            {canWrite && qtdPendentes > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-5 pt-4 border-t border-dark-700">
                <p className="text-sm text-dark-300">
                  {qtdPendentes} {qtdPendentes === 1 ? 'dia alterado' : 'dias alterados'} ainda não
                  salvo{qtdPendentes === 1 ? '' : 's'}.
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={descartarAlteracoes} disabled={salvando} className="btn-secondary text-sm">
                    <X className="w-4 h-4" />
                    Descartar
                  </button>
                  <button onClick={salvarAlteracoes} disabled={salvando} className="btn-primary text-sm">
                    <Save className="w-4 h-4" />
                    {salvando ? 'Salvando...' : 'Salvar alterações'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
