import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Eye, EyeOff, Copy, Check, Network, Server, Cpu, Lock, BookOpen, Key, CheckCircle2, AlertCircle, X, ArrowRight, FileText } from 'lucide-react';
import { Modal } from './Modal.jsx';
import {
  listarArtigos, salvarArtigo, atualizarArtigo, deletarArtigo,
  listarCredenciais, salvarCredencial, atualizarCredencial, deletarCredencial
} from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const categoryInfo = {
  networks: { label: 'Redes', icon: Network, bgClass: 'bg-primary-500/20', textClass: 'text-primary-400' },
  systems: { label: 'Sistemas', icon: Server, bgClass: 'bg-accent-500/20', textClass: 'text-accent-400' },
  hardware: { label: 'Hardware', icon: Cpu, bgClass: 'bg-brand-500/20', textClass: 'text-brand-400' },
};

const emptyArticleForm = { title: '', category: 'networks', summary: '', content: '', author: 'Admin TI' };
const emptyCredForm = { name: '', username: '', password: '', notes: '' };

export function KnowledgeBase() {
  const { canWrite, hasRole } = useAuth();
  const podeVerCredenciais = hasRole('ADMIN', 'TECNICO');

  const [articles, setArticles] = useState([]);
  const [credentials, setCredentials] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [activeTab, setActiveTab] = useState('articles');

  // Modais de Criação / Edição
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [showCredModal, setShowCredModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [editingCred, setEditingCred] = useState(null);

  // Novo Modal para Leitura do Artigo Completo
  const [viewingArticle, setViewingArticle] = useState(null);

  const [visiblePasswords, setVisiblePasswords] = useState(new Set());
  const [copiedId, setCopiedId] = useState(null);

  const [articleForm, setArticleForm] = useState(emptyArticleForm);
  const [credForm, setCredForm] = useState(emptyCredForm);

  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => { setToast(null); }, 4000);
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setIsLoading(true);
      const [artigosData, credsData] = await Promise.all([
        listarArtigos(),
        podeVerCredenciais ? listarCredenciais() : Promise.resolve([]),
      ]);
      setArticles(artigosData);
      setCredentials(credsData);
    } catch (error) {
      console.error(error);
      showToast('Erro ao carregar dados do banco.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredArticles = articles.filter((a) => {
    const matchSearch = 
      a.title.toLowerCase().includes(search.toLowerCase()) || 
      (a.summary && a.summary.toLowerCase().includes(search.toLowerCase())) ||
      a.content.toLowerCase().includes(search.toLowerCase());
    const matchCategory = filterCategory === 'all' || a.category === filterCategory;
    return matchSearch && matchCategory;
  });

  const filteredCredentials = credentials.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.username.toLowerCase().includes(search.toLowerCase()) ||
    (c.notes && c.notes.toLowerCase().includes(search.toLowerCase()))
  );

  const togglePasswordVisibility = (id) => {
    const newVisible = new Set(visiblePasswords);
    if (newVisible.has(id)) newVisible.delete(id);
    else newVisible.add(id);
    setVisiblePasswords(newVisible);
  };

  const copyToClipboard = async (text, id) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Copiado para a área de transferência!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // --- Ações de Artigos ---
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

      await carregarDados();
      setShowArticleModal(false);
      setEditingArticle(null);
      setArticleForm(emptyArticleForm);
    } catch (error) {
      showToast('Erro ao salvar artigo.', 'error');
    }
  };

  const handleDeleteArticle = async (id, e) => {
    if (e) e.stopPropagation(); // Evita abrir o modal de leitura ao clicar em deletar
    if (confirm('Tem certeza que deseja excluir este artigo?')) {
      try {
        await deletarArtigo(id);
        showToast('Artigo excluído com sucesso.');
        if (viewingArticle && viewingArticle.id === id) setViewingArticle(null);
        await carregarDados();
      } catch (error) {
        showToast('Erro ao excluir artigo.', 'error');
      }
    }
  };

  // --- Ações de Credenciais ---
  const handleOpenCredModal = (cred) => {
    if (cred) {
      setEditingCred(cred);
      setCredForm({
        name: cred.name || '',
        username: cred.username || '',
        password: cred.password || '',
        notes: cred.notes || '',
      });
    } else {
      setEditingCred(null);
      setCredForm(emptyCredForm);
    }
    setShowCredModal(true);
  };

  const handleSaveCred = async () => {
    if (!credForm.name.trim() || !credForm.username.trim() || !credForm.password.trim()) {
      showToast('Nome, Usuário e Senha são obrigatórios.', 'error');
      return;
    }

    try {
      if (editingCred) {
        await atualizarCredencial(editingCred.id, credForm);
        showToast('Credencial atualizada com sucesso!');
      } else {
        await salvarCredencial(credForm);
        showToast('Nova credencial adicionada!');
      }

      await carregarDados();
      setShowCredModal(false);
      setEditingCred(null);
      setCredForm(emptyCredForm);
    } catch (error) {
      showToast('Erro ao salvar credencial.', 'error');
    }
  };

  const handleDeleteCred = async (id) => {
    if (confirm('Tem certeza que deseja excluir esta credencial?')) {
      try {
        await deletarCredencial(id);
        showToast('Credencial excluída.');
        await carregarDados();
      } catch (error) {
        showToast('Erro ao excluir credencial.', 'error');
      }
    }
  };

  return (
    <div className="space-y-6 relative">
      
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border bg-dark-800 text-white transition-all">
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-dark-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Base de Conhecimento</h1>
          <p className="text-dark-400 mt-1">Procedimentos operacionais e cofre de credenciais</p>
        </div>
        {canWrite && (activeTab === 'articles' || podeVerCredenciais) && (
          <button
            onClick={() => activeTab === 'articles' ? handleOpenArticleModal() : handleOpenCredModal()}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            {activeTab === 'articles' ? 'Novo Artigo' : 'Nova Credencial'}
          </button>
        )}
      </div>

      <div className="flex gap-2 p-1 bg-dark-800 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('articles')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
            activeTab === 'articles' ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-white'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Artigos ({articles.length})
        </button>
        {podeVerCredenciais && (
          <button
            onClick={() => setActiveTab('credentials')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
              activeTab === 'credentials' ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-white'
            }`}
          >
            <Key className="w-4 h-4" />
            Credenciais ({credentials.length})
          </button>
        )}
      </div>

      {/* ABA DE ARTIGOS */}
      {activeTab === 'articles' && (
        <div className="card">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
              <input
                type="text"
                placeholder="Buscar por título ou conteúdo do artigo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-10"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="select-field sm:w-48"
            >
              <option value="all">Todas Categorias</option>
              {Object.entries(categoryInfo).map(([key, info]) => (
                <option key={key} value={key}>{info.label}</option>
              ))}
            </select>
          </div>

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
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteArticle(article.id, e)}
                              className="btn-danger px-2 py-1"
                              title="Excluir"
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
      )}

      {/* ABA DE CREDENCIAIS */}
      {activeTab === 'credentials' && podeVerCredenciais && (
        <div className="card">
          <div className="flex items-center gap-2 mb-6 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
            <Lock className="w-5 h-5 text-yellow-400 shrink-0" />
            <p className="text-sm text-yellow-200">Cofre seguro de credenciais de acesso para switches, servidores e roteadores da infraestrutura.</p>
          </div>

          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              placeholder="Buscar por nome do equipamento, usuário ou notas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <p className="text-dark-400 text-center py-12">Carregando credenciais...</p>
            ) : filteredCredentials.length === 0 ? (
              <p className="text-dark-400 text-center py-12">Nenhuma credencial encontrada</p>
            ) : (
              filteredCredentials.map((cred) => (
                <div
                  key={cred.id}
                  className="p-4 rounded-lg bg-dark-700/50 border border-dark-600 hover:border-dark-500 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white">{cred.name}</h3>
                      {cred.notes && <p className="text-xs text-dark-400 mt-1">{cred.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleOpenCredModal(cred)}
                        className="btn-secondary px-2 py-1"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCred(cred.id)}
                        className="btn-danger px-2 py-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-dark-600">
                    <div>
                      <p className="text-xs text-dark-400 mb-1">Usuário</p>
                      <div className="flex items-center gap-2">
                        <code className="text-primary-400 bg-dark-600 px-2.5 py-1 rounded text-sm font-mono">{cred.username}</code>
                        <button
                          onClick={() => copyToClipboard(cred.username, `${cred.id}-user`)}
                          className="btn-secondary px-2 py-1"
                          title="Copiar Usuário"
                        >
                          {copiedId === `${cred.id}-user` ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-dark-400 mb-1">Senha</p>
                      <div className="flex items-center gap-2">
                        <code className="text-dark-300 bg-dark-600 px-2.5 py-1 rounded text-sm font-mono">
                          {visiblePasswords.has(cred.id) ? cred.password : '••••••••••••'}
                        </code>
                        <button
                          onClick={() => togglePasswordVisibility(cred.id)}
                          className="btn-secondary px-2 py-1"
                          title="Exibir/Ocultar"
                        >
                          {visiblePasswords.has(cred.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => copyToClipboard(cred.password, `${cred.id}-pass`)}
                          className="btn-secondary px-2 py-1"
                          title="Copiar Senha"
                        >
                          {copiedId === `${cred.id}-pass` ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: VISUALIZADOR DE ARTIGO COMPLETO */}
      <Modal
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

            {/* Conteúdo do Artigo Formatado com Barra de Rolagem Suave */}
            <div className="bg-dark-900/60 p-4 rounded-xl border border-dark-700 max-h-[60vh] overflow-y-auto">
              <pre className="text-sm text-dark-200 whitespace-pre-wrap font-sans leading-relaxed">
                {viewingArticle.content}
              </pre>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button 
                onClick={() => copyToClipboard(viewingArticle.content, `art-${viewingArticle.id}`)}
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
      </Modal>

      {/* MODAL 2: CRIAR / EDITAR ARTIGO */}
      <Modal
        isOpen={showArticleModal}
        onClose={() => setShowArticleModal(false)}
        title={editingArticle ? 'Editar Artigo' : 'Novo Artigo de Conhecimento'}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Título do Artigo *</label>
            <input
              type="text"
              value={articleForm.title}
              onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })}
              className="input-field"
              placeholder="Ex: Passo a Passo para Configuração de VPN Corporativa"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Categoria</label>
              <select
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
              <label className="block text-sm font-medium text-dark-300 mb-2">Autor</label>
              <input
                type="text"
                value={articleForm.author}
                onChange={(e) => setArticleForm({ ...articleForm, author: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Resumo Explicativo (opcional)</label>
            <input
              type="text"
              value={articleForm.summary}
              onChange={(e) => setArticleForm({ ...articleForm, summary: e.target.value })}
              className="input-field"
              placeholder="Breve resumo para ser exibido no card..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Conteúdo / Procedimento Passo a Passo *</label>
            <textarea
              value={articleForm.content}
              onChange={(e) => setArticleForm({ ...articleForm, content: e.target.value })}
              className="input-field min-h-[220px] resize-none font-sans leading-relaxed"
              placeholder="1. Acesse o IP 192.168.1.1&#10;2. Insira as credenciais padrão&#10;3. Selecione a opção..."
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setShowArticleModal(false)} className="btn-secondary">Cancelar</button>
            <button onClick={handleSaveArticle} className="btn-primary">
              {editingArticle ? 'Salvar Alterações' : 'Publicar Artigo'}
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL 3: CRIAR / EDITAR CREDENCIAL */}
      <Modal
        isOpen={showCredModal}
        onClose={() => setShowCredModal(false)}
        title={editingCred ? 'Editar Credencial' : 'Nova Credencial de Acesso'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Nome do Equipamento / Sistema *</label>
            <input
              type="text"
              value={credForm.name}
              onChange={(e) => setCredForm({ ...credForm, name: e.target.value })}
              className="input-field"
              placeholder="Ex: Switch Core - Andar 1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Usuário de Acesso *</label>
            <input
              type="text"
              value={credForm.username}
              onChange={(e) => setCredForm({ ...credForm, username: e.target.value })}
              className="input-field font-mono"
              placeholder="Ex: admin"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Senha *</label>
            <input
              type="text"
              value={credForm.password}
              onChange={(e) => setCredForm({ ...credForm, password: e.target.value })}
              className="input-field font-mono"
              placeholder="Digite a senha"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Notas / IP de Acesso (opcional)</label>
            <input
              type="text"
              value={credForm.notes}
              onChange={(e) => setCredForm({ ...credForm, notes: e.target.value })}
              className="input-field"
              placeholder="Ex: IP: 10.100.0.1 - Porta 22 SSH"
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setShowCredModal(false)} className="btn-secondary">Cancelar</button>
            <button onClick={handleSaveCred} className="btn-primary">
              {editingCred ? 'Salvar Alterações' : 'Adicionar Credencial'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}