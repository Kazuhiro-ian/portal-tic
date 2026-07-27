import { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, X, ClipboardCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { ReceivingCalendar } from './ReceivingCalendar.jsx';
import { InventoryPlan } from './InventoryPlan.jsx';
import { MESES } from '../utils/datas.js';

const ABAS = [
  { id: 'recebimento', label: 'Calendário de Recebimento' },
  { id: 'plano', label: 'Plano de Inventário' },
];

export function QualityPlanning() {
  const { canWriteQualidade } = useAuth();

  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [aba, setAba] = useState('recebimento');

  // Conflitos devolvidos pela aplicação do padrão, repassados para a aba do plano.
  const [conflitosExternos, setConflitosExternos] = useState(null);

  const [toast, setToast] = useState(null);
  // useCallback com deps vazias: precisa manter a MESMA referência entre renders.
  // ReceivingCalendar/InventoryPlan usam showToast dentro de um useCallback (`carregar`)
  // do qual seu próprio useEffect depende — se showToast mudasse de identidade a cada
  // render (como uma função comum faria), toda vez que ele fosse chamado para exibir um
  // erro o pai re-renderizaria, recriando showToast, recriando carregar, disparando o
  // useEffect de novo, chamando a API de novo, e assim em loop infinito.
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const mudarMes = (delta) => {
    const d = new Date(ano, mes - 1 + delta, 1);
    setAno(d.getFullYear());
    setMes(d.getMonth() + 1);
  };

  const irParaHoje = () => {
    const d = new Date();
    setAno(d.getFullYear());
    setMes(d.getMonth() + 1);
  };

  return (
    <div className="space-y-6 relative">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border bg-dark-800 text-white transition-all max-w-md">
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-dark-400 hover:text-white shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-primary-400" />
            Qualidade
          </h1>
          <p className="text-dark-400 mt-1">
            Planejamento de inventários sem conflito com o recebimento de materiais
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => mudarMes(-1)} className="btn-secondary px-3 py-2" title="Mês anterior">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="px-4 py-2 rounded-lg bg-dark-800 border border-dark-700 min-w-44 text-center">
            <span className="text-white font-semibold">{MESES[mes - 1]} {ano}</span>
          </div>
          <button onClick={() => mudarMes(1)} className="btn-secondary px-3 py-2" title="Próximo mês">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={irParaHoje} className="btn-secondary px-3 py-2 text-sm">Hoje</button>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-dark-800 rounded-lg w-fit">
        {ABAS.map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              aba === a.id ? 'bg-primary-600 text-white' : 'text-dark-300 hover:text-white'
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {aba === 'recebimento' ? (
        <ReceivingCalendar
          ano={ano}
          mes={mes}
          canWrite={canWriteQualidade}
          showToast={showToast}
          onCalendarioMudou={setConflitosExternos}
        />
      ) : (
        <InventoryPlan
          ano={ano}
          mes={mes}
          canWrite={canWriteQualidade}
          showToast={showToast}
          conflitosExternos={conflitosExternos}
        />
      )}
    </div>
  );
}
