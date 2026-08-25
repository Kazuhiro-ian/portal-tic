import { useState, forwardRef, useImperativeHandle } from 'react';
import { Edit, Trash2, Eye, EyeOff, Copy, Check, Lock, Loader2, History } from 'lucide-react';
import { SidePanel } from './SidePanel.jsx';
import { FiltroBar } from './FiltroBar.jsx';
import { DataTable } from './DataTable.jsx';
import { Paginacao } from './Paginacao.jsx';
import { usePaginacao } from '../hooks/usePaginacao.js';
import {
  salvarCredencial, atualizarCredencial, deletarCredencial,
  revelarSenhaCredencial, listarAuditoriaCredenciais,
} from '../services/api.js';

const emptyCredForm = { name: '', username: '', password: '', notes: '' };

const COLUNAS_AUDITORIA = [
  {
    chave: 'credencialNome',
    header: 'Credencial',
    mobile: 'titulo',
    tdClassName: 'text-white',
    render: (log) => log.credencialNome,
  },
  {
    chave: 'usuario',
    header: 'Usuário',
    mobile: 'subtitulo',
    tdClassName: 'font-mono text-primary-400 text-sm',
    render: (log) => log.usuario,
  },
  {
    chave: 'acao',
    header: 'Ação',
    mobile: 'badge',
    render: (log) => (
      <span className={`badge ${log.acao === 'EXCLUIR' ? 'badge-danger' : log.acao === 'CRIAR' ? 'badge-success' : 'badge-info'}`}>
        {log.acao}
      </span>
    ),
  },
  {
    chave: 'dataHora',
    header: 'Quando',
    tdClassName: 'text-dark-300 text-sm',
    render: (log) => new Date(log.dataHora).toLocaleString('pt-BR'),
  },
];

/**
 * Aba de Credenciais (cofre) da Base de Conhecimento. Mesmo padrão de ArticlesTab: dados e
 * recarregar vêm do pai, o resto (busca, modais, log de auditoria) é local. O botão "Nova
 * Credencial" fica no cabeçalho da página, por isso expõe `abrirNovo` via ref.
 */
export const CredentialsTab = forwardRef(function CredentialsTab(
  { credentials, isLoading, canWrite, isAdmin, onAtualizado, showToast, confirmar },
  ref,
) {
  const [search, setSearch] = useState('');
  const [showCredModal, setShowCredModal] = useState(false);
  const [editingCred, setEditingCred] = useState(null);
  const [credForm, setCredForm] = useState(emptyCredForm);

  const [visiblePasswords, setVisiblePasswords] = useState(new Set());
  const [revealedPasswords, setRevealedPasswords] = useState({});
  const [revealingId, setRevealingId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditLog, setAuditLog] = useState([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const paginacaoAuditoria = usePaginacao(auditLog);

  const filteredCredentials = credentials.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.username.toLowerCase().includes(search.toLowerCase()) ||
    (c.notes && c.notes.toLowerCase().includes(search.toLowerCase()))
  );

  const handleOpenCredModal = (cred) => {
    if (cred) {
      setEditingCred(cred);
      setCredForm({
        name: cred.name || '',
        username: cred.username || '',
        // A listagem não traz mais a senha -- fica em branco; se o usuário não digitar
        // nada, o backend preserva a senha atual (não sobrescreve com string vazia).
        password: '',
        notes: cred.notes || '',
      });
    } else {
      setEditingCred(null);
      setCredForm(emptyCredForm);
    }
    setShowCredModal(true);
  };

  useImperativeHandle(ref, () => ({
    abrirNovo: () => handleOpenCredModal(),
  }));

  const copyToClipboard = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      showToast('Copiado para a área de transferência!');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      showToast('Não foi possível copiar. Verifique a permissão de área de transferência do navegador.', 'error');
    }
  };

  // A listagem não traz mais a senha (cofre seguro) -- "mostrar" busca sob demanda,
  // e cada revelação fica registrada no log de auditoria do backend.
  const handleTogglePassword = async (cred) => {
    const newVisible = new Set(visiblePasswords);
    if (newVisible.has(cred.id)) {
      newVisible.delete(cred.id);
      setVisiblePasswords(newVisible);
      // Limpa o cache: a próxima vez que revelar, gera um novo registro de auditoria.
      setRevealedPasswords((prev) => {
        // eslint-disable-next-line no-unused-vars
        const { [cred.id]: _removida, ...resto } = prev;
        return resto;
      });
      return;
    }

    try {
      setRevealingId(cred.id);
      const { senha } = await revelarSenhaCredencial(cred.id);
      setRevealedPasswords((prev) => ({ ...prev, [cred.id]: senha }));
      newVisible.add(cred.id);
      setVisiblePasswords(newVisible);
    } catch (error) {
      showToast(error.message || 'Erro ao revelar a senha.', 'error');
    } finally {
      setRevealingId(null);
    }
  };

  const handleCopyPassword = async (cred) => {
    try {
      // Sempre revela de novo (mesmo se já visível) -- toda cópia precisa do seu próprio
      // registro de auditoria, não só a primeira visualização.
      const { senha } = await revelarSenhaCredencial(cred.id, 'COPIAR');
      await copyToClipboard(senha, `${cred.id}-pass`);
    } catch (error) {
      showToast(error.message || 'Erro ao copiar a senha.', 'error');
    }
  };

  const handleVerAuditoria = async () => {
    setShowAuditModal(true);
    try {
      setIsLoadingAudit(true);
      const data = await listarAuditoriaCredenciais();
      setAuditLog(data);
    } catch (error) {
      showToast(error.message || 'Erro ao carregar o log de auditoria.', 'error');
    } finally {
      setIsLoadingAudit(false);
    }
  };

  const handleSaveCred = async () => {
    if (!credForm.name.trim() || !credForm.username.trim()) {
      showToast('Nome e Usuário são obrigatórios.', 'error');
      return;
    }
    // Senha só é obrigatória ao criar -- na edição, em branco significa "manter a atual".
    if (!editingCred && !credForm.password.trim()) {
      showToast('Senha é obrigatória para uma nova credencial.', 'error');
      return;
    }

    try {
      if (editingCred) {
        await atualizarCredencial(editingCred.id, credForm);
        showToast('Credencial atualizada com sucesso!');
      } else {
        await salvarCredencial(credForm);
        showToast('Nova credencial adicionada!');
      }

      await onAtualizado();
      setShowCredModal(false);
      setEditingCred(null);
      setCredForm(emptyCredForm);
    } catch (error) {
      showToast('Erro ao salvar credencial.', 'error');
    }
  };

  const handleDeleteCred = async (id) => {
    const confirmado = await confirmar({
      titulo: 'Excluir credencial',
      mensagem: 'Tem certeza que deseja excluir esta credencial do cofre? A senha guardada será perdida.',
    });
    if (!confirmado) return;

    try {
      await deletarCredencial(id);
      showToast('Credencial excluída.');
      await onAtualizado();
    } catch (error) {
      showToast('Erro ao excluir credencial.', 'error');
    }
  };

  return (
    <>
      <div className="card">
        <div className="flex items-center gap-2 mb-6 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
          <Lock className="w-5 h-5 text-yellow-400 shrink-0" />
          <p className="text-sm text-yellow-200 flex-1">Cofre seguro de credenciais de acesso para switches, servidores e roteadores da infraestrutura. Toda visualização ou cópia de senha fica registrada.</p>
          {isAdmin && (
            <button onClick={handleVerAuditoria} className="btn-secondary text-xs shrink-0">
              <History className="w-4 h-4" />
              Ver auditoria
            </button>
          )}
        </div>

        <FiltroBar
          busca={search}
          onBuscaChange={setSearch}
          placeholderBusca="Buscar por nome do equipamento, usuário ou notas..."
        />

        <div className="space-y-3">
          {isLoading ? (
            <p className="text-dark-400 text-center py-12">Carregando credenciais...</p>
          ) : filteredCredentials.length === 0 ? (
            <p className="text-dark-400 text-center py-12">Nenhuma credencial encontrada</p>
          ) : (
            filteredCredentials.map((cred) => (
              <div
                key={cred.id}
                className="p-4 rounded-lg bg-dark-700/50 border border-dark-600 hover:border-dark-500 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white">{cred.name}</h3>
                    {cred.notes && <p className="text-xs text-dark-400 mt-1">{cred.notes}</p>}
                  </div>
                  {canWrite && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleOpenCredModal(cred)}
                        className="btn-secondary px-2 py-1"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCred(cred.id)}
                        className="btn-danger px-2 py-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-dark-600">
                  <div>
                    <p className="text-xs text-dark-400 mb-1">Usuário</p>
                    <div className="flex items-center gap-2">
                      <code className="text-primary-400 bg-dark-600 px-2.5 py-1 rounded text-sm font-mono">{cred.username}</code>
                      <button
                        onClick={() => copyToClipboard(cred.username, `${cred.id}-user`)}
                        className="btn-secondary px-2 py-1"
                        title="Copiar Usuário" aria-label="Copiar Usuário"
                      >
                        {copiedId === `${cred.id}-user` ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-dark-400 mb-1">Senha</p>
                    <div className="flex items-center gap-2">
                      <code className="text-dark-300 bg-dark-600 px-2.5 py-1 rounded text-sm font-mono">
                        {visiblePasswords.has(cred.id) ? (revealedPasswords[cred.id] ?? '···') : '••••••••••••'}
                      </code>
                      <button
                        onClick={() => handleTogglePassword(cred)}
                        disabled={revealingId === cred.id}
                        className="btn-secondary px-2 py-1"
                        title="Exibir/Ocultar" aria-label="Exibir/Ocultar"
                      >
                        {revealingId === cred.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : visiblePasswords.has(cred.id) ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleCopyPassword(cred)}
                        className="btn-secondary px-2 py-1"
                        title="Copiar Senha" aria-label="Copiar Senha"
                      >
                        {copiedId === `${cred.id}-pass` ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* PAINEL: CRIAR / EDITAR CREDENCIAL */}
      <SidePanel
        isOpen={showCredModal}
        onClose={() => setShowCredModal(false)}
        title={editingCred ? 'Editar Credencial' : 'Nova Credencial de Acesso'}
        footer={
          <>
            <button onClick={() => setShowCredModal(false)} className="btn-secondary">Cancelar</button>
            <button onClick={handleSaveCred} className="btn-primary">
              {editingCred ? 'Salvar Alterações' : 'Adicionar Credencial'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="cred-nome" className="block text-sm font-medium text-dark-300 mb-2">Nome do Equipamento / Sistema *</label>
            <input
              id="cred-nome"
              type="text"
              value={credForm.name}
              onChange={(e) => setCredForm({ ...credForm, name: e.target.value })}
              className="input-field"
              placeholder="Ex: Switch Core - Andar 1"
            />
          </div>
          <div>
            <label htmlFor="cred-usuario" className="block text-sm font-medium text-dark-300 mb-2">Usuário de Acesso *</label>
            <input
              id="cred-usuario"
              type="text"
              value={credForm.username}
              onChange={(e) => setCredForm({ ...credForm, username: e.target.value })}
              className="input-field font-mono"
              placeholder="Ex: admin"
            />
          </div>
          <div>
            <label htmlFor="cred-senha" className="block text-sm font-medium text-dark-300 mb-2">
              Senha {editingCred ? '(deixe em branco para manter a atual)' : '*'}
            </label>
            <input
              id="cred-senha"
              type="password"
              value={credForm.password}
              onChange={(e) => setCredForm({ ...credForm, password: e.target.value })}
              className="input-field font-mono"
              placeholder={editingCred ? '••••••••••••' : 'Digite a senha'}
            />
          </div>
          <div>
            <label htmlFor="cred-notas" className="block text-sm font-medium text-dark-300 mb-2">Notas / IP de Acesso (opcional)</label>
            <input
              id="cred-notas"
              type="text"
              value={credForm.notes}
              onChange={(e) => setCredForm({ ...credForm, notes: e.target.value })}
              className="input-field"
              placeholder="Ex: IP: 10.100.0.1 - Porta 22 SSH"
            />
          </div>
        </div>
      </SidePanel>

      {/* PAINEL: LOG DE AUDITORIA DO COFRE (só ADMIN) */}
      <SidePanel
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
        title="Auditoria do Cofre de Credenciais"
        size="lg"
      >
        <DataTable
          colunas={COLUNAS_AUDITORIA}
          dados={paginacaoAuditoria.itensPagina}
          carregando={isLoadingAudit}
          vazio="Nenhum acesso registrado ainda."
          offset="220px"
        />
        <Paginacao {...paginacaoAuditoria} rotulo="registros" />
      </SidePanel>
    </>
  );
});
