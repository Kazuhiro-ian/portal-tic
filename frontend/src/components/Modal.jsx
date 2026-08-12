import { X } from 'lucide-react';
import { useEffect } from 'react';
import { useScrollLock } from '../hooks/useScrollLock.js';

export function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  // Contador de travas em vez de `overflow: hidden` direto no body: essa lógica antiga
  // destravava o fundo ao fechar QUALQUER modal, mesmo com outro ainda aberto por baixo
  // (ex.: ConfirmDialog dentro de outro modal). Ver PLANO-MOBILE.md §1.4b.
  useScrollLock(isOpen);

  // Fechar com Esc: o clique no overlay já fechava, mas quem usa teclado ficava preso no modal.
  useEffect(() => {
    if (!isOpen) return undefined;
    const aoTeclar = (evento) => {
      if (evento.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-content ${sizeClasses[size]} mx-4 animate-in fade-in zoom-in duration-200`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between p-6 border-b border-dark-700">
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="w-11 h-11 rounded-lg bg-dark-700 hover:bg-dark-600 flex items-center justify-center transition-colors shrink-0"
            aria-label="Fechar"
          >
            <X className="w-5 h-5 text-dark-300" />
          </button>
        </div>
        <div className="modal-scroll-area">{children}</div>
      </div>
    </div>
  );
}
