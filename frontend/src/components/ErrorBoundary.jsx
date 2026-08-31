import { Component } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

/**
 * Rede de segurança contra erro de render. Sem ela, uma exceção lançada durante o render de
 * qualquer componente desmonta a árvore inteira: o React esvazia a <div id="root"> e sobra só
 * o fundo do <body> (bg-dark-900), o que na prática aparece como uma "tela azul" sem
 * explicação nenhuma -- foi exatamente o que acontecia no dashboard do CD 00.
 *
 * Precisa ser class component: `getDerivedStateFromError`/`componentDidCatch` não têm
 * equivalente em hooks até hoje.
 *
 * Use `resetKey` para limpar o erro ao navegar (ex: trocar de aba/rota): quando ele muda, o
 * boundary volta a tentar renderizar os filhos em vez de manter a tela de erro para sempre.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { erro: null };
  }

  static getDerivedStateFromError(erro) {
    return { erro };
  }

  componentDidCatch(erro, info) {
    // Sem serviço de telemetria no projeto: o console é o que temos para investigar depois.
    console.error('Erro não tratado durante o render:', erro, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    if (this.state.erro && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ erro: null });
    }
  }

  render() {
    if (!this.state.erro) {
      return this.props.children;
    }

    return (
      <div className="card border-red-500/30 bg-red-500/5 max-w-2xl mx-auto my-8" role="alert">
        <h2 className="font-semibold text-red-200 flex items-center gap-2 mb-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          {this.props.titulo || 'Algo deu errado nesta tela'}
        </h2>
        <p className="text-sm text-dark-300 mb-4">
          O restante do sistema continua funcionando — você pode trocar de tela pelo menu.
          Se o erro persistir, avise a TI com o print desta mensagem.
        </p>
        <p className="text-xs text-dark-400 font-mono break-words mb-4">
          {this.state.erro?.message || String(this.state.erro)}
        </p>
        <button onClick={() => window.location.reload()} className="btn-secondary">
          <RotateCcw className="w-4 h-4" />
          Recarregar a página
        </button>
      </div>
    );
  }
}
