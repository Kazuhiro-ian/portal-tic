import { useMemo, useState } from 'react';

/**
 * Paginação no cliente: a API já devolve a lista inteira, e o problema aqui é a tabela
 * renderizar centenas de linhas de uma vez. Quando os endpoints ganharem Pageable, a troca
 * acontece dentro deste hook e as telas não mudam.
 *
 *   const { itensPagina, ...paginacao } = usePaginacao(itensFiltrados);
 */
export function usePaginacao(itens, tamanhoPagina = 25) {
  const [pagina, setPagina] = useState(1);

  const total = itens.length;
  const totalPaginas = Math.max(1, Math.ceil(total / tamanhoPagina));

  // Se a lista encolheu (uma busca foi digitada, um item foi excluído) e a página atual
  // deixou de existir, mostra a última válida em vez de uma tela vazia.
  const paginaAtual = Math.min(pagina, totalPaginas);

  const itensPagina = useMemo(() => {
    const inicio = (paginaAtual - 1) * tamanhoPagina;
    return itens.slice(inicio, inicio + tamanhoPagina);
  }, [itens, paginaAtual, tamanhoPagina]);

  return {
    itensPagina,
    pagina: paginaAtual,
    setPagina,
    totalPaginas,
    total,
    primeiroDaPagina: total === 0 ? 0 : (paginaAtual - 1) * tamanhoPagina + 1,
    ultimoDaPagina: Math.min(paginaAtual * tamanhoPagina, total),
  };
}
