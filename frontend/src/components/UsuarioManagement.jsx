import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Users, CheckCircle2, AlertCircle, X, ShieldCheck } from 'lucide-react';
import { Modal } from './Modal.jsx';
import { listarUsuarios, salvarUsuario, atualizarUsuario, desativarUsuario } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const roleLabels = {
  ADMIN: 'Administrador',
  TECNICO: 'Técnico',
  LEITURA: 'Leitura',
};

const emptyForm = { username: '', password: '', nomeCompleto: '', role: 'TECNICO', ativo: true };

export function UsuarioManagement() {
  const { user: usuarioLogado } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');

  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    carregarUsuarios();
  }, []);

  const carregarUsuarios = async () => {
    try {
      setIsLoading(true);
      const data = await listarUsuarios();
      setUsuarios(data);
    } catch (error) {
      showToast('Erro ao carregar usuários.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const openNew = () => {
    setEditingUsuario(null);
    setForm(emptyForm);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (usuario) => {
    setEditingUsuario(usuario);
    setForm({ username: usuario.username, password: '', nomeCompleto: usuario.nomeCompleto, role: usuario.role, ativo: usuario.ativo });
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.username.trim() || !form.nomeCompleto.trim()) {
      setFormError('Usuário e nome completo são obrigatórios.');
      return;
    }
    if (!editingUsuario && !form.password.trim()) {
      setFormError('Senha é obrigatória para novos usuários.');
      return;
    }

    try {
      const payload = { ...form, username: form.username.trim(), nomeCompleto: form.nomeCompleto.trim() };
      if (editingUsuario) {
        await atualizarUsuario(editingUsuario.id, payload);
        showToast('Usuário atualizado com sucesso!');
      } else {
        await salvarUsuario(payload);
        showToast('Usuário criado com sucesso!');
      }
      await carregarUsuarios();
      setShowModal(false);
    } catch (error) {
      setFormError(error.message || 'Erro ao salvar usuário.');
    }
  };

  const handleDesativar = async (usuario) => {
    if (usuario.username === usuarioLogado?.username) {
      showToast('Você não pode desativar o próprio usuário.', 'error');
      return;
    }
    if (confirm(`Desativar o usuário "${usuario.username}"? Ele perderá o acesso imediatamente.`)) {
      try {
        await desativarUsuario(usuario.id);
        showToast('Usuário desativado.');
        await carregarUsuarios();
      } catch (error) {
        showToast('Erro ao desativar usuário.', 'error');
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
          <h1 className="text-2xl font-bold text-white">Usuários do Sistema</h1>
          <p className="text-dark-400 mt-1">
            {isLoading ? 'Carregando...' : `${usuarios.length} usuários cadastrados`}
          </p>
        </div>
        <button onClick={openNew} className="btn-primary">
          <Plus className="w-4 h-4" />
          Novo Usuário
        </button>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header"><Users className="inline w-3.5 h-3.5" /> Usuário</th>
                <th className="table-header">Nome</th>
                <th className="table-header">Papel</th>
                <th className="table-header text-center">Status</th>
                <th className="table-header text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-dark-400">
                    {isLoading ? 'Carregando...' : 'Nenhum usuário cadastrado.'}
                  </td>
                </tr>
              ) : (
                usuarios.map((u) => (
                  <tr key={u.id} className="hover:bg-dark-700/30 transition-colors">
                    <td className="table-cell font-mono text-primary-400">{u.username}</td>
                    <td className="table-cell font-medium text-white">{u.nomeCompleto}</td>
                    <td className="table-cell">
                      <span className="badge badge-info">
                        {u.role === 'ADMIN' && <ShieldCheck className="w-3 h-3 mr-1" />}
                        {roleLabels[u.role] || u.role}
                      </span>
                    </td>
                    <td className="table-cell text-center">
                      <span className={`badge ${u.ativo ? 'badge-success' : 'badge-danger'}`}>
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(u)} className="btn-secondary px-3 py-1.5" title="Editar">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDesativar(u)} className="btn-danger px-3 py-1.5" title="Desativar">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
        title={editingUsuario ? `Editar Usuário — ${editingUsuario.username}` : 'Novo Usuário'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Usuário *</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="input-field font-mono"
              placeholder="ex: joao.silva"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Senha {editingUsuario ? '(deixe em branco para manter a atual)' : '*'}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="input-field"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Nome Completo *</label>
            <input
              type="text"
              value={form.nomeCompleto}
              onChange={(e) => setForm({ ...form, nomeCompleto: e.target.value })}
              className="input-field"
              placeholder="Ex: João Silva"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Papel</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="select-field"
            >
              <option value="ADMIN">Administrador — acesso total, inclusive usuários</option>
              <option value="TECNICO">Técnico — operação do dia a dia, inclusive credenciais</option>
              <option value="LEITURA">Leitura — apenas consulta, sem acesso a credenciais</option>
            </select>
          </div>
          {editingUsuario && (
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.ativo}
                onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                className="w-5 h-5 rounded border-dark-600 bg-dark-700 text-primary-500 focus:ring-primary-500"
              />
              <span className="text-dark-300">Usuário ativo</span>
            </label>
          )}

          {formError && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
            <button onClick={handleSave} className="btn-primary">
              {editingUsuario ? 'Salvar Alterações' : 'Criar Usuário'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
