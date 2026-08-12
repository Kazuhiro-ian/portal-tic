import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useSlidePanel } from '../hooks/useSlidePanel.js';
import { useScrollLock } from '../hooks/useScrollLock.js';

// Substitui o Modal para formulários e detalhes. API deliberadamente parecida com a do Modal
// (isOpen/onClose/title/size) para a migração ser quase find-and-replace — ver PLANO-MOBILE.md §4.1.
//
// Diferenças que resolvem os problemas do Modal antigo:
// - Sem backdrop-blur (herda .panel-surface, sem blur) -> digitar não trava mais no iOS (§1.4a)
// - Ancorado na borda direita, não centralizado -> o teclado do iOS não empurra o conteúdo
//   pra fora da vista (§1.4d)
// - Rodapé fixo por padrão -> o botão "Salvar" nunca fica fora de alcance
// - Anima com transform (GPU), não opacity+scale do conteúdo inteiro

// Classes literais (não geradas por template string) para o Tailwind JIT conseguir escanear.
const WIDTH_CLASSES = {
  sm: 'md:w-[380px]',
  md: 'md:w-[480px]',
  lg: 'md:w-[640px]',
  xl: 'md:w-[820px]',
};

export function SidePanel({ isOpen, onClose, title, size = 'md', footer, children }) {
  const { mounted, visible } = useSlidePanel(isOpen);
  useScrollLock(isOpen);

  // Fechar com Esc, igual ao Modal.
  useEffect(() => {
    if (!isOpen) return undefined;
    const aoTeclar = (evento) => {
      if (evento.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [isOpen, onClose]);

  if (!mounted) return null;

  const larguraClasse = WIDTH_CLASSES[size] || WIDTH_CLASSES.md;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={`panel-surface absolute inset-y-0 right-0 w-full h-app ${larguraClasse} flex flex-col transition-transform duration-300 ease-out ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between p-5 border-b border-dark-700 shrink-0">
          <h2 className="text-lg font-semibold text-white pr-2">{title}</h2>
          <button
            onClick={onClose}
            className="w-11 h-11 rounded-lg bg-dark-700 hover:bg-dark-600 flex items-center justify-center shrink-0"
            aria-label="Fechar"
          >
            <X className="w-5 h-5 text-dark-300" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-thin p-5">{children}</div>

        {footer && (
          <div className="flex justify-end gap-3 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] border-t border-dark-700 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
