import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import { ErrorBoundary } from './ErrorBoundary.jsx';

function Explode({ deve = true }) {
  if (deve) throw new Error('boom no render');
  return <p>conteudo ok</p>;
}

let erroSpy;
beforeEach(() => {
  // React loga o erro capturado no console; silenciar mantem a saida da suite legivel.
  erroSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  erroSpy.mockRestore();
});

describe('ErrorBoundary', () => {
  it('renderiza os filhos normalmente quando nao ha erro', () => {
    render(
      <ErrorBoundary>
        <p>conteudo ok</p>
      </ErrorBoundary>
    );
    expect(screen.getByText('conteudo ok')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  // O ponto central: sem boundary, o React esvazia a raiz inteira e sobra so o fundo da
  // pagina -- a "tela azul". Com ele, o erro vira um card e o resto do app continua de pe.
  it('captura o erro de render e mostra o card em vez de apagar a arvore', () => {
    render(
      <ErrorBoundary>
        <Explode />
      </ErrorBoundary>
    );
    const alerta = screen.getByRole('alert');
    expect(alerta).toBeInTheDocument();
    expect(alerta).toHaveTextContent('Algo deu errado nesta tela');
    expect(alerta).toHaveTextContent('boom no render');
  });

  it('aceita um titulo customizado', () => {
    render(
      <ErrorBoundary titulo="Falhou o dashboard">
        <Explode />
      </ErrorBoundary>
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Falhou o dashboard');
  });

  it('oferece o botao de recarregar', () => {
    render(
      <ErrorBoundary>
        <Explode />
      </ErrorBoundary>
    );
    expect(screen.getByRole('button', { name: /Recarregar a página/i })).toBeInTheDocument();
  });

  // Sem isso, a tela de erro ficaria colada para sempre: navegar para outra aba/rota nao a
  // limparia e o usuario precisaria recarregar a pagina na mao.
  it('limpa o erro quando resetKey muda (navegacao)', () => {
    const { rerender } = render(
      <ErrorBoundary resetKey="/a">
        <Explode />
      </ErrorBoundary>
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();

    rerender(
      <ErrorBoundary resetKey="/b">
        <Explode deve={false} />
      </ErrorBoundary>
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('conteudo ok')).toBeInTheDocument();
  });

  it('mantem o erro na tela enquanto resetKey nao muda', () => {
    const { rerender } = render(
      <ErrorBoundary resetKey="/a">
        <Explode />
      </ErrorBoundary>
    );
    rerender(
      <ErrorBoundary resetKey="/a">
        <Explode deve={false} />
      </ErrorBoundary>
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('isola o erro: irmaos fora do boundary continuam renderizados', () => {
    render(
      <div>
        <p>menu lateral</p>
        <ErrorBoundary>
          <Explode />
        </ErrorBoundary>
      </div>
    );
    expect(screen.getByText('menu lateral')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('captura erro lancado em re-render, nao so na montagem', () => {
    function Alterna() {
      const [quebrar, setQuebrar] = useState(false);
      if (quebrar) throw new Error('quebrou depois');
      return <button onClick={() => setQuebrar(true)}>quebrar</button>;
    }
    render(
      <ErrorBoundary>
        <Alterna />
      </ErrorBoundary>
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'quebrar' }));
    expect(screen.getByRole('alert')).toHaveTextContent('quebrou depois');
  });
});
