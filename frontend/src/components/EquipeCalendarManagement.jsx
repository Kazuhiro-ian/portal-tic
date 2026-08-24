import { useState, useEffect, useCallback } from 'react';
import { CalendarDays, Save, X } from 'lucide-react';
import { listarDiasEquipe, salvarDiasEquipe } from '../services/api.js';
import { toISO, limitesDoMes, diasNoMes } from '../utils/datas.js';
import { TIPOS_DIA_EQUIPE } from '../utils/qualidade.js';

export function EquipeCalendarManagement({ ano, mes, canWrite, showToast }) {
  const [dias, setDias] = useState({});
  const [tipoSelecionado, setTipoSelecionado] = useState('DSR');
  const [isLoading, setIsLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  // Cliques ainda não salvos: iso -> tipo escolhido, ou null pra "remover a marcação".
  // Só vira alteração de verdade no banco quando o usuário clica em Salvar.
  const [pendentes, setPendentes] = useState({});

  const carregar = useCallback(async () => {
    try {
      setIsLoading(true);
      const { inicio, fim } = limitesDoMes(ano, mes);
      const data = await listarDiasEquipe(inicio, fim);
      setDias(Object.fromEntries(data.map((d) => [d.data, d])));
      setPendentes({});
    } catch (error) {
      showToast(error.message || 'Erro ao carregar o calendário da equipe.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [ano, mes, showToast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const tipoAtual = (iso) => {
    if (Object.prototype.hasOwnProperty.call(pendentes, iso)) return pendentes[iso];
    return dias[iso]?.tipo || null;
  };

  // Clicar pinta o dia com o tipo selecionado; clicar de novo no mesmo tipo desmarca --
  // igual ao comportamento antigo, só que agora fica em memória até o Salvar.
  const pintarDia = (iso) => {
    if (!canWrite) return;
    const novoTipo = tipoAtual(iso) === tipoSelecionado ? null : tipoSelecionado;
    setPendentes((prev) => ({ ...prev, [iso]: novoTipo }));
  };

  const descartarAlteracoes = () => setPendentes({});

  const salvarAlteracoes = async () => {
    const itens = Object.entries(pendentes).map(([data, tipo]) => ({ data, tipo }));
    if (itens.length === 0) return;
    try {
      setSalvando(true);
      await salvarDiasEquipe(itens);
      showToast(`${itens.length} ${itens.length === 1 ? 'dia atualizado' : 'dias atualizados'} no calendário da equipe.`);
      await carregar();
    } catch (error) {
      showToast(error.message || 'Erro ao salvar o calendário da equipe.', 'error');
    } finally {
      setSalvando(false);
    }
  };

  const total = diasNoMes(ano, mes);
  const primeiroDiaSemana = new Date(ano, mes - 1, 1).getDay();
  const celulas = [
    ...Array(primeiroDiaSemana).fill(null),
    ...Array.from({ length: total }, (_, i) => new Date(ano, mes - 1, i + 1)),
  ];

  const qtdPendentes = Object.keys(pendentes).length;

  return (
    <div className="card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary-400" />
          Calendário da Equipe (Interno)
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {Object.entries(TIPOS_DIA_EQUIPE).map(([chave, cfg]) => (
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
          Clique nos dias para marcar/desmarcar &quot;{TIPOS_DIA_EQUIPE[tipoSelecionado].label}&quot;.
          As alterações só valem depois de clicar em Salvar.
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
              const cfg = tipo ? TIPOS_DIA_EQUIPE[tipo] : null;

              return (
                <button
                  key={iso}
                  onClick={() => pintarDia(iso)}
                  disabled={!canWrite}
                  title={cfg?.label || 'Sem marcação'}
                  className={`min-h-14 sm:min-h-20 rounded-lg border p-1.5 sm:p-2 flex flex-col items-start justify-between transition-colors text-left ${
                    cfg ? cfg.celula : 'bg-dark-800 border-dark-700 text-dark-500'
                  } ${alterado ? 'ring-2 ring-primary-400 ring-offset-1 ring-offset-dark-900' : ''} ${
                    canWrite ? 'hover:brightness-125 cursor-pointer' : 'cursor-default'
                  }`}
                >
                  <span className="text-xs sm:text-sm font-bold">{data.getDate()}</span>
                  <span className="hidden xs:block text-[9px] sm:text-[10px] leading-tight font-medium opacity-90">
                    {cfg ? cfg.label : '—'}
                  </span>
                </button>
              );
            })}
          </div>

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
  );
}
