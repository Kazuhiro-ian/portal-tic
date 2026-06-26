import { useState } from 'react';
import { Plus, Edit, Trash2, Store, Search, MapPin, Hash, FileText, Building2 } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { Modal } from './Modal.jsx';

function formatCnpj(value) {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12)
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

const emptyForm = { branchNumber: '', name: '', cnpj: '', address: '' };

export function BranchManagement() {
  const [branches, setBranches] = useLocalStorage('ithub_branches', []);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');

  const filtered = branches.filter((b) => {
    const q = search.toLowerCase();
    return (
      b.name.toLowerCase().includes(q) ||
      b.branchNumber.includes(q) ||
      b.cnpj.includes(q) ||
      b.address.toLowerCase().includes(q)
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
      branchNumber: branch.branchNumber,
      name: branch.name,
      cnpj: branch.cnpj,
      address: branch.address,
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.branchNumber.trim()) {
      setFormError('Informe o numero da filial.');
      return;
    }
    if (!form.name.trim()) {
      setFormError('Informe o nome da filial.');
      return;
    }

    const duplicate = branches.find(
      (b) =>
        b.branchNumber === form.branchNumber.trim() &&
        (!editingBranch || b.id !== editingBranch.id)
    );
    if (duplicate) {
      setFormError(`Ja existe uma filial com o numero ${form.branchNumber}.`);
      return;
    }

    if (editingBranch) {
      setBranches(
        branches.map((b) =>
          b.id === editingBranch.id
            ? { ...b, ...form, branchNumber: form.branchNumber.trim(), name: form.name.trim(), address: form.address.trim() }
            : b
        )
      );
    } else {
      const newBranch = {
        id: Date.now().toString(),
        branchNumber: form.branchNumber.trim(),
        name: form.name.trim(),
        cnpj: form.cnpj,
        address: form.address.trim(),
      };
      setBranches(
        [...branches, newBranch].sort((a, b) => a.branchNumber.localeCompare(b.branchNumber))
      );
    }

    setShowModal(false);
    setEditingBranch(null);
    setForm(emptyForm);
    setFormError('');
  };

  const handleDelete = (branch) => {
    if (
      confirm(
        `Excluir a filial "${branch.name}"?\n\nAtencao: os registros de cotas e envios Zebra associados a esta filial serao afetados.`
      )
    ) {
      setBranches(branches.filter((b) => b.id !== branch.id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Gestao de Filiais</h1>
          <p className="text-dark-400 mt-1">
            {branches.length} {branches.length === 1 ? 'filial cadastrada' : 'filiais cadastradas'}
          </p>
        </div>
        <button onClick={openNew} className="btn-primary">
          <Plus className="w-4 h-4" />
          Nova Filial
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {branches.slice(0, 4).map((b) => (
          <div key={b.id} className="card py-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-primary-500/20 rounded-lg flex items-center justify-center shrink-0">
                <Store className="w-4 h-4 text-primary-400" />
              </div>
              <span className="text-xs font-semibold text-dark-400 uppercase tracking-wider">
                Loja {b.branchNumber}
              </span>
            </div>
            <p className="text-sm font-semibold text-white truncate">{b.name}</p>
          </div>
        ))}
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
                <th className="table-header w-20">
                  <span className="flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5" />
                    Num.
                  </span>
                </th>
                <th className="table-header">Nome da Filial</th>
                <th className="table-header">CNPJ</th>
                <th className="table-header">Endereco</th>
                <th className="table-header text-right">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-dark-400">
                    {search ? 'Nenhuma filial encontrada para esta busca.' : (
                      <div className="flex flex-col items-center gap-3">
                        <Store className="w-10 h-10 text-dark-600" />
                        <p>Nenhuma filial cadastrada ainda.</p>
                        <button onClick={openNew} className="btn-primary text-sm">
                          <Plus className="w-4 h-4" />
                          Cadastrar primeira filial
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((branch) => (
                  <tr
                    key={branch.id}
                    className="hover:bg-dark-700/30 transition-colors group"
                  >
                    <td className="table-cell">
                      <span className="inline-flex items-center justify-center w-10 h-8 rounded-lg bg-primary-500/15 border border-primary-500/25 text-primary-400 font-bold text-sm">
                        {branch.branchNumber}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-dark-700 rounded-lg flex items-center justify-center shrink-0">
                          <Store className="w-4 h-4 text-dark-300" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">{branch.name}</p>
                          <p className="text-xs text-dark-400">Loja {branch.branchNumber}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-dark-500 shrink-0" />
                        <span className="text-dark-300 font-mono text-sm">
                          {branch.cnpj || '—'}
                        </span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-start gap-1.5 max-w-xs">
                        <MapPin className="w-3.5 h-3.5 text-dark-500 mt-0.5 shrink-0" />
                        <span className="text-dark-300 text-sm">{branch.address || '—'}</span>
                      </div>
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(branch)}
                          className="btn-secondary px-3 py-1.5"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(branch)}
                          className="btn-danger px-3 py-1.5"
                        >
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
        onClose={() => {
          setShowModal(false);
          setEditingBranch(null);
          setForm(emptyForm);
          setFormError('');
        }}
        title={editingBranch ? `Editar Filial — ${editingBranch.name}` : 'Nova Filial'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                <span className="flex items-center gap-1.5">
                  <Hash className="w-4 h-4" />
                  Numero da Filial *
                </span>
              </label>
              <input
                type="text"
                value={form.branchNumber}
                onChange={(e) => {
                  setForm({ ...form, branchNumber: e.target.value });
                  setFormError('');
                }}
                className="input-field"
                placeholder="Ex: 001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4" />
                  CNPJ
                </span>
              </label>
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
            <label className="block text-sm font-medium text-dark-300 mb-2">
              <span className="flex items-center gap-1.5">
                <Store className="w-4 h-4" />
                Nome da Filial *
              </span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => {
                setForm({ ...form, name: e.target.value });
                setFormError('');
              }}
              className="input-field"
              placeholder="Ex: Filial Centro"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                Endereco
              </span>
            </label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="input-field"
              placeholder="Ex: Av. Principal, 100 - Bairro, Cidade/UF"
            />
          </div>

          {formError && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => {
                setShowModal(false);
                setEditingBranch(null);
                setForm(emptyForm);
                setFormError('');
              }}
              className="btn-secondary"
            >
              Cancelar
            </button>
            <button onClick={handleSave} className="btn-primary">
              {editingBranch ? 'Salvar Alteracoes' : (
                <>
                  <Plus className="w-4 h-4" />
                  Cadastrar Filial
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
