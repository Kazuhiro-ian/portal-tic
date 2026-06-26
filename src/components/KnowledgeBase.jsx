import { useState } from 'react';
import { Plus, Search, Edit, Trash2, Eye, EyeOff, Copy, Check, Network, Server, Cpu, Lock, BookOpen, Key } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { Modal } from './Modal.jsx';

const categoryInfo = {
  networks: { label: 'Redes', icon: Network, bgClass: 'bg-primary-500/20', textClass: 'text-primary-400' },
  systems: { label: 'Sistemas', icon: Server, bgClass: 'bg-accent-500/20', textClass: 'text-accent-400' },
  hardware: { label: 'Hardware', icon: Cpu, bgClass: 'bg-brand-500/20', textClass: 'text-brand-400' },
};

export function KnowledgeBase() {
  const [articles, setArticles] = useLocalStorage('ithub_articles', []);
  const [credentials, setCredentials] = useLocalStorage('ithub_credentials', []);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [activeTab, setActiveTab] = useState('articles');
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [showCredModal, setShowCredModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [editingCred, setEditingCred] = useState(null);
  const [visiblePasswords, setVisiblePasswords] = useState(new Set());
  const [copiedId, setCopiedId] = useState(null);

  const [articleForm, setArticleForm] = useState({
    title: '',
    category: 'networks',
    content: '',
    author: 'Admin TI',
  });

  const [credForm, setCredForm] = useState({
    name: '',
    username: '',
    password: '',
    notes: '',
  });

  const filteredArticles = articles.filter((a) => {
    const matchSearch = a.title.toLowerCase().includes(search.toLowerCase()) || a.content.toLowerCase().includes(search.toLowerCase());
    const matchCategory = filterCategory === 'all' || a.category === filterCategory;
    return matchSearch && matchCategory;
  });

  const filteredCredentials = credentials.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.username.toLowerCase().includes(search.toLowerCase())
  );

  const togglePasswordVisibility = (id) => {
    const newVisible = new Set(visiblePasswords);
    if (newVisible.has(id)) {
      newVisible.delete(id);
    } else {
      newVisible.add(id);
    }
    setVisiblePasswords(newVisible);
  };

  const copyToClipboard = async (text, id) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenArticleModal = (article) => {
    if (article) {
      setEditingArticle(article);
      setArticleForm({
        title: article.title,
        category: article.category,
        content: article.content,
        author: article.author,
      });
    } else {
      setEditingArticle(null);
      setArticleForm({ title: '', category: 'networks', content: '', author: 'Admin TI' });
    }
    setShowArticleModal(true);
  };

  const handleSaveArticle = () => {
    if (!articleForm.title.trim() || !articleForm.content.trim()) return;

    if (editingArticle) {
      setArticles(
        articles.map((a) =>
          a.id === editingArticle.id
            ? { ...a, ...articleForm }
            : a
        )
      );
    } else {
      const newArticle = {
        id: Date.now().toString(),
        ...articleForm,
        createdAt: new Date().toISOString().split('T')[0],
      };
      setArticles([newArticle, ...articles]);
    }
    setShowArticleModal(false);
  };

  const handleDeleteArticle = (id) => {
    if (confirm('Tem certeza que deseja excluir este artigo?')) {
      setArticles(articles.filter((a) => a.id !== id));
    }
  };

  const handleOpenCredModal = (cred) => {
    if (cred) {
      setEditingCred(cred);
      setCredForm({ name: cred.name, username: cred.username, password: cred.password, notes: cred.notes || '' });
    } else {
      setEditingCred(null);
      setCredForm({ name: '', username: '', password: '', notes: '' });
    }
    setShowCredModal(true);
  };

  const handleSaveCred = () => {
    if (!credForm.name.trim() || !credForm.username.trim() || !credForm.password.trim()) return;

    if (editingCred) {
      setCredentials(
        credentials.map((c) =>
          c.id === editingCred.id ? { ...c, ...credForm } : c
        )
      );
    } else {
      const newCred = {
        id: Date.now().toString(),
        ...credForm,
      };
      setCredentials([newCred, ...credentials]);
    }
    setShowCredModal(false);
  };

  const handleDeleteCred = (id) => {
    if (confirm('Tem certeza que deseja excluir esta credencial?')) {
      setCredentials(credentials.filter((c) => c.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Base de Conhecimento</h1>
          <p className="text-dark-400 mt-1">Procedimentos e credenciais de acesso</p>
        </div>
        <button
          onClick={() => activeTab === 'articles' ? handleOpenArticleModal() : handleOpenCredModal()}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          {activeTab === 'articles' ? 'Novo Artigo' : 'Nova Credencial'}
        </button>
      </div>

      <div className="flex gap-2 p-1 bg-dark-800 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('articles')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'articles' ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-white'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Artigos
        </button>
        <button
          onClick={() => setActiveTab('credentials')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'credentials' ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-white'
          }`}
        >
          <Key className="w-4 h-4" />
          Credenciais
        </button>
      </div>

      {activeTab === 'articles' && (
        <div className="card">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
              <input
                type="text"
                placeholder="Buscar artigos..."
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
            {filteredArticles.length === 0 ? (
              <p className="text-dark-400 col-span-full text-center py-12">Nenhum artigo encontrado</p>
            ) : (
              filteredArticles.map((article) => {
                const info = categoryInfo[article.category];
                const Icon = info.icon;
                return (
                  <div key={article.id} className="p-4 rounded-lg bg-dark-700/50 border border-dark-600 hover:border-dark-500 transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`w-10 h-10 ${info.bgClass} rounded-lg flex items-center justify-center shrink-0`}>
                          <Icon className={`w-5 h-5 ${info.textClass}`} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-medium text-white">{article.title}</h3>
                          <span className="badge badge-info mt-1">{info.label}</span>
                          <p className="text-xs text-dark-400 mt-2">
                            Por {article.author} em {new Date(article.createdAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleOpenArticleModal(article)}
                          className="btn-secondary px-2 py-1"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteArticle(article.id)}
                          className="btn-danger px-2 py-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-dark-600">
                      <pre className="text-sm text-dark-300 whitespace-pre-wrap font-sans">{article.content}</pre>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {activeTab === 'credentials' && (
        <div className="card">
          <div className="flex items-center gap-2 mb-6 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
            <Lock className="w-5 h-5 text-yellow-400" />
            <p className="text-sm text-yellow-200">Cofre de credenciais de acesso comum a equipamentos de infraestrutura</p>
          </div>

          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              placeholder="Buscar credenciais..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>

          <div className="space-y-3">
            {filteredCredentials.length === 0 ? (
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
                      <p className="text-xs text-dark-400 mb-1">Usuario</p>
                      <div className="flex items-center gap-2">
                        <code className="text-primary-400 bg-dark-600 px-2 py-1 rounded text-sm">{cred.username}</code>
                        <button
                          onClick={() => copyToClipboard(cred.username, `${cred.id}-user`)}
                          className="btn-secondary px-2 py-1"
                        >
                          {copiedId === `${cred.id}-user` ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-dark-400 mb-1">Senha</p>
                      <div className="flex items-center gap-2">
                        <code className="text-dark-300 bg-dark-600 px-2 py-1 rounded text-sm font-mono">
                          {visiblePasswords.has(cred.id) ? cred.password : '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
                        </code>
                        <button
                          onClick={() => togglePasswordVisibility(cred.id)}
                          className="btn-secondary px-2 py-1"
                        >
                          {visiblePasswords.has(cred.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => copyToClipboard(cred.password, `${cred.id}-pass`)}
                          className="btn-secondary px-2 py-1"
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

      <Modal
        isOpen={showArticleModal}
        onClose={() => setShowArticleModal(false)}
        title={editingArticle ? 'Editar Artigo' : 'Novo Artigo'}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Titulo *</label>
            <input
              type="text"
              value={articleForm.title}
              onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })}
              className="input-field"
              placeholder="Ex: Configuracao de VPN Corporativa"
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
            <label className="block text-sm font-medium text-dark-300 mb-2">Conteudo *</label>
            <textarea
              value={articleForm.content}
              onChange={(e) => setArticleForm({ ...articleForm, content: e.target.value })}
              className="input-field min-h-[200px] resize-none font-mono"
              placeholder="Digite o procedimento passo a passo..."
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setShowArticleModal(false)} className="btn-secondary">Cancelar</button>
            <button onClick={handleSaveArticle} className="btn-primary">{editingArticle ? 'Salvar' : 'Adicionar'}</button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showCredModal}
        onClose={() => setShowCredModal(false)}
        title={editingCred ? 'Editar Credencial' : 'Nova Credencial'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Nome do Equipamento *</label>
            <input
              type="text"
              value={credForm.name}
              onChange={(e) => setCredForm({ ...credForm, name: e.target.value })}
              className="input-field"
              placeholder="Ex: Switch Core andar 1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Usuario *</label>
            <input
              type="text"
              value={credForm.username}
              onChange={(e) => setCredForm({ ...credForm, username: e.target.value })}
              className="input-field"
              placeholder="Ex: admin"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Senha *</label>
            <input
              type="text"
              value={credForm.password}
              onChange={(e) => setCredForm({ ...credForm, password: e.target.value })}
              className="input-field"
              placeholder="Digite a senha"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Notas</label>
            <input
              type="text"
              value={credForm.notes}
              onChange={(e) => setCredForm({ ...credForm, notes: e.target.value })}
              className="input-field"
              placeholder="Ex: IP: 192.168.0.1 - Switch principal"
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setShowCredModal(false)} className="btn-secondary">Cancelar</button>
            <button onClick={handleSaveCred} className="btn-primary">{editingCred ? 'Salvar' : 'Adicionar'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
