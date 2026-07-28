import { marked } from 'marked';
import DOMPurify from 'dompurify';

// breaks:true preserva as quebras de linha simples dos artigos já cadastrados (que hoje
// são texto puro) -- sem isso, o CommonMark padrão ignoraria \n solto dentro de um
// parágrafo, quebrando visualmente todo o conteúdo já existente.
marked.setOptions({ breaks: true });

/**
 * Converte markdown em HTML e sanitiza antes de renderizar. O conteúdo é escrito por
 * colaboradores da empresa, mas ainda assim é entrada de usuário -- nunca pular a
 * sanitização antes de um dangerouslySetInnerHTML.
 */
export function renderMarkdownSeguro(texto) {
  const html = marked.parse(texto || '');
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'ul', 'ol', 'li', 'a', 'code', 'pre', 'blockquote', 'h1', 'h2', 'h3'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
}
