import { useCallback, useRef, useState } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog.jsx';

/**
 * Confirmação em forma de Promise, para substituir o confirm() nativo sem virar o código do
 * avesso: o ponto de chamada continua sendo uma linha, só que com await.
 *
 *   const { confirmar, dialogoConfirmacao } = useConfirm();
 *
 *   const excluir = async () => {
 *     if (!(await confirmar({ mensagem: 'Excluir este item?' }))) return;
 *     ...
 *   };
 *
 *   return (<> ...  {dialogoConfirmacao} </>);
 */
export function useConfirm() {
  const [opcoes, setOpcoes] = useState(null);
  // Guarda o resolve da Promise em aberto entre renders, até o usuário responder.
  const resolverRef = useRef(null);

  const confirmar = useCallback((novasOpcoes) => {
    setOpcoes(novasOpcoes);
    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const responder = useCallback((resposta) => {
    setOpcoes(null);
    const resolver = resolverRef.current;
    resolverRef.current = null;
    if (resolver) resolver(resposta);
  }, []);

  const dialogoConfirmacao = (
    <ConfirmDialog
      isOpen={opcoes !== null}
      {...(opcoes || {})}
      onConfirm={() => responder(true)}
      onCancel={() => responder(false)}
    />
  );

  return { confirmar, dialogoConfirmacao };
}
