import { useState } from 'react';
import { Plus, Edit, Trash2, Store, Search, MapPin, Hash, FileText, Building2 } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { Modal } from './Modal.jsx';

/**
 * Aplica a máscara de formatação padrão para CNPJ (XX.XXX.XXX/XXXX-XX).
 * Remove todos os caracteres não numéricos e formata progressivamente.
 * * @param {string} value - O valor bruto digitado no input.
 * @returns {string} O valor formatado com a máscara de CNPJ.
 */
function formatCnpj(value) {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12)
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

// Estado inicial padronizado para limpar ou inicializar o formulário
const emptyForm = { branchNumber: '', name: '', cnpj: '', address: '' };

/**
 * Componente principal de Gestão de Filiais.
 * Responsável por listar, buscar, criar, editar e excluir as filiais do sistema.
 */
export function BranchManagement() {
  
  // ==== ESTADOS DA APLICAÇÃO ====
  
  // Hook customizado para persistência de dados no LocalStorage
  const [branches, setBranches] = useLocalStorage('ithub_branches', []);
  
  // Estados de Interface (UI)
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  
  // Estados de Manipulação do Formulário
  const [editingBranch, setEditingBranch] = useState(null); // Guarda a filial em edição (null se for nova)
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');


  // ==== REGRAS DE NEGÓCIO E LÓGICA ====

  /**
   * Filtra as filiais ativas com base no termo de busca digitado.
   * A busca não diferencia maiúsculas de minúsculas e abrange múltiplos campos.
   */
  const filtered = branches.filter((b) => {
    const q = search.toLowerCase();
    return (
      b.name.toLowerCase().includes(q) ||
      b.branchNumber.includes(q) ||
      b.cnpj.includes(q) ||
      b.address.toLowerCase().includes(q)
    );
  });

  /**
   * Prepara os estados para abrir o modal em modo de "Criação".
   */
  const openNew = () => {
    setEditingBranch(null);
    setForm(emptyForm);
    setFormError('');
    setShowModal(true);
  };

  /**
   * Prepara os estados para abrir o modal em modo de "Edição", 
   * populando o formulário com os dados da filial selecionada.
   * * @param {Object} branch - Objeto da filial selecionada.
   */
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

  /**
   * Valida os dados, checa duplicidades e salva (criação ou atualização) os dados.
   */
  const handleSave = () => {
    // 1. Validações de campos obrigatórios
    if (!form.branchNumber.trim()) {
      setFormError('Informe o número da filial.');
      return;
    }
    if (!form.name.trim()) {
      setFormError('Informe o nome da filial.');
      return;
    }

    // 2. Validação de duplicidade (Impede duas filiais com o mesmo número)
    const duplicate = branches.find(
      (b) =>
        b.branchNumber === form.branchNumber.trim() &&
        (!editingBranch || b.id !== editingBranch.id)
    );
    
    if (duplicate) {
      setFormError(`Já existe uma filial com o número ${form.branchNumber}.`);
      return;
    }

    // 3. Persistência dos dados (Update vs Create)
    if (editingBranch) {
      // Atualiza filial existente
      setBranches(
        branches.map((b) =>
          b.id === editingBranch.id
            ? { ...b, ...form, branchNumber: form.branchNumber.trim(), name: form.name.trim(), address: form.address.trim() }
            : b
        )
      );
    } else {
      // Cria uma nova filial
      const newBranch = {
        id: Date.now().toString(), // Geração de ID simples baseado no timestamp
        branchNumber: form.branchNumber.trim(),
        name: form.name.trim(),
        cnpj: form.cnpj,
        address: form.address.trim(),
      };
      
      // Adiciona a nova filial e mantém a lista sempre ordenada numericamente
      setBranches(
        [...branches, newBranch].sort((a, b) => a.branchNumber.localeCompare(b.branchNumber))
      );
    }

    // 4. Limpa os estados e fecha o modal após o sucesso
    setShowModal(false);
    setEditingBranch(null);
    setForm(emptyForm);
    setFormError('');
  };

  /**
   * Remove uma filial da base de dados após solicitar a confirmação do usuário.
   * * @param {Object} branch - Objeto da filial a ser excluída.
   */
  const handleDelete = (branch) => {
    // Alerta de segurança considerando as restrições sistêmicas (relações em outras tabelas/telas)
    if (
      confirm(
        `Excluir a filial "${branch.name}"?\n\nAtenção: os registros de cotas e envios Zebra associados a esta filial serão afetados.`
      )
    ) {
      setBranches(branches.filter((b) => b.id !== branch.id));
    }
  };


  // ==== RENDERIZAÇÃO DA INTERFACE (JSX) ====
  
  return (
    <div className="space-y-6">
      
      {/* 1. Cabeçalho do Módulo e Botão de Ação Primária */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Gestão de Filiais</h1>
          <p className="text-dark-400 mt-1">
            {branches.length} {branches.length === 1 ? 'filial cadastrada' : 'filiais cadastradas'}
          </p>
        </div>
        <button onClick={openNew} className="btn-primary">
          <Plus className="w-4 h-4" />
          Nova Filial
        </button>
      </div>

      {/* 2. Cards de Destaque - Exibe as primeiras 4 filiais cadastradas */}
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

      {/* 3. Tabela Principal e Barra de Pesquisa */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary-400" />
            Todas as Filiais
          </h2>
          
          {/* Input de Filtro/Busca */}
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
                    Núm.
                  </span>
                </th>
                <th className="table-header">Nome da Filial</th>
                <th className="table-header">CNPJ</th>
                <th className="table-header">Endereço</th>
                <th className="table-header text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                // Estado Vazio (Empty State) - Quando não há filiais cadastradas ou filtro não encontrou dados
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
                // Listagem Iterativa de Filiais
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
                      {/* Agrupamento de Botões de Ação (Editar / Deletar) */}
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(branch)}
                          className="btn-secondary px-3 py-1.5"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(branch)}
                          className="btn-danger px-3 py-1.5"
                          title="Excluir"
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

      {/* 4. Overlay/Modal de Criação e Edição de Filial */}
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
            
            {/* Campo: Número da Filial */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                <span className="flex items-center gap-1.5">
                  <Hash className="w-4 h-4" />
                  Número da Filial *
                </span>
              </label>
              <input
                type="text"
                value={form.branchNumber}
                onChange={(e) => {
                  setForm({ ...form, branchNumber: e.target.value });
                  setFormError(''); // Limpa o erro ao digitar
                }}
                className="input-field"
                placeholder="Ex: 001"
              />
            </div>
            
            {/* Campo: CNPJ */}
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
                // A máscara de CNPJ é aplicada em tempo real durante a digitação
                onChange={(e) => setForm({ ...form, cnpj: formatCnpj(e.target.value) })}
                className="input-field font-mono"
                placeholder="00.000.000/0000-00"
                maxLength={18}
              />
            </div>
          </div>

          {/* Campo: Nome da Filial */}
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

          {/* Campo: Endereço */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                Endereço
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

          {/* Renderização Condicional do Bloco de Erro */}
          {formError && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {formError}
            </p>
          )}

          {/* Rodapé do Formulário: Botões de Ação */}
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
              {editingBranch ? 'Salvar Alterações' : (
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