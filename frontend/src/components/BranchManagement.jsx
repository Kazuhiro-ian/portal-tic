import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Store, Search, MapPin, Hash, Building2, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { Modal } from './Modal.jsx';
import { listarFiliais, salvarFilial, atualizarFilial, deletarFilial } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

function formatCnpj(value) {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12)
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

const emptyForm = { numeroFilial: '', nome: '', cnpj: '', endereco: '' };

export function BranchManagement() {
  const { canWrite } = useAuth();
  const [branches, setBranches] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  useEffect(() => {
    carregarFiliais();
  }, []);

  const carregarFiliais = async () => {
    try {
      setIsLoading(true);
      const data = await listarFiliais();
      setBranches(data.sort((a, b) => a.numeroFilial - b.numeroFilial));
    } catch (error) {
      console.error(error);
      showToast('Erro ao carregar dados do servidor.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = branches.filter((b) => {
    const q = search.toLowerCase();
    return (
      (b.nome && b.nome.toLowerCase().includes(q)) ||
      (b.numeroFilial && b.numeroFilial.toString().includes(q)) ||
      (b.cnpj && b.cnpj.includes(q)) ||
      (b.endereco && b.endereco.toLowerCase().includes(q))
    );
  });

  const openNew = () => {
    setEditingBranch(null);
    setForm(emptyForm);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (branch) => {
    setEditingBranch(branch);
    setForm({
      numeroFilial: branch.numeroFilial || '',
      nome: branch.nome || '',
      cnpj: branch.cnpj || '',
      endereco: branch.endereco || '',
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.numeroFilial.toString().trim()) {
      setFormError('Informe o número da filial.');
      return;
    }
    if (!form.nome.trim()) {
      setFormError('Informe o nome da filial.');
      return;
    }

    try {
      const payload = {
        ...form,
        numeroFilial: parseInt(form.numeroFilial, 10),
        nome: form.nome.trim(),
        endereco: form.endereco.trim(),
        prazoChamadoSobraFalta: "12:00:00",
        inicioRecebimento: "07:30:00",
        fimRecebimento: "21:00:00"
      };

      if (editingBranch) {
        // Dispara o PUT para atualizar no banco
        await atualizarFilial(editingBranch.id, payload);
        showToast('Filial atualizada com sucesso!');
      } else {
        // Dispara o POST para criar no banco
        await salvarFilial(payload);
        showToast('Filial cadastrada com sucesso no banco de dados!');
      }
      
      await carregarFiliais();
      setShowModal(false);
      setEditingBranch(null);
      setForm(emptyForm);
      setFormError('');
    } catch (error) {
      setFormError('Erro ao comunicar com o servidor.');
    }
  };

  const handleDelete = async (branch) => {
    if (confirm(`Deseja realmente excluir a filial "${branch.nome}"?`)) {
      try {
        // Dispara o DELETE para remover do banco
        await deletarFilial(branch.id);
        showToast('Filial excluída com sucesso.');
        await carregarFiliais();
      } catch (error) {
        showToast('Erro ao excluir a filial no servidor.', 'error');
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
          <h1 className="text-2xl font-bold text-white">Gestão de Filiais</h1>
          <p className="text-dark-400 mt-1">
            {isLoading ? 'Carregando...' : `${branches.length} ${branches.length === 1 ? 'filial cadastrada' : 'filiais cadastradas'}`}
          </p>
        </div>
        {canWrite && (
          <button onClick={openNew} className="btn-primary">
            <Plus className="w-4 h-4" />
            Nova Filial
          </button>
        )}
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary-400" />
            Todas as Filiais
          </h2>
          
          <div className="relative sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
            <input
              type="text"
              placeholder="Buscar filial..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header w-20"><Hash className="inline w-3.5 h-3.5"/> Núm.</th>
                <th className="table-header">Nome da Filial</th>
                <th className="table-header">CNPJ</th>
                <th className="table-header">Endereço</th>
                <th className="table-header text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-dark-400">
                    {isLoading ? 'Conectando ao banco de dados...' : 'Nenhuma filial encontrada.'}
                  </td>
                </tr>
              ) : (
                filtered.map((branch) => (
                  <tr key={branch.id} className="hover:bg-dark-700/30 transition-colors">
                    <td className="table-cell">
                      <span className="inline-flex items-center justify-center w-10 h-8 rounded-lg bg-primary-500/15 border border-primary-500/25 text-primary-400 font-bold text-sm">
                        {branch.numeroFilial}
                      </span>
                    </td>
                    <td className="table-cell font-semibold text-white">{branch.nome}</td>
                    <td className="table-cell font-mono text-dark-300">{branch.cnpj || '—'}</td>
                    <td className="table-cell text-dark-300">{branch.endereco || '—'}</td>
                    <td className="table-cell text-right">
                      {canWrite && (
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEdit(branch)} className="btn-secondary px-3 py-1.5" title="Editar">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(branch)} className="btn-danger px-3 py-1.5" title="Excluir">
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
        title={editingBranch ? `Editar Filial — ${editingBranch.nome}` : 'Nova Filial'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Número da Filial *</label>
              <input
                type="number"
                value={form.numeroFilial}
                onChange={(e) => { setForm({ ...form, numeroFilial: e.target.value }); setFormError(''); }}
                className="input-field"
                placeholder="Ex: 1"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">CNPJ</label>
              <input
                type="text"
                value={form.cnpj}
                onChange={(e) => setForm({ ...form, cnpj: formatCnpj(e.target.value) })}
                className="input-field font-mono"
                placeholder="00.000.000/0000-00"
                maxLength={18}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Nome da Filial *</label>
            <input
              type="text"
              value={form.nome}
              onChange={(e) => { setForm({ ...form, nome: e.target.value }); setFormError(''); }}
              className="input-field"
              placeholder="Ex: Filial Centro"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Endereço</label>
            <input
              type="text"
              value={form.endereco}
              onChange={(e) => setForm({ ...form, endereco: e.target.value })}
              className="input-field"
              placeholder="Ex: Av. Principal, 100"
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
              {editingBranch ? 'Salvar Alterações' : 'Cadastrar Filial'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}