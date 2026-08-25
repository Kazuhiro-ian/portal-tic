import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, BookOpen, Key } from 'lucide-react';
import { ArticlesTab } from './ArticlesTab.jsx';
import { CredentialsTab } from './CredentialsTab.jsx';
import { listarArtigos, listarCredenciais } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../hooks/useToast.js';
import { useConfirm } from '../hooks/useConfirm.jsx';
import { Toast } from './Toast.jsx';
import { useAbaNaUrl } from '../hooks/useAbaNaUrl.js';

/**
 * Página da Base de Conhecimento: só orquestra as duas abas (Artigos e Credenciais), que são
 * dois domínios sem relação entre si além de dividirem a mesma tela -- cada uma cuida da
 * própria busca, filtros e modais em ArticlesTab.jsx/CredentialsTab.jsx. Fica aqui só o que
 * as duas precisam compartilhar de verdade: os dados (pro contador de cada aba ficar certo
 * mesmo sem ter sido aberta ainda) e o toast/diálogo de confirmação (não faria sentido duas
 * instâncias sobrepostas). O botão "Novo X" do cabeçalho aciona a aba ativa via ref.
 */
export function KnowledgeBase() {
  const { canWrite, hasRole, isAdmin } = useAuth();
  const podeVerCredenciais = hasRole('ADMIN', 'TECNICO');

  const [articles, setArticles] = useState([]);
  const [credentials, setCredentials] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useAbaNaUrl('aba', 'articles');

  const { toast, showToast, hideToast } = useToast();
  const { confirmar, dialogoConfirmacao } = useConfirm();

  const articlesTabRef = useRef(null);
  const credentialsTabRef = useRef(null);

  const carregarDados = useCallback(async () => {
    try {
      setIsLoading(true);
      const [artigosData, credsData] = await Promise.all([
        listarArtigos(),
        podeVerCredenciais ? listarCredenciais() : Promise.resolve([]),
      ]);
      setArticles(artigosData);
      setCredentials(credsData);
    } catch (error) {
      showToast('Erro ao carregar dados do banco.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast, podeVerCredenciais]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const abrirNovo = () => {
    if (activeTab === 'articles') {
      articlesTabRef.current?.abrirNovo();
    } else {
      credentialsTabRef.current?.abrirNovo();
    }
  };

  return (
    <div className="space-y-6 relative">
      {dialogoConfirmacao}

      <Toast toast={toast} onClose={hideToast} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Base de Conhecimento</h1>
          <p className="text-dark-400 mt-1">Procedimentos operacionais e cofre de credenciais</p>
        </div>
        {canWrite && (activeTab === 'articles' || podeVerCredenciais) && (
          <button onClick={abrirNovo} className="btn-primary">
            <Plus className="w-4 h-4" />
            {activeTab === 'articles' ? 'Novo Artigo' : 'Nova Credencial'}
          </button>
        )}
      </div>

      <div className="flex gap-2 p-1 bg-dark-800 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('articles')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
            activeTab === 'articles' ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-white'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Artigos ({articles.length})
        </button>
        {podeVerCredenciais && (
          <button
            onClick={() => setActiveTab('credentials')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
              activeTab === 'credentials' ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-white'
            }`}
          >
            <Key className="w-4 h-4" />
            Credenciais ({credentials.length})
          </button>
        )}
      </div>

      {activeTab === 'articles' && (
        <ArticlesTab
          ref={articlesTabRef}
          articles={articles}
          isLoading={isLoading}
          canWrite={canWrite}
          onAtualizado={carregarDados}
          showToast={showToast}
          confirmar={confirmar}
        />
      )}

      {activeTab === 'credentials' && podeVerCredenciais && (
        <CredentialsTab
          ref={credentialsTabRef}
          credentials={credentials}
          isLoading={isLoading}
          canWrite={canWrite}
          isAdmin={isAdmin}
          onAtualizado={carregarDados}
          showToast={showToast}
          confirmar={confirmar}
        />
      )}
    </div>
  );
}
