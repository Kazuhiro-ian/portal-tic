import { CheckCircle2, AlertCircle, X } from 'lucide-react';

/**
 * Aviso flutuante de sucesso/erro. Nasceu de oito cópias byte a byte deste mesmo bloco,
 * espalhadas pelos componentes de listagem — agora todas apontam para cá.
 *
 * Espera o estado do hook useToast:
 *   const { toast, showToast, hideToast } = useToast();
 *   <Toast toast={toast} onClose={hideToast} />
 */
export function Toast({ toast, onClose }) {
  if (!toast) return null;

  const sucesso = toast.type === 'success';

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border bg-dark-800 text-white transition-all"
      // "status" para avisos comuns e "alert" para erros: leitores de tela interrompem
      // o usuário no caso de erro, mas não no de sucesso.
      role={sucesso ? 'status' : 'alert'}
    >
      {sucesso ? (
        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
      ) : (
        <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
      )}
      <span className="text-sm font-medium">{toast.message}</span>
      <button onClick={onClose} className="ml-2 text-dark-400 hover:text-white" aria-label="Fechar aviso">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
