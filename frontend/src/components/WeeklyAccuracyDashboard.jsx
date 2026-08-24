import { Layers, ArrowDown, ArrowUp, CalendarDays } from 'lucide-react';
import { ResultadoArmazemCard } from './ResultadoArmazemCard.jsx';
import { ListaRanking } from './ListaRanking.jsx';

/**
 * Dashboard de uma filial com periodicidade semanal (ex: CD 00): cada sábado do mês
 * individualmente, mais o "Geral" -- a fusão de todas as semanas por produto, mantendo o
 * valor mais recente quando um SKU se repete entre elas. Sem comparação com o mês anterior
 * (não existe "anterior" pareado aqui, é uma fusão dentro do próprio mês).
 */
export function WeeklyAccuracyDashboard({ detalhe, config, carregando }) {
  if (carregando) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!detalhe) {
    return <p className="text-dark-400 text-center py-16">Sem dados no período.</p>;
  }
  if (detalhe.semanas.length === 0) {
    return <p className="text-dark-400 text-center py-16">Nenhuma semana importada neste mês ainda.</p>;
  }

  return (
    <div className="space-y-6">
      <ResultadoArmazemCard titulo="Geral do mês" icon={Layers} resultado={detalhe.geral} config={config} />

      <div>
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-primary-400" />
          Semanas do mês
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {detalhe.semanas.map((semana) => (
            <ResultadoArmazemCard
              key={semana.numero}
              titulo={`Semana ${String(semana.numero).padStart(2, '0')} — ${new Date(semana.data + 'T00:00:00').toLocaleDateString('pt-BR')}`}
              resultado={semana.resultado}
              config={config}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ListaRanking titulo="Maiores Faltas" icon={ArrowDown} cor="text-red-400" itens={detalhe.maioresFaltas} />
        <ListaRanking titulo="Maiores Sobras" icon={ArrowUp} cor="text-green-400" itens={detalhe.maioresSobras} />
      </div>
    </div>
  );
}
