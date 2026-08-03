import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Controles de paginação. Some sozinho quando tudo cabe numa página, para não poluir
 * as telas com poucos registros. Recebe direto o retorno do hook usePaginacao.
 */
export function Paginacao({ pagina, setPagina, totalPaginas, total, primeiroDaPagina, ultimoDaPagina, rotulo = 'registros' }) {
  if (totalPaginas <= 1) return null;

  return (
    <nav
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 pt-4 border-t border-dark-700"
      aria-label="Paginação"
    >
      <p className="text-sm text-dark-400">
        Mostrando <span className="text-dark-200 font-medium">{primeiroDaPagina}</span>–
        <span className="text-dark-200 font-medium">{ultimoDaPagina}</span> de{' '}
        <span className="text-dark-200 font-medium">{total}</span> {rotulo}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setPagina(pagina - 1)}
          disabled={pagina <= 1}
          className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Página anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="text-sm text-dark-300 px-2" aria-live="polite">
          Página {pagina} de {totalPaginas}
        </span>

        <button
          type="button"
          onClick={() => setPagina(pagina + 1)}
          disabled={pagina >= totalPaginas}
          className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Próxima página"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </nav>
  );
}
