import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { AssetFormPanel } from './AssetFormPanel.jsx';
import { AssetDetailPanel } from './AssetDetailPanel.jsx';
import { listarAtivos, salvarAtivo, atualizarAtivo, deletarAtivo, pingAtivo, listarFiliais, consultarPingHabilitado } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../hooks/useToast.js';
import { useConfirm } from '../hooks/useConfirm.jsx';
import { Toast } from './Toast.jsx';
import { Paginacao } from './Paginacao.jsx';
import { usePaginacao } from '../hooks/usePaginacao.js';

// Cada coluna sabe desenhar a si mesma a partir de um ativo (e, no caso de "filial",
// de uma função auxiliar pra achar o nome). Isso evita reescrever a estrutura da
// tabela uma vez por tipo de ativo -- só a LISTA de colunas muda (ver COLUNAS_POR_TIPO).
const COLUNA_DEFS = {
  status: {
    header: 'Status',
    render: (ativo) => (
      <div className="flex items-center gap-2">
        {ativo.status === 'Online' ? (
          <Wifi className="w-5 h-5 text-green-400" />
        ) : (
          <WifiOff className="w-5 h-5 text-red-400" />
        )}
        <span className={`badge ${ativo.status === 'Online' ? 'badge-success' : 'badge-danger'}`}>
          {ativo.status}
        </span>
      </div>
    ),
  },
  marca: {
    header: 'Marca',
    render: (ativo) => <span className="text-dark-100">{ativo.marca}</span>,
  },
  modelo: {
    header: 'Modelo',
    render: (ativo) => <span className="text-dark-100">{ativo.modelo}</span>,
  },
  ip: {
    header: 'IP',
    render: (ativo) =>
      ativo.ip ? (
        <code className="text-primary-400 bg-dark-700 px-2 py-1 rounded text-sm">{ativo.ip}</code>
      ) : (
        <span className="text-dark-400 text-sm">—</span>
      ),
  },
  numeroSerie: {
    header: 'Nº de Série',
    render: (ativo) => <span className="text-dark-300 text-sm">{ativo.numeroSerie || '—'}</span>,
  },
  setor: {
    header: 'Setor',
    render: (ativo) => <span className="text-dark-300 text-sm">{ativo.setor || '—'}</span>,
  },
  filial: {
    header: 'Filial',
    render: (ativo, { nomeFilial }) => <span className="text-dark-300 text-sm">{nomeFilial(ativo.filialId)}</span>,
  },
  responsavelAtual: {
    header: 'Responsável',
    render: (ativo) => <span className="text-dark-300 text-sm">{ativo.responsavelAtual || '—'}</span>,
  },
};

// Ordem de prioridade (mais importante primeiro) -- quando um painel está aberto,
// só as 4 primeiras colunas de dados aparecem, pra tabela caber no espaço menor.
const COLUNAS_POR_TIPO = {
  DESKTOP: ['status', 'marca', 'modelo', 'setor', 'filial'],
  NOTEBOOK: ['status', 'marca', 'modelo', 'responsavelAtual', 'filial'],
  CELULAR: ['status', 'marca', 'modelo', 'responsavelAtual', 'filial'],
  COLETOR: ['status', 'marca', 'modelo', 'ip', 'setor'],
  IMPRESSORA: ['status', 'marca', 'modelo', 'ip', 'numeroSerie', 'setor'],
  IMPRESSORA_ZEBRA: ['status', 'marca', 'modelo', 'ip', 'numeroSerie', 'setor'],
};

export function AssetList({ tipo, tipoLabel }) {
  const { canWrite } = useAuth();
  const [ativos, setAtivos] = useState([]);
  const [filiais, setFiliais] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [panelMode, setPanelMode] = useState(null); // null | 'view' | 'edit'
  const [activeAtivo, setActiveAtivo] = useState(null);
  const [pinging, setPinging] = useState(null);
  // Fica falso em produção: o backend na nuvem não alcança os IPs internos dos equipamentos.
  const [pingHabilitado, setPingHabilitado] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { toast, showToast, hideToast } = useToast();
  const { confirmar, dialogoConfirmacao } = useConfirm();

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setIsLoading(true);
      const [dadosAtivos, dadosFiliais, disponibilidadePing] = await Promise.all([
        listarAtivos(),
        listarFiliais(),
        consultarPingHabilitado(),
      ]);
      setAtivos(dadosAtivos);
      setFiliais(dadosFiliais);
      setPingHabilitado(disponibilidadePing.habilitado);
    } catch (error) {
      console.error(error);
      showToast('Erro ao carregar ativos do servidor.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const nomeFilial = (filialId) => {
    const filial = filiais.find((f) => f.id === filialId);
    return filial ? `${filial.numeroFilial} - ${filial.nome}` : '—';
  };

  const doTipo = ativos.filter((a) => a.tipo === tipo);

  const filteredAtivos = doTipo.filter((a) => {
    const matchSearch =
      (a.ip && a.ip.includes(search)) ||
      (a.setor && a.setor.toLowerCase().includes(search.toLowerCase())) ||
      (a.modelo && a.modelo.toLowerCase().includes(search.toLowerCase())) ||
      (a.etiqueta && a.etiqueta.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = filterStatus === 'all' || a.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const paginacao = usePaginacao(filteredAtivos);

  const panelAberto = panelMode !== null;
  const colunas = panelAberto
    ? COLUNAS_POR_TIPO[tipo].slice(0, 4)
    : COLUNAS_POR_TIPO[tipo];

  const handleNovo = () => {
    setActiveAtivo(null);
    setPanelMode('edit');
  };

  const handleVisualizar = (ativo) => {
    setActiveAtivo(ativo);
    setPanelMode('view');
  };

  const handleEditar = (ativo) => {
    setActiveAtivo(ativo);
    setPanelMode('edit');
  };

  const handleFecharPainel = () => setPanelMode(null);

  const handleSave = async (payload) => {
    try {
      if (activeAtivo) {
        await atualizarAtivo(activeAtivo.id, payload);
        showToast('Ativo atualizado com sucesso!');
      } else {
        await salvarAtivo(payload);
        showToast('Ativo cadastrado com sucesso!');
      }

      await carregarDados();
      setPanelMode(null);
    } catch (error) {
      showToast(error.message || 'Erro ao salvar ativo.', 'error');
    }
  };

  const handleDelete = async (id) => {
    const confirmado = await confirmar({
      titulo: `Excluir ${tipoLabel.toLowerCase()}`,
      mensagem: 'Tem certeza que deseja excluir este ativo? Esta ação não pode ser desfeita.',
    });
    if (!confirmado) return;

    try {
      await deletarAtivo(id);
      showToast('Ativo excluído com sucesso.');
      await carregarDados();
    } catch (error) {
      showToast('Erro ao excluir o ativo.', 'error');
    }
  };

  const handlePing = async (ativo) => {
    setPinging(ativo.id);
    try {
      const resultado = await pingAtivo(ativo.id);
      const online = resultado.status === 'Online';
      showToast(
        `Ping concluído em ${resultado.tempoRespostaMs}ms: o ativo está ${resultado.status}. ${resultado.detalhe}`,
        online ? 'success' : 'error'
      );
      await carregarDados();
    } catch (error) {
      showToast(error.message || 'Erro ao testar a conexão do ativo.', 'error');
    } finally {
      setPinging(null);
    }
  };

  return (
    <div className="space-y-6 relative">

      {dialogoConfirmacao}

      <Toast toast={toast} onClose={hideToast} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{tipoLabel}</h1>
          <p className="text-dark-400 mt-1">
            {isLoading ? 'Carregando...' : `${doTipo.length} cadastrados`}
          </p>
        </div>
        {canWrite && (
          <button onClick={handleNovo} className="btn-primary">
            <Plus className="w-4 h-4" />
            Novo Ativo
          </button>
        )}
      </div>

      <div className="flex gap-4 items-start">
        <div className="card flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
              <input
                type="text"
                placeholder="Buscar por IP, setor, modelo ou etiqueta..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-10"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="select-field sm:w-40"
            >
              <option value="all">Todos Status</option>
              <option value="Online">Online</option>
              <option value="Offline">Offline</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {colunas.map((chave) => (
                    <th key={chave} className="table-header">
                      {COLUNA_DEFS[chave].header}
                    </th>
                  ))}
                  <th className="table-header text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginacao.itensPagina.length === 0 ? (
                  <tr>
                    <td colSpan={colunas.length + 1} className="text-center py-12 text-dark-400">
                      {isLoading ? 'Conectando ao banco de dados...' : 'Nenhum ativo encontrado.'}
                    </td>
                  </tr>
                ) : (
                  paginacao.itensPagina.map((ativo) => (
                    <tr
                      key={ativo.id}
                      onClick={() => handleVisualizar(ativo)}
                      className="hover:bg-dark-700/30 transition-colors cursor-pointer"
                    >
                      {colunas.map((chave) => (
                        <td key={chave} className="table-cell">
                          {COLUNA_DEFS[chave].render(ativo, { nomeFilial })}
                        </td>
                      ))}
                      <td className="table-cell" onClick={(e) => e.stopPropagation()}>
                        {canWrite && (
                          <div className="flex items-center justify-end gap-2">
                            {pingHabilitado && (
                              <button
                                onClick={() => handlePing(ativo)}
                                disabled={pinging === ativo.id}
                                className="btn-secondary px-3 py-1.5 text-sm"
                                title="Atualizar status da rede"
                              >
                                {pinging === ativo.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Wifi className="w-4 h-4" />
                                )}
                                {pinging === ativo.id ? 'Testando...' : 'Ping'}
                              </button>
                            )}
                            <button
                              onClick={() => handleEditar(ativo)}
                              className="btn-secondary px-3 py-1.5"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(ativo.id)}
                              className="btn-danger px-3 py-1.5"
                            >
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

          <Paginacao {...paginacao} rotulo="ativos" />
        </div>

        <AssetDetailPanel
          open={panelMode === 'view'}
          ativo={activeAtivo}
          tipoLabel={tipoLabel}
          filiais={filiais}
          onEdit={() => setPanelMode('edit')}
          onClose={handleFecharPainel}
        />

        <AssetFormPanel
          open={panelMode === 'edit'}
          ativo={activeAtivo}
          tipo={tipo}
          tipoLabel={tipoLabel}
          filiais={filiais}
          onSave={handleSave}
          onClose={handleFecharPainel}
          showToast={showToast}
        />
      </div>
    </div>
  );
}
