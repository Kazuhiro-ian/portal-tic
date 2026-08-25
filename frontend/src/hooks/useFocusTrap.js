import { useEffect, useRef } from 'react';

const SELETOR_FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Prende a navegação por Tab dentro do elemento referenciado enquanto `ativo` for true, foca o
 * primeiro elemento focável ao abrir, e devolve o foco a quem abriu ao fechar. Mesma lógica já
 * usada no menu mobile (App.jsx), extraída para reaproveitar em Modal/SidePanel -- os dois abrem
 * por cima do conteúdo mas, sem isto, o Tab escapava para o que está escondido atrás.
 */
export function useFocusTrap(containerRef, ativo) {
  const elementoAnteriorRef = useRef(null);

  useEffect(() => {
    if (!ativo) return undefined;

    elementoAnteriorRef.current = document.activeElement;
    const container = containerRef.current;
    if (!container) return undefined;

    const focaveis = container.querySelectorAll(SELETOR_FOCAVEIS);
    focaveis[0]?.focus();

    const aoTeclarTab = (evento) => {
      if (evento.key !== 'Tab' || focaveis.length === 0) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    };

    container.addEventListener('keydown', aoTeclarTab);
    return () => {
      container.removeEventListener('keydown', aoTeclarTab);
      elementoAnteriorRef.current?.focus?.();
    };
  }, [ativo, containerRef]);
}
