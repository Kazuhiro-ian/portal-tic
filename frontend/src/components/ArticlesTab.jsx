import { useState, forwardRef, useImperativeHandle } from 'react';
import { Edit, Trash2, Network, Server, Cpu, ArrowRight, Copy } from 'lucide-react';
import { SidePanel } from './SidePanel.jsx';
import { FiltroBar } from './FiltroBar.jsx';
import { salvarArtigo, atualizarArtigo, deletarArtigo } from '../services/api.js';
import { renderMarkdownSeguro } from '../utils/markdown.js';

const categoryInfo = {
  networks: { label: 'Redes', icon: Network, bgClass: 'bg-primary-500/20', textClass: 'text-primary-400' },
  systems: { label: 'Sistemas', icon: Server, bgClass: 'bg-accent-500/20', textClass: 'text-accent-400' },
  hardware: { label: 'Hardware', icon: Cpu, bgClass: 'bg-brand-500/20', textClass: 'text-brand-400' },
};

const emptyArticleForm = { title: '', category: 'networks', summary: '', content: '', author: 'Admin TI' };

/**
 * Aba de Artigos da Base de Conhecimento. Recebe os dados e o callback de recarregar do
 * componente pai (KnowledgeBase) -- que também busca as credenciais para o contador da aba
 * "Credenciais" ficar certo mesmo sem essa aba nunca ter sido aberta -- mas é dona da própria
 * busca, filtro e modais. O botão "Novo Artigo" fica no cabeçalho da página (fora daqui), por
 * isso expõe `abrirNovo` via ref.
 */
export const ArticlesTab = forwardRef(function ArticlesTab(
  { articles, isLoading, canWrite, onAtualizado, showToast, confirmar },
  ref,
) {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [viewingArticle, setViewingArticle] = useState(null);
  const [articleForm, setArticleForm] = useState(emptyArticleForm);

  const filteredArticles = articles.filter((a) => {
    const matchSearch =
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      (a.summary && a.summary.toLowerCase().includes(search.toLowerCase())) ||
      a.content.toLowerCase().includes(search.toLowerCase());
    const matchCategory = filterCategory === 'all' || a.category === filterCategory;
    return matchSearch && matchCategory;
  });

  const handleOpenArticleModal = (article) => {
    if (article) {
      setEditingArticle(article);
      setArticleForm({
        title: article.title || '',
        category: article.category || 'networks',
        summary: article.summary || '',
        content: article.content || '',
        author: article.author || 'Admin TI',
      });
    } else {
      setEditingArticle(null);
      setArticleForm(emptyArticleForm);
    }
    setShowArticleModal(true);
  };

  useImperativeHandle(ref, () => ({
    abrirNovo: () => handleOpenArticleModal(),
  }));

  const copyToClipboard = async (text) => {
    await navigator.clipboard.writeText(text);
    showToast('Copiado para a área de transferência!');
  };

  const handleSaveArticle = async () => {
    if (!articleForm.title.trim() || !articleForm.content.trim()) {
      showToast('Título e Conteúdo são obrigatórios.', 'error');
      return;
    }

    // Se o resumo não foi informado, gera um automático das primeiras linhas
    const finalSummary = articleForm.summary.trim()
      ? articleForm.summary.trim()
      : articleForm.content.substring(0, 150) + '...';

    try {
      const payload = { ...articleForm, summary: finalSummary };

      if (editingArticle) {
        await atualizarArtigo(editingArticle.id, payload);
        showToast('Artigo atualizado com sucesso!');
      } else {
        await salvarArtigo(payload);
        showToast('Novo artigo cadastrado!');
      }

      await onAtualizado();
      setShowArticleModal(false);
      setEditingArticle(null);
      setArticleForm(emptyArticleForm);
    } catch (error) {
      showToast('Erro ao salvar artigo.', 'error');
    }
  };

  const handleDeleteArticle = async (id, e) => {
    if (e) e.stopPropagation(); // Evita abrir o modal de leitura ao clicar em deletar
    const confirmado = await confirmar({
      titulo: 'Excluir artigo',
      mensagem: 'Tem certeza que deseja excluir este artigo da base de conhecimento?',
    });
    if (!confirmado) return;

    try {
      await deletarArtigo(id);
      showToast('Artigo excluído com sucesso.');
      if (viewingArticle && viewingArticle.id === id) setViewingArticle(null);
      await onAtualizado();
    } catch (error) {
      showToast('Erro ao excluir artigo.', 'error');
    }
  };

  return (
    <>
      <div className="card">
        <FiltroBar
          busca={search}
          onBuscaChange={setSearch}
          placeholderBusca="Buscar por título ou conteúdo do artigo..."
          filtros={[
            {
              chave: 'categoria',
              label: 'Categoria',
              tipo: 'select',
              valor: filterCategory,
              valorPadrao: 'all',
              opcoes: [
                { value: 'all', label: 'Todas Categorias' },
                ...Object.entries(categoryInfo).map(([key, info]) => ({ value: key, label: info.label })),
              ],
              onChange: setFilterCategory,
            },
          ]}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {isLoading ? (
            <p className="text-dark-400 col-span-full text-center py-12">Carregando artigos...</p>
          ) : filteredArticles.length === 0 ? (
            <p className="text-dark-400 col-span-full text-center py-12">Nenhum artigo encontrado</p>
          ) : (
            filteredArticles.map((article) => {
              const info = categoryInfo[article.category] || categoryInfo.networks;
              const Icon = info.icon;
              return (
                <div
                  key={article.id}
                  onClick={() => setViewingArticle(article)}
                  className="p-5 rounded-xl bg-dark-700/50 border border-dark-600 hover:border-primary-500/50 transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 ${info.bgClass} rounded-lg flex items-center justify-center shrink-0`}>
                          <Icon className={`w-5 h-5 ${info.textClass}`} />
                        </div>
                        <div className="min-w-0">
                          <span className="badge badge-info mb-1">{info.label}</span>
                          <h3 className="font-semibold text-white text-base group-hover:text-primary-400 transition-colors line-clamp-1">
                            {article.title}
                          </h3>
                        </div>
                      </div>
                      {canWrite && (
                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleOpenArticleModal(article)}
                            className="btn-secondary px-2 py-1"
                            title="Editar" aria-label="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteArticle(article.id, e)}
                            className="btn-danger px-2 py-1"
                            title="Excluir" aria-label="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Resumo do Artigo */}
                    <p className="text-sm text-dark-300 mt-3 line-clamp-3 leading-relaxed">
                      {article.summary || article.content}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-dark-600/60 flex items-center justify-between text-xs text-dark-400">
                    <span>Por <strong className="text-dark-200">{article.author}</strong> em {article.createdAt ? new Date(article.createdAt).toLocaleDateString('pt-BR') : 'Data n/a'}</span>
                    <span className="flex items-center gap-1 text-primary-400 font-medium group-hover:translate-x-0.5 transition-transform">
                      Ler artigo completo <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* PAINEL: VISUALIZADOR DE ARTIGO COMPLETO */}
      <SidePanel
        isOpen={!!viewingArticle}
        onClose={() => setViewingArticle(null)}
        title="Documentação do Procedimento"
        size="lg"
      >
        {viewingArticle && (
          <div className="space-y-4">
            <div className="border-b border-dark-700 pb-4">
              <span className="badge badge-info mb-2">
                {categoryInfo[viewingArticle.category]?.label || 'Redes'}
              </span>
              <h2 className="text-xl font-bold text-white">{viewingArticle.title}</h2>
              <p className="text-xs text-dark-400 mt-1">
                Publicado por <span className="text-dark-200">{viewingArticle.author}</span> em {viewingArticle.createdAt ? new Date(viewingArticle.createdAt).toLocaleDateString('pt-BR') : 'Data n/a'}
              </p>
            </div>

            {/* Conteúdo do artigo, com suporte a markdown (negrito, listas, links) */}
            <div className="bg-dark-900/60 p-4 rounded-xl border border-dark-700 max-h-[60vh] overflow-y-auto">
              <div
                className="text-sm text-dark-200 leading-relaxed [&_a]:text-primary-400 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-semibold [&_strong]:text-white"
                dangerouslySetInnerHTML={{ __html: renderMarkdownSeguro(viewingArticle.content) }}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => copyToClipboard(viewingArticle.content)}
                className="btn-secondary text-xs"
              >
                <Copy className="w-4 h-4" />
                Copiar Texto
              </button>

              <div className="flex gap-2">
                {canWrite && (
                  <button
                    onClick={() => {
                      const art = viewingArticle;
                      setViewingArticle(null);
                      handleOpenArticleModal(art);
                    }}
                    className="btn-secondary"
                  >
                    <Edit className="w-4 h-4" />
                    Editar
                  </button>
                )}
                <button onClick={() => setViewingArticle(null)} className="btn-primary">
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </SidePanel>

      {/* PAINEL: CRIAR / EDITAR ARTIGO */}
      <SidePanel
        isOpen={showArticleModal}
        onClose={() => setShowArticleModal(false)}
        title={editingArticle ? 'Editar Artigo' : 'Novo Artigo de Conhecimento'}
        size="lg"
        footer={
          <>
            <button onClick={() => setShowArticleModal(false)} className="btn-secondary">Cancelar</button>
            <button onClick={handleSaveArticle} className="btn-primary">
              {editingArticle ? 'Salvar Alterações' : 'Publicar Artigo'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="artigo-titulo" className="block text-sm font-medium text-dark-300 mb-2">Título do Artigo *</label>
            <input
              id="artigo-titulo"
              type="text"
              value={articleForm.title}
              onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })}
              className="input-field"
              placeholder="Ex: Passo a Passo para Configuração de VPN Corporativa"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="artigo-categoria" className="block text-sm font-medium text-dark-300 mb-2">Categoria</label>
              <select
                id="artigo-categoria"
                value={articleForm.category}
                onChange={(e) => setArticleForm({ ...articleForm, category: e.target.value })}
                className="select-field"
              >
                {Object.entries(categoryInfo).map(([key, info]) => (
                  <option key={key} value={key}>{info.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="artigo-autor" className="block text-sm font-medium text-dark-300 mb-2">Autor</label>
              <input
                id="artigo-autor"
                type="text"
                value={articleForm.author}
                onChange={(e) => setArticleForm({ ...articleForm, author: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label htmlFor="artigo-resumo" className="block text-sm font-medium text-dark-300 mb-2">Resumo Explicativo (opcional)</label>
            <input
              id="artigo-resumo"
              type="text"
              value={articleForm.summary}
              onChange={(e) => setArticleForm({ ...articleForm, summary: e.target.value })}
              className="input-field"
              placeholder="Breve resumo para ser exibido no card..."
            />
          </div>

          <div>
            <label htmlFor="artigo-conteudo" className="block text-sm font-medium text-dark-300 mb-2">Conteúdo / Procedimento Passo a Passo *</label>
            <textarea
              id="artigo-conteudo"
              value={articleForm.content}
              onChange={(e) => setArticleForm({ ...articleForm, content: e.target.value })}
              className="input-field min-h-[220px] resize-none font-sans leading-relaxed"
              placeholder="1. Acesse o IP 192.168.1.1&#10;2. Insira as credenciais padrão&#10;3. Selecione a opção..."
            />
            <p className="text-xs text-dark-400 mt-1.5">
              Suporta **negrito**, listas (linhas começando com &quot;- &quot;), e [links](https://exemplo.com).
            </p>
          </div>
        </div>
      </SidePanel>
    </>
  );
});
