import { useState, useEffect, useCallback } from 'react';
import { CalendarDays } from 'lucide-react';
import { listarDiasEquipe, alternarDiaEquipe } from '../services/api.js';
import { toISO, limitesDoMes, diasNoMes } from '../utils/datas.js';
import { TIPOS_DIA_EQUIPE } from '../utils/qualidade.js';

export function EquipeCalendarManagement({ ano, mes, canWrite, showToast }) {
  const [dias, setDias] = useState({});
  const [tipoSelecionado, setTipoSelecionado] = useState('DSR');
  const [isLoading, setIsLoading] = useState(true);

  const carregar = useCallback(async () => {
    try {
      setIsLoading(true);
      const { inicio, fim } = limitesDoMes(ano, mes);
      const data = await listarDiasEquipe(inicio, fim);
      setDias(Object.fromEntries(data.map((d) => [d.data, d])));
    } catch (error) {
      showToast(error.message || 'Erro ao carregar o calendário da equipe.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [ano, mes, showToast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const alternarDia = async (iso) => {
    if (!canWrite) return;
    try {
      await alternarDiaEquipe({ data: iso, tipo: tipoSelecionado });
      await carregar();
    } catch (error) {
      showToast(error.message || 'Erro ao marcar o dia.', 'error');
    }
  };

  const total = diasNoMes(ano, mes);
  const primeiroDiaSemana = new Date(ano, mes - 1, 1).getDay();
  const celulas = [
    ...Array(primeiroDiaSemana).fill(null),
    ...Array.from({ length: total }, (_, i) => new Date(ano, mes - 1, i + 1)),
  ];

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
          Clique num dia do calendário para marcar/desmarcar "{TIPOS_DIA_EQUIPE[tipoSelecionado].label}" nele.
        </p>
      )}

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
              const cfg = dia ? TIPOS_DIA_EQUIPE[dia.tipo] : null;

              return (
                <button
                  key={iso}
                  onClick={() => alternarDia(iso)}
                  disabled={!canWrite}
                  title={dia?.observacao || cfg?.label || 'Sem marcação'}
                  className={`min-h-20 rounded-lg border p-2 flex flex-col items-start justify-between transition-colors text-left ${
                    cfg ? cfg.celula : 'bg-dark-800 border-dark-700 text-dark-500'
                  } ${canWrite ? 'hover:brightness-125 cursor-pointer' : 'cursor-default'}`}
                >
                  <span className="text-sm font-bold">{data.getDate()}</span>
                  <span className="text-[10px] leading-tight font-medium opacity-90">
                    {cfg ? cfg.label : '—'}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}