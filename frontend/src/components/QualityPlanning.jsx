import { useState } from 'react';
import { ChevronLeft, ChevronRight, ClipboardCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { ReceivingCalendar } from './ReceivingCalendar.jsx';
import { InventoryPlan } from './InventoryPlan.jsx';
import { EquipeInventarioManagement } from './EquipeInventarioManagement.jsx';
import { EquipeCalendarManagement } from './EquipeCalendarManagement.jsx';
import { AccuracyReport } from './AccuracyReport.jsx';
import { QualityDashboards } from './QualityDashboards.jsx';
import { ErrorBoundary } from './ErrorBoundary.jsx';
import { MESES } from '../utils/datas.js';
import { useToast } from '../hooks/useToast.js';
import { Toast } from './Toast.jsx';
import { useAbaNaUrl } from '../hooks/useAbaNaUrl.js';

const ABAS = [
  { id: 'recebimento', label: 'Calendário de Recebimento' },
  { id: 'plano', label: 'Plano de Inventário' },
  { id: 'acuracidade', label: 'Acuracidade' },
  { id: 'dashboards', label: 'Dashboards' },
  { id: 'equipes', label: 'Equipes' },
  { id: 'equipe-calendario', label: 'Calendário da Equipe' },
];

export function QualityPlanning() {
  const { canWriteQualidade } = useAuth();

  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [aba, setAba] = useAbaNaUrl('aba', 'recebimento');

  // Conflitos devolvidos pela aplicação do padrão, repassados para a aba do plano.
  const [conflitosExternos, setConflitosExternos] = useState(null);

  // Pré-seleção da aba Dashboards, disparada pelo botão "Ver dashboard completo" da
  // Acuracidade -- troca de aba e já abre o dashboard da filial escolhida.
  const [selecaoDashboard, setSelecaoDashboard] = useState(null);
  const abrirDashboard = (selecao) => {
    setSelecaoDashboard(selecao);
    setAba('dashboards');
  };

  const { toast, showToast, hideToast } = useToast();

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
      <Toast toast={toast} onClose={hideToast} />

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

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => mudarMes(-1)} className="btn-secondary px-3 py-2" title="Mês anterior" aria-label="Mês anterior">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="px-4 py-2 rounded-lg bg-dark-800 border border-dark-700 min-w-44 text-center">
            <span className="text-white font-semibold">{MESES[mes - 1]} {ano}</span>
          </div>
          <button onClick={() => mudarMes(1)} className="btn-secondary px-3 py-2" title="Próximo mês" aria-label="Próximo mês">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={irParaHoje} className="btn-secondary px-3 py-2 text-sm">Hoje</button>
        </div>
      </div>

      {/* flex-wrap evita que as 5 abas, mais largas que a tela no mobile, arrastem a página
          inteira para o lado (main herda overflow-x: auto do overflow-y-auto — ver
          PLANO-MOBILE.md §1.2). Mesmo padrão já usado em AssetInventory.jsx. */}
      <div className="flex flex-wrap gap-1 p-1 bg-dark-800 rounded-lg w-fit">
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

      {/* Boundary por aba (resetKey={aba}): um erro numa aba não leva junto o seletor de mês
          nem a barra de abas, então dá para sair dela sem recarregar a página. */}
      <ErrorBoundary resetKey={aba}>
      {aba === 'recebimento' ? (
        <ReceivingCalendar
          ano={ano}
          mes={mes}
          canWrite={canWriteQualidade}
          showToast={showToast}
          onCalendarioMudou={setConflitosExternos}
        />
      ) : aba === 'plano' ? (
        <InventoryPlan
          ano={ano}
          mes={mes}
          canWrite={canWriteQualidade}
          showToast={showToast}
          conflitosExternos={conflitosExternos}
        />
      ) : aba === 'acuracidade' ? (
        <AccuracyReport ano={ano} mes={mes} showToast={showToast} onAbrirDashboard={abrirDashboard} />
      ) : aba === 'dashboards' ? (
        <QualityDashboards ano={ano} mes={mes} showToast={showToast} selecaoExterna={selecaoDashboard} />
      ) : aba === 'equipes' ? (
        <EquipeInventarioManagement />
      ) : (
        <EquipeCalendarManagement
          ano={ano}
          mes={mes}
          canWrite={canWriteQualidade}
          showToast={showToast}
        />
      )}
      </ErrorBoundary>
    </div>
  );
}
