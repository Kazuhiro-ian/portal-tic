import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, ExternalLink, Cloud, Server, Zap, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { Modal } from './Modal.jsx';
import { listarLinks, salvarLink, atualizarLink, deletarLink } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const categoryLabels = {
  internal: 'Sistemas Internos',
  cloud: 'Ferramentas de Nuvem',
  infrastructure: 'Infraestrutura',
};

const categoryIcons = {
  internal: Server,
  cloud: Cloud,
  infrastructure: Zap,
};

const emptyForm = { name: '', url: '', category: 'internal', tags: '' };

export function LinksManager() {
  const { canWrite } = useAuth();
  const [links, setLinks] = useState([]);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(true);

  // Sistema de Notificações
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
      const data = await listarLinks();
      setLinks(data);
    } catch (error) {
      console.error(error);
      showToast('Erro ao carregar os links do banco de dados.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLinks = links.filter((link) => {
    const matchSearch =
      (link.name && link.name.toLowerCase().includes(search.toLowerCase())) ||
      (link.tags && link.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())));
    const matchCategory = filterCategory === 'all' || link.category === filterCategory;
    return matchSearch && matchCategory;
  });

  const handleOpenModal = (link) => {
    if (link) {
      setEditingLink(link);
      setFormData({
        name: link.name || '',
        url: link.url || '',
        category: link.category || 'internal',
        tags: link.tags?.join(', ') || '',
      });
    } else {
      setEditingLink(null);
      setFormData(emptyForm);
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.url.trim()) {
      showToast('Nome e URL são obrigatórios.', 'error');
      return;
    }

    // Formatação de URL para garantir que links funcionem externamente
    let finalUrl = formData.url.trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }

    const tagsArray = formData.tags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t);

    try {
      const payload = {
        name: formData.name.trim(),
        url: finalUrl,
        category: formData.category,
        tags: tagsArray,
      };

      if (editingLink) {
        await atualizarLink(editingLink.id, payload);
        showToast('Link atualizado com sucesso!');
      } else {
        await salvarLink(payload);
        showToast('Link adicionado com sucesso!');
      }

      await carregarDados();
      setShowModal(false);
      setEditingLink(null);
      setFormData(emptyForm);
    } catch (error) {
      showToast('Erro ao salvar o link no servidor.', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Tem certeza que deseja excluir este link?')) {
      try {
        await deletarLink(id);
        showToast('Link excluído com sucesso.');
        await carregarDados();
      } catch (error) {
        showToast('Erro ao excluir o link.', 'error');
      }
    }
  };

  return (
    <div className="space-y-6 relative">
      
      {/* Sistema de Notificação Toast */}
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
          <h1 className="text-2xl font-bold text-white">Links Úteis</h1>
          <p className="text-dark-400 mt-1">Gerenciamento de links frequentes</p>
        </div>
        {canWrite && (
          <button onClick={() => handleOpenModal()} className="btn-primary">
            <Plus className="w-4 h-4" />
            Novo Link
          </button>
        )}
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou tag..."
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
            {Object.entries(categoryLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            <p className="text-dark-400 col-span-full text-center py-12">Conectando ao banco de dados...</p>
          ) : filteredLinks.length === 0 ? (
            <p className="text-dark-400 col-span-full text-center py-12">Nenhum link encontrado</p>
          ) : (
            filteredLinks.map((link) => {
              const Icon = categoryIcons[link.category] || categoryIcons.internal;
              return (
                <div
                  key={link.id}
                  className="p-4 rounded-lg bg-dark-700/50 border border-dark-600 hover:border-dark-500 transition-all group flex flex-col justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-primary-500/20 rounded-lg flex items-center justify-center shrink-0">
                      <Icon className="w-6 h-6 text-primary-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white truncate" title={link.name}>{link.name}</h3>
                      <p className="text-xs text-dark-400 truncate" title={link.url}>{link.url}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="badge badge-info">{categoryLabels[link.category]}</span>
                      </div>
                      {link.tags && link.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {link.tags.map((tag) => (
                            <span key={tag} className="text-xs text-dark-400 bg-dark-600 px-2 py-0.5 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-dark-600">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary flex-1 justify-center text-sm py-1.5 hover:text-white"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Abrir
                    </a>
                    {canWrite && (
                      <>
                        <button
                          onClick={() => handleOpenModal(link)}
                          className="btn-secondary px-3 py-1.5"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(link.id)}
                          className="btn-danger px-3 py-1.5"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingLink ? 'Editar Link' : 'Novo Link'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Nome *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-field"
              placeholder="Ex: Portal Azure"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">URL *</label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="input-field"
              placeholder="exemplo.com ou https://exemplo.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Categoria</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="select-field"
            >
              {Object.entries(categoryLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Tags (separadas por virgula)</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="input-field"
              placeholder="Ex: Cloud, Azure, Microsoft"
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setShowModal(false)} className="btn-secondary">
              Cancelar
            </button>
            <button onClick={handleSave} className="btn-primary">
              {editingLink ? 'Salvar Alterações' : 'Adicionar Link'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}