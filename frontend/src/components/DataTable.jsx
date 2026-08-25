import { useEffect, useRef, useState } from 'react';
import { useMediaQuery, BREAKPOINTS } from '../hooks/useMediaQuery.js';

// Tabela que vira lista de cards abaixo de `md` (768px), eliminando o scroll horizontal
// que qualquer tabela com 6+ colunas gera num iPhone. Ver PLANO-MOBILE.md §1.1 e §2.
//
// Cada coluna aceita um campo `mobile` que decide seu papel na visão em card:
//   'titulo'    -> cabeçalho do card (uma por tabela, a mais identificadora)
//   'subtitulo' -> linha logo abaixo do título, mais discreta
//   'badge'     -> renderizado ao lado do título, sem rótulo
//   'oculto'    -> não aparece no card (informação secundária, só cabe na tabela)
//   ausente     -> vira uma linha rotulada "label: valor" no corpo do card
//
// No desktop (md+), todas as colunas aparecem como tabela normal, com cabeçalho sticky.
export function DataTable({
  colunas,
  dados,
  chaveLinha = (item, index) => item.id ?? index,
  acoes,
  vazio = 'Nenhum registro encontrado.',
  carregando = false,
  offset,
  aoClicarLinha,
}) {
  const scrollRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  // Renderiza só a tabela OU só a lista de cards, nunca as duas: com as duas sempre montadas
  // (uma escondida via CSS), cada atualização de dados dobrava o trabalho de reconciliação do
  // React à toa, já que só uma das duas árvores chega a ficar visível por vez.
  const isDesktop = useMediaQuery(BREAKPOINTS.md);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const aoRolar = () => setScrolled(el.scrollTop > 0);
    el.addEventListener('scroll', aoRolar);
    return () => el.removeEventListener('scroll', aoRolar);
  }, []);

  const colunaTitulo = colunas.find((c) => c.mobile === 'titulo');
  const colunaSubtitulo = colunas.find((c) => c.mobile === 'subtitulo');
  const colunasBadge = colunas.filter((c) => c.mobile === 'badge');
  const colunasLinha = colunas.filter((c) => !['titulo', 'subtitulo', 'badge', 'oculto'].includes(c.mobile));

  const renderValor = (coluna, item) => (coluna.render ? coluna.render(item) : item[coluna.chave]);

  const estaVazio = !carregando && dados.length === 0;

  const aoTeclarLinha = (item) => (evento) => {
    if (!aoClicarLinha) return;
    if (evento.key === 'Enter' || evento.key === ' ') {
      evento.preventDefault();
      aoClicarLinha(item);
    }
  };

  return (
    <>
      {/* Tabela: md e acima */}
      {isDesktop && (
        <div
          ref={scrollRef}
          className="table-scroll"
          style={offset ? { '--table-offset': offset } : undefined}
        >
          <table className="w-full">
            <thead>
              <tr>
                {colunas.map((coluna) => (
                  <th
                    key={coluna.chave}
                    scope="col"
                    className={`table-header table-sticky-head ${scrolled ? 'is-scrolled' : ''} ${coluna.className || ''}`}
                  >
                    {coluna.header}
                  </th>
                ))}
                {acoes && (
                  <th
                    scope="col"
                    className={`table-header table-sticky-head text-right ${scrolled ? 'is-scrolled' : ''}`}
                  >
                    Ações
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {estaVazio ? (
                <tr>
                  <td colSpan={colunas.length + (acoes ? 1 : 0)} className="text-center py-16 text-dark-400">
                    {carregando ? 'Carregando...' : vazio}
                  </td>
                </tr>
              ) : carregando ? (
                <tr>
                  <td colSpan={colunas.length + (acoes ? 1 : 0)} className="text-center py-16 text-dark-400">
                    Carregando...
                  </td>
                </tr>
              ) : (
                dados.map((item, index) => (
                  <tr
                    key={chaveLinha(item, index)}
                    onClick={aoClicarLinha ? () => aoClicarLinha(item) : undefined}
                    onKeyDown={aoClicarLinha ? aoTeclarLinha(item) : undefined}
                    tabIndex={aoClicarLinha ? 0 : undefined}
                    role={aoClicarLinha ? 'button' : undefined}
                    className={`hover:bg-dark-700/30 transition-colors ${aoClicarLinha ? 'cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-400 -outline-offset-2' : ''}`}
                  >
                    {colunas.map((coluna) => (
                      <td key={coluna.chave} className={`table-cell ${coluna.tdClassName || ''}`}>
                        {renderValor(coluna, item)}
                      </td>
                    ))}
                    {acoes && (
                      <td className="table-cell text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">{acoes(item)}</div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Cards: abaixo de md */}
      {!isDesktop && (
      <div className="space-y-3">
        {carregando ? (
          <p className="text-center py-12 text-dark-400">Carregando...</p>
        ) : estaVazio ? (
          <p className="text-center py-12 text-dark-400">{vazio}</p>
        ) : (
          dados.map((item, index) => (
            <div
              key={chaveLinha(item, index)}
              onClick={aoClicarLinha ? () => aoClicarLinha(item) : undefined}
              onKeyDown={aoClicarLinha ? aoTeclarLinha(item) : undefined}
              tabIndex={aoClicarLinha ? 0 : undefined}
              role={aoClicarLinha ? 'button' : undefined}
              className={`data-card ${aoClicarLinha ? 'cursor-pointer active:border-dark-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-400' : ''}`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  {colunaTitulo && (
                    <p className="font-semibold text-white truncate">{renderValor(colunaTitulo, item)}</p>
                  )}
                  {colunaSubtitulo && (
                    <p className="text-sm text-dark-400 truncate">{renderValor(colunaSubtitulo, item)}</p>
                  )}
                </div>
                {colunasBadge.length > 0 && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {colunasBadge.map((coluna) => (
                      <span key={coluna.chave}>{renderValor(coluna, item)}</span>
                    ))}
                  </div>
                )}
              </div>

              {colunasLinha.length > 0 && (
                <div className="mt-1">
                  {colunasLinha.map((coluna) => (
                    <div key={coluna.chave} className="data-card-row">
                      <span className="data-card-label">{coluna.header}</span>
                      <span className="text-dark-200 text-right truncate">{renderValor(coluna, item)}</span>
                    </div>
                  ))}
                </div>
              )}

              {acoes && (
                <div
                  className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-dark-700/50"
                  onClick={(e) => e.stopPropagation()}
                >
                  {acoes(item)}
                </div>
              )}
            </div>
          ))
        )}
      </div>
      )}
    </>
  );
}
