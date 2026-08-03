import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Users, ShieldCheck, Search } from 'lucide-react';
import { Modal } from './Modal.jsx';
import { listarUsuarios, salvarUsuario, atualizarUsuario, desativarUsuario } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../hooks/useToast.js';
import { useConfirm } from '../hooks/useConfirm.jsx';
import { Toast } from './Toast.jsx';

const roleLabels = {
  ADMIN: 'Administrador',
  TECNICO: 'Técnico',
  LEITURA: 'Leitura',
  QUALIDADE: 'Qualidade',
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
  const [search, setSearch] = useState('');

  const { toast, showToast, hideToast } = useToast();
  const { confirmar, dialogoConfirmacao } = useConfirm();

  useEffect(() => {
    carregarUsuarios();
  }, []);

  const filtrados = usuarios.filter((u) => {
    const termo = search.trim().toLowerCase();
    if (!termo) return true;
    return (
      (u.username && u.username.toLowerCase().includes(termo)) ||
      (u.nomeCompleto && u.nomeCompleto.toLowerCase().includes(termo)) ||
      (u.role && u.role.toLowerCase().includes(termo))
    );
  });

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
    const confirmado = await confirmar({
      titulo: 'Desativar usuário',
      mensagem: `Desativar o usuário "${usuario.username}"? Ele perderá o acesso imediatamente.`,
      textoConfirmar: 'Desativar',
    });
    if (!confirmado) return;

    try {
      await desativarUsuario(usuario.id);
      showToast('Usuário desativado.');
      await carregarUsuarios();
    } catch (error) {
      showToast('Erro ao desativar usuário.', 'error');
    }
  };

  return (
    <div className="space-y-6 relative">
      {dialogoConfirmacao}

      <Toast toast={toast} onClose={hideToast} />

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
        <div className="relative sm:w-80 mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
          <input
            type="search"
            placeholder="Buscar por usuário, nome ou papel..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9"
            aria-label="Buscar usuários"
          />
        </div>

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
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-dark-400">
                    {isLoading
                      ? 'Carregando...'
                      : search.trim()
                        ? 'Nenhum usuário encontrado para essa busca.'
                        : 'Nenhum usuário cadastrado.'}
                  </td>
                </tr>
              ) : (
                filtrados.map((u) => (
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
              <option value="QUALIDADE">Qualidade — planejamento de inventário; consulta no restante</option>
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
