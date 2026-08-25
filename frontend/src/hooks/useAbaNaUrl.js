import { useSearchParams } from 'react-router-dom';

/**
 * Guarda a aba ativa (ou outro filtro simples de string) num parâmetro de busca da URL em
 * vez de só em estado local. Sem isto, a aba resetava pra primeira toda vez que o usuário
 * saía da tela e voltava: `<main>` é remontado a cada troca de rota (App.jsx, key={pathname}),
 * então o estado do componente não sobrevive à navegação -- a URL sim.
 *
 * @param chave nome do parâmetro (ex.: "aba")
 * @param valorPadrao usado quando o parâmetro não está na URL; nunca é escrito explicitamente
 *                     (mantém a URL limpa quando está no valor "padrão")
 */
export function useAbaNaUrl(chave, valorPadrao) {
  const [searchParams, setSearchParams] = useSearchParams();
  const valor = searchParams.get(chave) || valorPadrao;

  const setValor = (novoValor) => {
    setSearchParams(
      (prev) => {
        const proximo = new URLSearchParams(prev);
        if (novoValor === valorPadrao) {
          proximo.delete(chave);
        } else {
          proximo.set(chave, novoValor);
        }
        return proximo;
      },
      { replace: true }
    );
  };

  return [valor, setValor];
}
