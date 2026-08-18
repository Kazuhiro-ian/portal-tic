import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * Variação em pontos percentuais entre o valor atual e o do mês anterior. `invertido`
 * inverte o que conta como "melhora" (ex: percentual de ajuste/inacuracia -- menor é
 * melhor, diferente de acuracidade, onde maior é melhor).
 */
export function DeltaBadge({ atual, anterior, invertido = false, className = '' }) {
  if (atual == null || anterior == null) return null;

  const deltaPontos = (Number(atual) - Number(anterior)) * 100;
  if (Math.abs(deltaPontos) < 0.05) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs text-dark-400 ${className}`}>
        <Minus className="w-3 h-3" />
        estável vs mês anterior
      </span>
    );
  }

  const melhorou = invertido ? deltaPontos < 0 : deltaPontos > 0;
  const Icon = deltaPontos > 0 ? TrendingUp : TrendingDown;
  const cor = melhorou ? 'text-green-400' : 'text-red-400';
  const sinal = deltaPontos > 0 ? '+' : '';

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${cor} ${className}`}>
      <Icon className="w-3 h-3" />
      {sinal}{deltaPontos.toFixed(1)} p.p. vs mês anterior
    </span>
  );
}
