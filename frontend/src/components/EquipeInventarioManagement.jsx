import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, Users } from 'lucide-react';
import { SidePanel } from './SidePanel.jsx';
import { DataTable } from './DataTable.jsx';
import { listarEquipesInventario, salvarEquipeInventario, atualizarEquipeInventario, deletarEquipeInventario } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../hooks/useToast.js';
import { useConfirm } from '../hooks/useConfirm.jsx';
import { Toast } from './Toast.jsx';

const emptyForm = { nome: '' };

const COLUNAS = [
  {
    chave: 'nome',
    header: 'Nome',
    mobile: 'titulo',
    tdClassName: 'font-semibold text-white',
    render: (equipe) => equipe.nome,
  },
];

export function EquipeInventarioManagement() {
  const { canWriteQualidade } = useAuth();
  const [equipes, setEquipes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingEquipe, setEditingEquipe] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { toast, showToast, hideToast } = useToast();
  const { confirmar, dialogoConfirmacao } = useConfirm();

  const carregarEquipes = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await listarEquipesInventario();
      setEquipes(data);
    } catch (error) {
      showToast('Erro ao carregar dados do servidor.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    carregarEquipes();
  }, [carregarEquipes]);

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
    const confirmado = await confirmar({
      titulo: 'Excluir equipe',
      mensagem: `Deseja realmente excluir a equipe "${equipe.nome}"?`,
    });
    if (!confirmado) return;

    try {
      await deletarEquipeInventario(equipe.id);
      showToast('Equipe excluída com sucesso.');
      await carregarEquipes();
    } catch (error) {
      showToast('Erro ao excluir a equipe no servidor.', 'error');
    }
  };

  return (
    <div className="space-y-6 relative">

      {dialogoConfirmacao}

      <Toast toast={toast} onClose={hideToast} />

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
        <DataTable
          colunas={COLUNAS}
          dados={equipes}
          carregando={isLoading}
          vazio="Nenhuma equipe cadastrada."
          acoes={(equipe) =>
            canWriteQualidade && (
              <>
                <button onClick={() => openEdit(equipe)} className="btn-secondary px-3 py-1.5" title="Editar" aria-label="Editar">
                  <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(equipe)} className="btn-danger px-3 py-1.5" title="Excluir" aria-label="Excluir">
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )
          }
        />
      </div>

      <SidePanel
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingEquipe ? `Editar Equipe — ${editingEquipe.nome}` : 'Nova Equipe'}
        size="md"
        footer={
          <>
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
            <button onClick={handleSave} className="btn-primary">
              {editingEquipe ? 'Salvar Alterações' : 'Cadastrar Equipe'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="equipe-nome" className="block text-sm font-medium text-dark-300 mb-2">Nome da Equipe *</label>
            <input
              id="equipe-nome"
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
        </div>
      </SidePanel>
    </div>
  );
}