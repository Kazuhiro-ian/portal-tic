import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Printer, Package, Users, AlertTriangle, ExternalLink, Plus, X, Zap, Cloud, Server, Tag, ClipboardCheck, Truck } from 'lucide-react';
import { SidePanel } from './SidePanel.jsx';
import { listarAtivos, listarEstoqueItens, listarColaboradores, listarFiliais, listarZebraCotas, listarZebraEnvios, listarInventarios, listarDiasRecebimento, listarAvisos, salvarAviso, deletarAviso, listarEscalasPorPeriodo, listarLinks } from '../services/api.js';
import { toISO } from '../utils/datas.js';
import { useAuth } from '../context/AuthContext.jsx';
import { estaTrabalhando, indexarEscalasPorColaboradorEData } from '../utils/escala.js';

export function Dashboard() {
  const { canWrite } = useAuth();
  const [printers, setPrinters] = useState([]);
  const [stock, setStock] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [branches, setBranches] = useState([]);
  const [branchQuotas, setBranchQuotas] = useState([]);
  const [zebraDistributions, setZebraDistributions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [qualidadeInventarios, setQualidadeInventarios] = useState([]);
  const [qualidadeDiasRecebimento, setQualidadeDiasRecebimento] = useState([]);
  const [escalasHoje, setEscalasHoje] = useState({});

  const [links, setLinks] = useState([]);
  const [notices, setNotices] = useState([]);
  const [showAddNotice, setShowAddNotice] = useState(false);
  const [newNotice, setNewNotice] = useState({ mensagem: '', prioridade: 'MEDIA' });

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const hoje = new Date();
      const amanha = new Date(hoje);
      amanha.setDate(amanha.getDate() + 1);
      const hojeISO = toISO(hoje);
      const amanhaISO = toISO(amanha);

      setIsLoading(true);
      const [ativosData, estoqueData, colaboradoresData, filiaisData, cotasData, enviosData, inventariosData, diasRecebimentoData, avisosData, escalasData, linksData] = await Promise.all([
        listarAtivos(),
        listarEstoqueItens(),
        listarColaboradores(),
        listarFiliais(),
        listarZebraCotas(),
        listarZebraEnvios(),
        listarInventarios(hojeISO, amanhaISO),
        listarDiasRecebimento(hojeISO, amanhaISO),
        listarAvisos(),
        listarEscalasPorPeriodo(hojeISO, hojeISO),
        listarLinks(),
      ]);
      setPrinters(ativosData.filter((a) => a.tipo === 'IMPRESSORA' || a.tipo === 'IMPRESSORA_ZEBRA'));
      setStock(estoqueData);
      setEmployees(colaboradoresData);
      setBranches(filiaisData);
      setBranchQuotas(cotasData);
      setZebraDistributions(enviosData);
      setQualidadeInventarios(inventariosData);
      setQualidadeDiasRecebimento(diasRecebimentoData);
      setNotices(avisosData);
      setEscalasHoje(indexarEscalasPorColaboradorEData(escalasData));
      setLinks(linksData);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const onlinePrinters = printers.filter((p) => p.status === 'Online').length;
  const offlinePrinters = printers.filter((p) => p.status !== 'Online');
  const ativoLabel = (a) => a.etiqueta || `${a.marca} ${a.modelo}`;
  const lowStockItems = stock.filter((s) => s.quantity <= s.minQuantity);
  const todayName = new Date().toLocaleDateString('pt-BR', { weekday: 'long' });
  const capitalizedToday = todayName.charAt(0).toUpperCase() + todayName.slice(1);

  const hojeISO = toISO(new Date());

  // Quem está escalado hoje vem da escala real gravada no banco (/api/escalas), e não de um
  // campo no cadastro do colaborador — o backend não guarda "dias da semana" por pessoa.
  const todayEmployees = employees.filter((e) => estaTrabalhando(escalasHoje[`${e.id}_${hojeISO}`]));
  const amanhaData = new Date();
  amanhaData.setDate(amanhaData.getDate() + 1);
  const amanhaISO = toISO(amanhaData);

  const inventariosHoje = qualidadeInventarios.filter((i) => i.data === hojeISO && i.status !== 'CANCELADO');
  const inventariosAmanha = qualidadeInventarios.filter((i) => i.data === amanhaISO && i.status !== 'CANCELADO');
  const nomeInventariosAmanha = inventariosAmanha.map((inv) => {
    const filial = branches.find((b) => b.id === inv.filialId);
    return filial ? `${filial.numeroFilial} - ${filial.nome}` : `Filial #${inv.filialId}`;
  }).join(', ');

  const diaRecebimentoHoje = qualidadeDiasRecebimento.find((d) => d.data === hojeISO);
  const diaRecebimentoAmanha = qualidadeDiasRecebimento.find((d) => d.data === amanhaISO);

  const lojasRecebimentoHoje = diaRecebimentoHoje?.tipo && diaRecebimentoHoje.tipo !== 'SEM_PEDIDOS'
    ? branches.filter((b) => b.grupoRecebimento === diaRecebimentoHoje.tipo)
    : [];

  const contarLojasDoGrupo = (tipo) => {
    if (!tipo || tipo === 'SEM_PEDIDOS') return 0;
    return branches.filter((b) => b.grupoRecebimento === tipo).length;
  };

  const recebimentoHojeQtd = contarLojasDoGrupo(diaRecebimentoHoje?.tipo);
  const recebimentoAmanhaQtd = contarLojasDoGrupo(diaRecebimentoAmanha?.tipo);

  const rotuloTipoDia = (tipo) => {
    if (!tipo) return 'não configurado';
    if (tipo === 'SEM_PEDIDOS') return 'sem pedidos';
    return tipo === 'GRUPO_1' ? 'Grupo 1' : 'Grupo 2';
  };

  const formatarHora = (horario) => (horario ? horario.slice(0, 5) : null);

  const statusExibicaoInventario = (inv) => {
    if (inv.status === 'CANCELADO') {
      return { texto: 'Cancelado', cor: 'text-dark-400' };
    }
    if (inv.status === 'REALIZADO') {
      const intervalo = inv.horarioInicio && inv.horarioFim
        ? ` (${formatarHora(inv.horarioInicio)} – ${formatarHora(inv.horarioFim)})`
        : '';
      return { texto: `Realizado${intervalo}`, cor: 'text-primary-400' };
    }
    if (!inv.horarioInicio) {
      return { texto: 'Horário não definido', cor: 'text-dark-400' };
    }

    const agora = new Date();
    const agoraMinutos = agora.getHours() * 60 + agora.getMinutes();
    const [hIni, mIni] = inv.horarioInicio.split(':').map(Number);
    const inicioMinutos = hIni * 60 + mIni;

    if (agoraMinutos < inicioMinutos) {
      return { texto: `Começa às ${formatarHora(inv.horarioInicio)}`, cor: 'text-amber-400' };
    }

    if (inv.horarioFim) {
      const [hFim, mFim] = inv.horarioFim.split(':').map(Number);
      const fimMinutos = hFim * 60 + mFim;
      if (agoraMinutos > fimMinutos) {
        return { texto: `Deveria terminar às ${formatarHora(inv.horarioFim)}`, cor: 'text-red-400' };
      }
    }

    return { texto: `Em andamento (desde ${formatarHora(inv.horarioInicio)})`, cor: 'text-green-400' };
  };

  const zebraPendingBranches = (() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const currentDay = today.getDate();

    return branchQuotas.filter((quota) => {
      const enviosRegularesNoMes = zebraDistributions.filter((d) => {
        const dDate = new Date(d.dataEnvio + 'T00:00:00');
        return d.filialId?.toString() === quota.filialId?.toString() &&
          d.tipoEnvio === 'REGULAR' &&
          dDate.getMonth() === currentMonth &&
          dDate.getFullYear() === currentYear;
      });

      if (enviosRegularesNoMes.length === 0 && currentDay >= quota.diaEnvio1) return true;
      if (enviosRegularesNoMes.length === 1 && currentDay >= quota.diaEnvio2) return true;
      return false;
    });
  })();

  const zebraBranchLabel = (filialId) => {
    const b = branches.find((br) => br.id === filialId || br.numeroFilial?.toString() === filialId?.toString());
    return b ? `Loja ${b.numeroFilial} - ${b.nome}` : filialId;
  };

  const handleAddNotice = async () => {
    if (!newNotice.mensagem.trim()) return;
    try {
      await salvarAviso(newNotice);
      setNewNotice({ mensagem: '', prioridade: 'MEDIA' });
      setShowAddNotice(false);
      await carregarDados();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteNotice = async (id) => {
    try {
      await deletarAviso(id);
      setNotices((prev) => prev.filter((n) => n.id !== id));
    } catch (error) {
      console.error(error);
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'cloud':
        return Cloud;
      case 'internal':
        return Server;
      default:
        return Zap;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-500/15 border border-primary-500/30 text-primary-400 text-xs font-semibold tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse" />
              Grupo Queiroz TI
            </span>
          </div>
          <p className="text-dark-400">Visao geral do setor de TI</p>
        </div>
        <div className="text-right">
          <p className="text-dark-400 text-sm">{capitalizedToday}</p>
          <p className="text-white font-medium">{new Date().toLocaleDateString('pt-BR')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-6 lg:grid-rows-3 gap-4">
        {/* Recebimento Hoje — card vertical, ocupa a coluna toda (1x3) */}
        <div className="metric-card lg:row-span-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center shrink-0">
              <Truck className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{isLoading ? '—' : recebimentoHojeQtd}</p>
              <p className="text-sm text-dark-400">Recebimento Hoje ({rotuloTipoDia(diaRecebimentoHoje?.tipo)})</p>
            </div>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto scrollbar-thin">
            {isLoading ? (
              <p className="text-dark-400 text-sm text-center py-4">Carregando...</p>
            ) : lojasRecebimentoHoje.length === 0 ? (
              <p className="text-dark-400 text-sm text-center py-4">Nenhuma loja em recebimento hoje.</p>
            ) : (
              lojasRecebimentoHoje.map((loja) => (
                <div key={loja.id} className="text-sm text-dark-100 px-3 py-2 rounded-lg bg-dark-700/50 border border-dark-600">
                  {loja.numeroFilial} - {loja.nome}
                </div>
              ))
            )}
          </div>

          <p className="text-xs text-dark-400 pt-2 border-t border-dark-700">
            Amanhã: {isLoading ? '—' : recebimentoAmanhaQtd} ({rotuloTipoDia(diaRecebimentoAmanha?.tipo)})
          </p>
        </div>

        {/* Inventários de Hoje — card largo (5x1) */}
        <div className="card lg:col-span-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-blue-400" />
              Inventários de Hoje
            </h2>
            <span className="text-sm text-dark-400">
              Amanhã: {isLoading ? '—' : (inventariosAmanha.length === 0 ? 'nenhum' : nomeInventariosAmanha)}
            </span>
          </div>

          <div className="space-y-3 max-h-40 overflow-y-auto scrollbar-thin">
            {isLoading ? (
              <p className="text-dark-400 text-center py-4">Carregando...</p>
            ) : inventariosHoje.length === 0 ? (
              <p className="text-dark-400 text-center py-4">Nenhum inventário agendado para hoje.</p>
            ) : (
              inventariosHoje.map((inv) => {
                const filial = branches.find((b) => b.id === inv.filialId);
                const statusInfo = statusExibicaoInventario(inv);
                return (
                  <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-dark-700/50 border border-dark-600">
                    <p className="text-sm font-medium text-white">
                      {filial ? `${filial.numeroFilial} — ${filial.nome}` : `Filial #${inv.filialId}`}
                    </p>
                    <p className={`text-sm font-medium ${statusInfo.cor}`}>{statusInfo.texto}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Impressoras */}
        <div className="metric-card lg:row-span-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center shrink-0">
              <Printer className="w-6 h-6 text-primary-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{isLoading ? '—' : printers.length}</p>
              <p className="text-sm text-dark-400">Impressoras</p>
            </div>
          </div>
          <p className="text-xs text-dark-400">{onlinePrinters} online</p>
          <div className="flex-1 space-y-1 overflow-y-auto scrollbar-thin">
            {!isLoading && offlinePrinters.slice(0, 3).map((p) => (
              <p key={p.id} className="text-xs text-red-400 truncate">● {ativoLabel(p)}</p>
            ))}
            {!isLoading && offlinePrinters.length > 3 && (
              <p className="text-xs text-dark-400">+{offlinePrinters.length - 3} outras offline</p>
            )}
          </div>
        </div>

        {/* Estoque Baixo */}
        <div className="metric-card lg:row-span-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center shrink-0">
              <Package className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{isLoading ? '—' : lowStockItems.length}</p>
              <p className="text-sm text-dark-400">Estoque Baixo</p>
            </div>
          </div>
          <p className="text-xs text-dark-400">{stock.length} itens totais</p>
          <div className="flex-1 space-y-1 overflow-y-auto scrollbar-thin">
            {!isLoading && lowStockItems.slice(0, 2).map((item) => (
              <p key={item.id} className="text-xs text-dark-100 truncate">{item.name}</p>
            ))}
          </div>
          {!isLoading && lowStockItems.length > 0 && (
            <Link to="/estoque" className="text-xs text-primary-400 hover:text-primary-300">Ver todos →</Link>
          )}
        </div>

        {/* No Plantão Hoje */}
        <div className="metric-card lg:row-span-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center shrink-0">
              <Users className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{isLoading ? '—' : todayEmployees.length}</p>
              <p className="text-sm text-dark-400">Trabalhando Hoje</p>
            </div>
          </div>
          <p className="text-xs text-dark-400">{employees.length} colaboradores</p>
          <div className="flex-1 space-y-1 overflow-y-auto scrollbar-thin">
            {!isLoading && employees.map((e) => {
              const trabalhando = estaTrabalhando(escalasHoje[`${e.id}_${hojeISO}`]);
              return (
                <p key={e.id} className={`text-xs truncate ${trabalhando ? 'text-green-400' : 'text-amber-400'}`}>
                  ● {e.name}
                </p>
              );
            })}
          </div>
        </div>

        {/* Avisos Ativos */}
        <div className="metric-card lg:row-span-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{notices.length}</p>
              <p className="text-sm text-dark-400">Avisos Ativos</p>
            </div>
          </div>
          <p className="text-xs text-dark-400">{notices.filter((n) => n.prioridade === 'ALTA').length} urgentes</p>
          <div className="flex-1 space-y-1 overflow-y-auto scrollbar-thin">
            {notices.filter((n) => n.prioridade === 'ALTA').slice(0, 2).map((n) => (
              <p key={n.id} className="text-xs text-red-400 truncate">{n.mensagem}</p>
            ))}
          </div>
        </div>

        {/* Zebra Pendentes */}
        <div className={`metric-card lg:row-span-2 ${zebraPendingBranches.length > 0 ? 'border-accent-500/40 bg-accent-500/5' : ''}`}>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${zebraPendingBranches.length > 0 ? 'bg-accent-500/20' : 'bg-dark-700'}`}>
              <Tag className={`w-6 h-6 ${zebraPendingBranches.length > 0 ? 'text-accent-400' : 'text-dark-400'}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${zebraPendingBranches.length > 0 ? 'text-accent-400' : 'text-white'}`}>{isLoading ? '—' : zebraPendingBranches.length}</p>
              <p className="text-sm text-dark-400">Zebra Pendentes</p>
            </div>
          </div>
          <p className="text-xs text-dark-400">{branchQuotas.length} filiais cadastradas</p>
          <div className="flex-1 space-y-1 overflow-y-auto scrollbar-thin">
            {!isLoading && zebraPendingBranches.slice(0, 3).map((b) => (
              <p key={b.filialId} className="text-xs text-accent-300 truncate">{zebraBranchLabel(b.filialId)}</p>
            ))}
            {!isLoading && zebraPendingBranches.length > 3 && (
              <p className="text-xs text-dark-400">+{zebraPendingBranches.length - 3} outras</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Avisos da Equipe</h2>
            {canWrite && (
              <button onClick={() => setShowAddNotice(true)} className="btn-primary text-sm">
                <Plus className="w-4 h-4" />
                Novo
              </button>
            )}
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-thin">
            {notices.length === 0 ? (
              <p className="text-dark-400 text-center py-8">Nenhum aviso cadastrado</p>
            ) : (
              notices.map((notice) => (
                <div
                  key={notice.id}
                  className={`p-3 rounded-lg border ${
                    notice.prioridade === 'ALTA'
                      ? 'bg-red-500/10 border-red-500/30'
                      : notice.prioridade === 'MEDIA'
                        ? 'bg-yellow-500/10 border-yellow-500/30'
                        : 'bg-dark-700/50 border-dark-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-dark-100">{notice.mensagem}</p>
                    {canWrite && (
                      <button
                        onClick={() => handleDeleteNotice(notice.id)}
                        className="text-dark-400 hover:text-red-400 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-dark-400 mt-2">
                    {notice.autor} - {new Date(notice.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Links Mais Utilizados</h2>
          {!isLoading && links.length === 0 && (
            <p className="text-dark-400 text-sm text-center py-8">
              Nenhum link cadastrado ainda. Cadastre em &quot;Links Uteis&quot;.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto scrollbar-thin">
            {links.slice(0, 8).map((link) => {
              const Icon = getCategoryIcon(link.category);
              return (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg bg-dark-700/50 hover:bg-dark-700 border border-dark-600 hover:border-primary-500/50 transition-all group"
                >
                  <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center group-hover:bg-primary-500/30 transition-colors">
                    <Icon className="w-5 h-5 text-primary-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{link.name}</p>
                    <ExternalLink className="w-3 h-3 text-dark-400 group-hover:text-primary-400 transition-colors" />
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </div>

      <SidePanel
        isOpen={showAddNotice}
        onClose={() => setShowAddNotice(false)}
        title="Novo Aviso"
        size="sm"
        footer={
          <>
            <button onClick={() => setShowAddNotice(false)} className="btn-secondary">
              Cancelar
            </button>
            <button onClick={handleAddNotice} className="btn-primary">
              Adicionar
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="aviso-mensagem" className="block text-sm font-medium text-dark-300 mb-2">Mensagem</label>
            <textarea
              id="aviso-mensagem"
              value={newNotice.mensagem}
              onChange={(e) => setNewNotice({ ...newNotice, mensagem: e.target.value })}
              className="input-field min-h-[100px] resize-none"
              placeholder="Digite a mensagem do aviso..."
            />
          </div>
          <div>
            <label htmlFor="aviso-prioridade" className="block text-sm font-medium text-dark-300 mb-2">Prioridade</label>
            <select
              id="aviso-prioridade"
              value={newNotice.prioridade}
              onChange={(e) => setNewNotice({ ...newNotice, prioridade: e.target.value })}
              className="select-field"
            >
              <option value="BAIXA">Baixa</option>
              <option value="MEDIA">Media</option>
              <option value="ALTA">Alta</option>
            </select>
          </div>
        </div>
      </SidePanel>
    </div>
  );
}
