import { useState, useCallback } from 'react';

// Toast único na tela por vez: mostrar um novo substitui o anterior em vez de empilhar.
export function useToast() {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000); // some sozinho após 4s
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  return { toast, showToast, hideToast };
}