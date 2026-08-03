import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal.jsx';

/**
 * Confirmação de ação destrutiva. Substitui o confirm() nativo, que ignora o tema escuro do
 * sistema, não dá para rotular os botões ("OK/Cancelar" em vez de "Excluir/Cancelar") e fica
 * especialmente ruim no mobile.
 *
 * Normalmente usado através do hook useConfirm, que embrulha isto numa Promise.
 */
export function ConfirmDialog({
  isOpen,
  titulo = 'Confirmar ação',
  mensagem,
  textoConfirmar = 'Excluir',
  textoCancelar = 'Cancelar',
  perigo = true,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={titulo} size="sm">
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
            perigo ? 'bg-red-500/15 border border-red-500/30' : 'bg-amber-500/15 border border-amber-500/30'
          }`}
        >
          <AlertTriangle className={`w-5 h-5 ${perigo ? 'text-red-400' : 'text-amber-400'}`} />
        </div>
        {/* whitespace-pre-line preserva as quebras de linha de mensagens com ressalva extra. */}
        <p className="text-dark-200 text-sm leading-relaxed whitespace-pre-line pt-2">{mensagem}</p>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button type="button" onClick={onCancel} className="btn-secondary">
          {textoCancelar}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={perigo ? 'btn-danger' : 'btn-primary'}
          autoFocus
        >
          {textoConfirmar}
        </button>
      </div>
    </Modal>
  );
}
