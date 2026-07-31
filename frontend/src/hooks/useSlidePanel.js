import { useEffect, useState } from 'react';

// Controla um painel lateral animado (entrada e saída), separando duas perguntas:
// "está no DOM?" (mounted) e "está com o estilo aberto?" (visible). Ao abrir, o painel
// nasce no DOM já fechado (visible=false) e só dois requestAnimationFrame depois vira
// visible=true, dando ao CSS um valor de onde partir pra animar. Ao fechar, visible some
// na hora (anima a saída) e só depois de transitionMs o painel realmente sai do DOM.
export function useSlidePanel(open, transitionMs = 300) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
    } else {
      setVisible(false);
      if (mounted) {
        const timer = setTimeout(() => setMounted(false), transitionMs);
        return () => clearTimeout(timer);
      }
    }
  }, [open]);

  useEffect(() => {
    if (mounted && open) {
      const raf1 = requestAnimationFrame(() => {
        const raf2 = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(raf2);
      });
      return () => cancelAnimationFrame(raf1);
    }
  }, [mounted, open]);

  return { mounted, visible };
}
