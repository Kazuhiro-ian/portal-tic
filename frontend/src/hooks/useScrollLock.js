import { useEffect } from 'react';

// Trava o scroll do conteúdo por trás de um painel/modal/sidebar aberto no mobile.
//
// Por que não `overflow: hidden` no body: é uma limitação conhecida do WebKit — o body para,
// mas o scroll "vaza" para o container de rolagem pai (scroll chaining), e neste app quem
// realmente rola é o <main id="main-scroll">, não o body. Ver PLANO-MOBILE.md §1.4c/§4.2.
//
// Por que um contador e não um booleano: em telas com modais aninhados (ex.: ConfirmDialog
// aberto de dentro de um SidePanel), fechar o de cima não pode destravar o scroll enquanto o
// de baixo ainda está aberto. Cada chamador soma/subtrai uma trava; só destrava quando a
// última sai.
let lockCount = 0;
let savedScrollY = 0;

function elementoRolavel() {
  return document.getElementById('main-scroll') || document.body;
}

function travar() {
  if (lockCount === 0) {
    const el = elementoRolavel();
    savedScrollY = el.scrollTop || window.scrollY || 0;
    el.style.position = 'fixed';
    el.style.top = `-${savedScrollY}px`;
    el.style.left = '0';
    el.style.right = '0';
    el.style.overflowY = 'hidden';
    // position:fixed cria um novo stacking context para o <main>, o que prende o z-index
    // de qualquer SidePanel/Modal renderizado dentro dele (mesmo que z-50) abaixo do
    // header mobile e do BottomNav (z-30), que ficam FORA do <main>: sem isto, o botão
    // "Importar"/"Salvar" no rodapé do painel fica escondido atrás do BottomNav e não
    // dá pra clicar. z-45 fica acima de header/BottomNav (30) e abaixo do menu lateral
    // e seu backdrop (40/50), que devem continuar por cima de tudo.
    el.style.zIndex = '45';
  }
  lockCount += 1;
}

function destravar() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    const el = elementoRolavel();
    el.style.position = '';
    el.style.top = '';
    el.style.left = '';
    el.style.right = '';
    el.style.overflowY = '';
    el.style.zIndex = '';
    el.scrollTop = savedScrollY;
    window.scrollTo(0, 0);
  }
}

export function useScrollLock(locked) {
  useEffect(() => {
    if (!locked) return undefined;
    travar();
    return () => destravar();
  }, [locked]);
}
