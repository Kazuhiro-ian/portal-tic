import { useState } from 'react';
import { Plus, Search, Edit, Trash2, ExternalLink, Cloud, Server, Zap } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { Modal } from './Modal.jsx';

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

export function LinksManager() {
  const [links, setLinks] = useLocalStorage('ithub_links', []);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [formData, setFormData] = useState({ name: '', url: '', category: 'internal', tags: '' });

  const filteredLinks = links.filter((link) => {
    const matchSearch =
      link.name.toLowerCase().includes(search.toLowerCase()) ||
      link.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchCategory = filterCategory === 'all' || link.category === filterCategory;
    return matchSearch && matchCategory;
  });

  const handleOpenModal = (link) => {
    if (link) {
      setEditingLink(link);
      setFormData({
        name: link.name,
        url: link.url,
        category: link.category,
        tags: link.tags?.join(', ') || '',
      });
    } else {
      setEditingLink(null);
      setFormData({ name: '', url: '', category: 'internal', tags: '' });
    }
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formData.name.trim() || !formData.url.trim()) return;

    const tagsArray = formData.tags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t);

    if (editingLink) {
      setLinks(
        links.map((l) =>
          l.id === editingLink.id ? { ...l, ...formData, tags: tagsArray } : l
        )
      );
    } else {
      const newLink = {
        id: Date.now().toString(),
        name: formData.name,
        url: formData.url,
        category: formData.category,
        tags: tagsArray,
      };
      setLinks([newLink, ...links]);
    }
    setShowModal(false);
  };

  const handleDelete = (id) => {
    if (confirm('Tem certeza que deseja excluir este link?')) {
      setLinks(links.filter((l) => l.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Links Uteis</h1>
          <p className="text-dark-400 mt-1">Gerenciamento de links frequentes</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn-primary">
          <Plus className="w-4 h-4" />
          Novo Link
        </button>
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
          {filteredLinks.length === 0 ? (
            <p className="text-dark-400 col-span-full text-center py-12">Nenhum link encontrado</p>
          ) : (
            filteredLinks.map((link) => {
              const Icon = categoryIcons[link.category];
              return (
                <div
                  key={link.id}
                  className="p-4 rounded-lg bg-dark-700/50 border border-dark-600 hover:border-dark-500 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-primary-500/20 rounded-lg flex items-center justify-center shrink-0">
                      <Icon className="w-6 h-6 text-primary-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white truncate">{link.name}</h3>
                      <p className="text-xs text-dark-400 truncate">{link.url}</p>
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
                      className="btn-secondary flex-1 justify-center text-sm py-1.5"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Abrir
                    </a>
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
              placeholder="https://exemplo.com"
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
              {editingLink ? 'Salvar' : 'Adicionar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
