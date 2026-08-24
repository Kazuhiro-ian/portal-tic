import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Building2 } from 'lucide-react';
import { SidePanel } from './SidePanel.jsx';
import { DataTable } from './DataTable.jsx';
import { listarFiliais, salvarFilial, atualizarFilial, deletarFilial } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../hooks/useToast.js';
import { useConfirm } from '../hooks/useConfirm.jsx';
import { Toast } from './Toast.jsx';
import { grupoLabels, grupoBadge, periodicidadeLabels, periodicidadeBadge } from '../utils/qualidade.js';

function formatCnpj(value) {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12)
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

const emptyForm = {
  numeroFilial: '', nome: '', cnpj: '', endereco: '', grupoRecebimento: '', tipoFilial: '',
  estoqueDividido: false, periodicidadeInventario: '', referenciaBimestral: '',
};

const COLUNAS = [
  {
    chave: 'numeroFilial',
    header: 'Núm.',
    mobile: 'badge',
    render: (branch) => (
      <span className="inline-flex items-center justify-center w-10 h-8 rounded-lg bg-primary-500/15 border border-primary-500/25 text-primary-400 font-bold text-sm">
        {branch.numeroFilial}
      </span>
    ),
  },
  {
    chave: 'nome',
    header: 'Nome da Filial',
    mobile: 'titulo',
    tdClassName: 'font-semibold text-white',
    render: (branch) => branch.nome,
  },
  {
    chave: 'tipoFilial',
    header: 'Tipo',
    mobile: 'badge',
    render: (branch) =>
      branch.tipoFilial ? (
        <span className={`badge ${branch.tipoFilial === 'CD' ? 'badge-info' : 'badge-success'}`}>
          {branch.tipoFilial === 'CD' ? 'CD' : 'Loja'}
        </span>
      ) : (
        <span className="badge">—</span>
      ),
  },
  {
    chave: 'cnpj',
    header: 'CNPJ',
    tdClassName: 'font-mono text-dark-300',
    render: (branch) => branch.cnpj || '—',
  },
  {
    chave: 'endereco',
    header: 'Endereço',
    tdClassName: 'text-dark-300',
    render: (branch) => branch.endereco || '—',
  },
  {
    chave: 'grupoRecebimento',
    header: 'Grupo Receb.',
    render: (branch) =>
      branch.grupoRecebimento ? (
        <span className={`badge ${grupoBadge(branch.grupoRecebimento)}`}>
          {grupoLabels[branch.grupoRecebimento]}
        </span>
      ) : (
        <span className="badge">Não definido</span>
      ),
  },
  {
    chave: 'periodicidadeInventario',
    header: 'Periodicidade',
    mobile: 'badge',
    render: (branch) => (
      <span className={`badge ${periodicidadeBadge(branch.periodicidadeInventario)}`}>
        {periodicidadeLabels[branch.periodicidadeInventario || 'MENSAL']}
      </span>
    ),
  },
];

export function BranchManagement() {
  const { canWrite } = useAuth();
  const [branches, setBranches] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { toast, showToast, hideToast } = useToast();
  const { confirmar, dialogoConfirmacao } = useConfirm();

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
      grupoRecebimento: branch.grupoRecebimento || '',
      tipoFilial: branch.tipoFilial || '',
      estoqueDividido: Boolean(branch.estoqueDividido),
      periodicidadeInventario: branch.periodicidadeInventario || '',
      // input type="month" espera "AAAA-MM" -- a API devolve "AAAA-MM-DD" (dia 1 sempre).
      referenciaBimestral: branch.referenciaBimestral ? branch.referenciaBimestral.slice(0, 7) : '',
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
        // string vazia no select significa "não definido" — o backend espera null
        grupoRecebimento: form.grupoRecebimento || null,
        tipoFilial: form.tipoFilial || null,
        // Estoque dividido só faz sentido para Loja — o backend rejeita a combinação contrária.
        estoqueDividido: form.tipoFilial === 'LOJA' ? form.estoqueDividido : false,
        periodicidadeInventario: form.periodicidadeInventario || null,
        // Referência só faz sentido pra Bimestral -- o backend também limpa isso, mas o
        // front já não deveria mandar lixo.
        referenciaBimestral: form.periodicidadeInventario === 'BIMESTRAL' && form.referenciaBimestral
          ? `${form.referenciaBimestral}-01`
          : null,
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
    const confirmado = await confirmar({
      titulo: 'Excluir filial',
      mensagem: `Deseja realmente excluir a filial "${branch.nome}"?`,
    });
    if (!confirmado) return;

    try {
      // Dispara o DELETE para remover do banco
      await deletarFilial(branch.id);
      showToast('Filial excluída com sucesso.');
      await carregarFiliais();
    } catch (error) {
      showToast('Erro ao excluir a filial no servidor.', 'error');
    }
  };

  return (
    <div className="space-y-6 relative">
      
      {dialogoConfirmacao}

      <Toast toast={toast} onClose={hideToast} />

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
              aria-label="Buscar filial"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9"
            />
          </div>
        </div>

        <DataTable
          colunas={COLUNAS}
          dados={filtered}
          carregando={isLoading}
          vazio="Nenhuma filial encontrada."
          acoes={(branch) =>
            canWrite && (
              <>
                <button onClick={() => openEdit(branch)} className="btn-secondary px-3 py-1.5" title="Editar" aria-label="Editar">
                  <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(branch)} className="btn-danger px-3 py-1.5" title="Excluir" aria-label="Excluir">
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
        title={editingBranch ? `Editar Filial — ${editingBranch.nome}` : 'Nova Filial'}
        size="lg"
        footer={
          <>
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
            <button onClick={handleSave} className="btn-primary">
              {editingBranch ? 'Salvar Alterações' : 'Cadastrar Filial'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="filial-numero" className="block text-sm font-medium text-dark-300 mb-2">Número da Filial *</label>
              <input
                id="filial-numero"
                type="number"
                inputMode="numeric"
                value={form.numeroFilial}
                onChange={(e) => { setForm({ ...form, numeroFilial: e.target.value }); setFormError(''); }}
                className="input-field"
                placeholder="Ex: 1"
              />
            </div>

            <div>
              <label htmlFor="filial-cnpj" className="block text-sm font-medium text-dark-300 mb-2">CNPJ</label>
              <input
                id="filial-cnpj"
                type="text"
                inputMode="numeric"
                value={form.cnpj}
                onChange={(e) => setForm({ ...form, cnpj: formatCnpj(e.target.value) })}
                className="input-field font-mono"
                placeholder="00.000.000/0000-00"
                maxLength={18}
              />
            </div>
          </div>

          <div>
            <label htmlFor="filial-nome" className="block text-sm font-medium text-dark-300 mb-2">Nome da Filial *</label>
            <input
              id="filial-nome"
              type="text"
              value={form.nome}
              onChange={(e) => { setForm({ ...form, nome: e.target.value }); setFormError(''); }}
              className="input-field"
              placeholder="Ex: Filial Centro"
            />
          </div>

          <div>
            <label htmlFor="filial-endereco" className="block text-sm font-medium text-dark-300 mb-2">Endereço</label>
            <input
              id="filial-endereco"
              type="text"
              value={form.endereco}
              onChange={(e) => setForm({ ...form, endereco: e.target.value })}
              className="input-field"
              placeholder="Ex: Av. Principal, 100"
            />
          </div>

          <div>
            <label htmlFor="filial-tipo" className="block text-sm font-medium text-dark-300 mb-2">Tipo</label>
            <select
              id="filial-tipo"
              value={form.tipoFilial}
              onChange={(e) => {
                const tipoFilial = e.target.value;
                setForm({ ...form, tipoFilial, estoqueDividido: tipoFilial === 'LOJA' ? form.estoqueDividido : false });
              }}
              className="select-field"
            >
              <option value="">Não definido</option>
              <option value="CD">Centro de Distribuição</option>
              <option value="LOJA">Loja</option>
            </select>
            <p className="text-xs text-dark-400 mt-1.5">
              Usado no relatório de acuracidade para agrupar CDs e Lojas separadamente. Sem
              isso definido, a filial fica de fora dos agregados por tipo (mas entra no Geral).
            </p>
          </div>

          {form.tipoFilial === 'LOJA' && (
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-dark-700/50 border border-dark-600">
              <input
                type="checkbox"
                checked={form.estoqueDividido}
                onChange={(e) => setForm({ ...form, estoqueDividido: e.target.checked })}
                className="w-5 h-5 rounded border-dark-600 bg-dark-700 text-primary-500 focus:ring-primary-500"
              />
              <span className="text-sm text-dark-200">
                Estoque dividido em armazéns (Loja/Estoque)
                <span className="block text-xs text-dark-400 mt-0.5">
                  Ative para lojas que enviam duas planilhas de inventário no Protheus — uma da
                  loja (armazém 01) e outra do estoque (armazém 03). A acuracidade passa a ser
                  calculada e exibida separadamente para os dois, além do geral combinado.
                </span>
              </span>
            </label>
          )}

          <div>
            <label htmlFor="filial-grupo-recebimento" className="block text-sm font-medium text-dark-300 mb-2">Grupo de Recebimento</label>
            <select
              id="filial-grupo-recebimento"
              value={form.grupoRecebimento}
              onChange={(e) => setForm({ ...form, grupoRecebimento: e.target.value })}
              className="select-field"
            >
              <option value="">Não definido</option>
              <option value="GRUPO_1">Grupo 1</option>
              <option value="GRUPO_2">Grupo 2</option>
              <option value="CD">CD</option>
              <option value="BV">BV</option>
            </select>
            <p className="text-xs text-dark-400 mt-1.5">
              Define em quais dias a loja recebe material. Filiais sem grupo ficam de fora do
              planejamento de inventário da Qualidade.
            </p>
          </div>

          <div>
            <label htmlFor="filial-periodicidade" className="block text-sm font-medium text-dark-300 mb-2">Periodicidade do Inventário</label>
            <select
              id="filial-periodicidade"
              value={form.periodicidadeInventario}
              onChange={(e) => setForm({ ...form, periodicidadeInventario: e.target.value })}
              className="select-field"
            >
              <option value="">Mensal (padrão)</option>
              <option value="SEMANAL">Semanal (contagem parcial toda semana, ex: CD 00)</option>
              <option value="BIMESTRAL">Bimestral (um mês sim, um mês não)</option>
            </select>
            <p className="text-xs text-dark-400 mt-1.5">
              Semanal fica fora do plano automático de 1 dia por mês — o agendamento de cada
              semana é feito diretamente na aba de Inventários.
            </p>
          </div>

          {form.periodicidadeInventario === 'BIMESTRAL' && (
            <div>
              <label htmlFor="filial-referencia-bimestral" className="block text-sm font-medium text-dark-300 mb-2">Mês de Referência (ciclo &quot;sim&quot;)</label>
              <input
                id="filial-referencia-bimestral"
                type="month"
                value={form.referenciaBimestral}
                onChange={(e) => setForm({ ...form, referenciaBimestral: e.target.value })}
                className="input-field"
              />
              <p className="text-xs text-dark-400 mt-1.5">
                Mês em que a filial teve (ou terá) inventário — ex: agosto/2026. Os meses
                seguintes alternam automaticamente a partir dessa referência.
              </p>
            </div>
          )}

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