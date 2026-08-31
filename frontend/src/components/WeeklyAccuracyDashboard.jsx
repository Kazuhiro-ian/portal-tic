import { Layers, ArrowDown, ArrowUp, CalendarDays } from 'lucide-react';
import { ResultadoArmazemCard } from './ResultadoArmazemCard.jsx';
import { ListaRanking } from './ListaRanking.jsx';

/**
 * "Semana 01 — 05/07/2025". A data vem como 'YYYY-MM-DD' e é lida com T00:00:00 para o
 * navegador não interpretá-la como UTC e exibir o dia anterior no fuso do Brasil.
 */
function tituloDaSemana(semana) {
  const rotulo = `Semana ${String(semana.numero ?? '?').padStart(2, '0')}`;
  if (!semana.data) return rotulo;
  const data = new Date(`${semana.data}T00:00:00`);
  return Number.isNaN(data.getTime()) ? rotulo : `${rotulo} — ${data.toLocaleDateString('pt-BR')}`;
}

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

  // `semanas` só existe na resposta do endpoint semanal. Ler `.length` direto quebrava o render
  // inteiro (e, sem ErrorBoundary, apagava o app todo) sempre que este componente recebia um
  // detalhe no formato mensal -- ver QualityDashboards.chaveDaRequisicao. O par certo de dados
  // é garantido lá; aqui a checagem fica como defesa, para nenhum payload inesperado voltar a
  // derrubar a tela.
  const semanas = Array.isArray(detalhe.semanas) ? detalhe.semanas : [];
  if (semanas.length === 0) {
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
        <div className="grid grid-cols-1 sm:grid-cols-2 c-lg:grid-cols-3 gap-4">
          {semanas.map((semana) => (
            <ResultadoArmazemCard
              key={semana.data ?? semana.numero}
              titulo={tituloDaSemana(semana)}
              resultado={semana.resultado}
              config={config}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 c-md:grid-cols-2 gap-6">
        <ListaRanking titulo="Maiores Faltas" icon={ArrowDown} cor="text-red-400" itens={detalhe.maioresFaltas} />
        <ListaRanking titulo="Maiores Sobras" icon={ArrowUp} cor="text-green-400" itens={detalhe.maioresSobras} />
      </div>
    </div>
  );
}
