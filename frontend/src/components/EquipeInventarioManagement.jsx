import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Users, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { Modal } from './Modal.jsx';
import { listarEquipesInventario, salvarEquipeInventario, atualizarEquipeInventario, deletarEquipeInventario } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../hooks/useToast.js';

const emptyForm = { nome: '' };

export function EquipeInventarioManagement() {
  const { canWriteQualidade } = useAuth();
  const [equipes, setEquipes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingEquipe, setEditingEquipe] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    carregarEquipes();
  }, []);

  const carregarEquipes = async () => {
    try {
      setIsLoading(true);
      const data = await listarEquipesInventario();
      setEquipes(data);
    } catch (error) {
      showToast('Erro ao carregar dados do servidor.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const openNew = () => {
    setEditingEquipe(null);
    setForm(emptyForm);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (equipe) => {
    setEditingEquipe(equipe);
    setForm({ nome: equipe.nome || '' });
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim()) {
      setFormError('Informe o nome da equipe.');
      return;
    }

    try {
      const payload = { nome: form.nome.trim() };

      if (editingEquipe) {
        await atualizarEquipeInventario(editingEquipe.id, payload);
        showToast('Equipe atualizada com sucesso!');
      } else {
        await salvarEquipeInventario(payload);
        showToast('Equipe cadastrada com sucesso!');
      }

      await carregarEquipes();
      setShowModal(false);
      setEditingEquipe(null);
      setForm(emptyForm);
      setFormError('');
    } catch (error) {
      setFormError('Erro ao comunicar com o servidor.');
    }
  };

  const handleDelete = async (equipe) => {
    if (confirm(`Deseja realmente excluir a equipe "${equipe.nome}"?`)) {
      try {
        await deletarEquipeInventario(equipe.id);
        showToast('Equipe excluída com sucesso.');
        await carregarEquipes();
      } catch (error) {
        showToast('Erro ao excluir a equipe no servidor.', 'error');
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
          <button onClick={hideToast} className="ml-2 text-dark-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-400" />
            Equipes de Inventário
          </h2>
          <p className="text-dark-400 mt-1 text-sm">
            {isLoading ? 'Carregando...' : `${equipes.length} ${equipes.length === 1 ? 'equipe cadastrada' : 'equipes cadastradas'}`}
          </p>
        </div>
        {canWriteQualidade && (
          <button onClick={openNew} className="btn-primary">
            <Plus className="w-4 h-4" />
            Nova Equipe
          </button>
        )}
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Nome</th>
                <th className="table-header text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {equipes.length === 0 ? (
                <tr>
                  <td colSpan={2} className="text-center py-16 text-dark-400">
                    {isLoading ? 'Conectando ao banco de dados...' : 'Nenhuma equipe cadastrada.'}
                  </td>
                </tr>
              ) : (
                equipes.map((equipe) => (
                  <tr key={equipe.id} className="hover:bg-dark-700/30 transition-colors">
                    <td className="table-cell font-semibold text-white">{equipe.nome}</td>
                    <td className="table-cell text-right">
                      {canWriteQualidade && (
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEdit(equipe)} className="btn-secondary px-3 py-1.5" title="Editar">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(equipe)} className="btn-danger px-3 py-1.5" title="Excluir">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingEquipe ? `Editar Equipe — ${editingEquipe.nome}` : 'Nova Equipe'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Nome da Equipe *</label>
            <input
              type="text"
              value={form.nome}
              onChange={(e) => { setForm({ ...form, nome: e.target.value }); setFormError(''); }}
              className="input-field"
              placeholder="Ex: Interno"
            />
          </div>

          {formError && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
            <button onClick={handleSave} className="btn-primary">
              {editingEquipe ? 'Salvar Alterações' : 'Cadastrar Equipe'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}