# Plano de Melhorias — UX/UI Mobile (Portal TIC)

**Data:** 12/08/2026
**Escopo:** Frontend React (`frontend/src`). Nenhuma alteração no backend.
**Alvo principal:** iPhone / iOS Safari, com ganho colateral em Android e tablets.

---

## 1. Diagnóstico

### 1.1 Por que o overflow horizontal é tão grande

Não é um problema só de "tabela larga". São quatro causas somadas:

| # | Causa | Onde está | Efeito no iPhone |
|---|-------|-----------|------------------|
| 1 | `.card` usa `p-6` (24px de cada lado) e o `<main>` usa `p-4` (16px) | `index.css`, `App.jsx` | Numa tela de 390px, sobram **310px** úteis para a tabela. 20% da largura vira padding. |
| 2 | `.table-header` e `.table-cell` usam `px-4 py-3` fixos | `index.css` | Com 7–8 colunas, só o padding já soma ~450px — mais que a largura da tela inteira. |
| 3 | `<table className="w-full">` dentro de `overflow-x-auto` | 11 componentes | `w-full` colapsa para a largura do container, o navegador então espreme as colunas até o conteúdo quebrar em várias linhas — gerando linhas altíssimas e ilegíveis, e ainda assim estourando. |
| 4 | Tabelas com 7 a 12 colunas | `InventoryPlan` (12), `BranchManagement` (8), `AccuracyReport`/`StockDashboard`/`StockDispatch`/`UsuarioManagement`/`ZebraSupplies` (6–7) | Nenhuma quantidade de scroll horizontal torna isso confortável numa tela de 390px. |

### 1.2 Por que o cabeçalho não fixa hoje

**Sim, dá para fixar** — mas não basta adicionar `sticky top-0` no `<thead>`. O código atual tem um bloqueio estrutural:

```jsx
<div className="overflow-x-auto">   {/* ← o problema */}
  <table className="w-full">
```

Pela especificação CSS, quando `overflow-x` é `auto`, o `overflow-y` (que estaria em `visible`) é **forçado para `auto`**. Isso transforma essa `div` num container de rolagem vertical. Como ela não tem altura definida, ela cresce junto com a tabela e nunca rola — então o `sticky` do `<thead>` gruda num container que não se move, e o cabeçalho some quando você rola a página.

Existem duas correções válidas, e vamos usar as duas em contextos diferentes:

- **Altura limitada:** dar `max-height` ao container de rolagem e `sticky top-0` no `<thead>`. O cabeçalho fica travado dentro da própria tabela.
- **Elevar o sticky:** deixar o `<thead>` grudar no viewport da página, encostando logo abaixo do header mobile (que já é `sticky top-0 z-30` no `App.jsx`). Exige que nenhum ancestral entre a tabela e o `<main>` tenha `overflow` diferente de `visible`.

**Decisão:** usar altura limitada (`max-h-[calc(100dvh-XXpx)]`), porque funciona igual no desktop e no mobile, não depende da altura do header e não conflita com o `overflow-y-auto` que o `<main>` já tem.

### 1.3 Problemas específicos de iOS

| Problema | Onde | Sintoma no iPhone |
|---|---|---|
| `h-screen` (=`100vh`) no container raiz | `App.jsx:31` | O Safari conta a barra de endereço na altura. O rodapé do app fica escondido atrás dela, e a página "pula" quando a barra some ao rolar. |
| `min-h-screen` na sidebar | `Sidebar.jsx:32` | Botão "Sair" fica atrás da barra de gestos (home indicator). |
| `max-h-[90vh]` / `max-h-[60vh]` no modal | `index.css`, `Modal.jsx:52` | Modal maior que a área visível real; botões de salvar ficam fora do alcance. |
| Sem `viewport-fit=cover` nem `env(safe-area-inset-*)` | `index.html:6` | Conteúdo cortado pelo notch/Dynamic Island em modo paisagem e pela barra de gestos. |
| Inputs com fonte < 16px | `.input-field` usa tamanho herdado; vários filtros usam `text-sm` (14px) | **iOS dá zoom automático no campo ao focar** e não desfaz — é a maior causa da sensação de "tela bagunçada" depois de digitar numa busca. |
| Sem `theme-color` | `index.html` | Barra de status branca sobre app escuro. |
| Botões `px-3 py-1.5` (~30px de altura) | Ações de editar/excluir em todas as tabelas | Abaixo dos 44×44px do Human Interface Guidelines da Apple. Erro de toque frequente. |
| `-webkit-overflow-scrolling` ausente | containers de scroll | Rolagem sem inércia, sensação "travada" em iOS mais antigos. |
| Sidebar aberta não trava o scroll do fundo | `App.jsx` | Ao arrastar o menu, a página atrás rola junto (scroll chaining). |

### 1.4 Por que o modal trava o scroll e a digitação

Investigando o `Modal.jsx` e o `.modal-overlay`, são **quatro** problemas independentes que se somam — e um deles é um bug real, não só lentidão:

**a) `backdrop-blur-sm` é o principal culpado da lentidão**

```css
.modal-overlay {
  @apply fixed inset-0 bg-black/60 backdrop-blur-sm ...;
}
```

`backdrop-filter` obriga o navegador a capturar tudo que está atrás do overlay, aplicar desfoque numa textura de GPU e recompor — **a cada frame**. Numa tela cheia de iPhone, com uma tabela de centenas de linhas por baixo, isso é caro. Pior: qualquer repintura dispara o ciclo de novo. Cada tecla digitada num input do modal repinta o cursor, o que repinta o blur, que reprocessa a tela inteira. É exatamente a sensação de digitação travada que você descreveu. O iOS Safari é notoriamente o pior navegador nesse cenário.

**b) O travamento de scroll tem um bug de modais aninhados**

```js
useEffect(() => {
  if (isOpen) document.body.style.overflow = 'hidden';
  return () => { document.body.style.overflow = 'unset'; };
}, [isOpen]);
```

O cleanup sempre devolve `unset`, sem checar se ainda existe outro modal aberto. No `KnowledgeBase` (4 modais) e no `StockDashboard` (2 modais), e em qualquer tela onde o `ConfirmDialog` é aberto de dentro de outro modal, **fechar o de cima destrava o scroll do fundo enquanto o de baixo continua aberto**. A página atrás começa a rolar sozinha por trás do modal. Precisa ser um contador de travas, não um booleano.

**c) `overflow: hidden` no body não trava scroll no iOS Safari**

É uma limitação conhecida do WebKit: o `body` para, mas o scroll continua "vazando" para o container de rolagem pai (scroll chaining). Como o `<main>` do app já é `overflow-y-auto`, o fundo continua rolando. Solução real é `position: fixed` no body com a posição de scroll salva e restaurada, ou `overscroll-behavior: contain` nos containers internos.

**d) O teclado do iOS empurra o campo para fora da vista**

O overlay é `fixed inset-0` com `items-center`. Quando o teclado sobe, o iOS encolhe o *visual viewport* mas não o *layout viewport* — o `inset-0` continua medindo a tela inteira, então o modal permanece centralizado em relação a uma área que está metade coberta pelo teclado. O campo em foco fica atrás do teclado e o botão "Salvar" some. Um painel ancorado numa borda (lateral ou inferior) não sofre disso, porque não depende de centralização.

---

## 2. Estratégia escolhida

**Cards no mobile, tabela no desktop.**

Abaixo de `md` (768px), cada linha da tabela vira um card empilhado — zero scroll horizontal. A partir de `md`, volta a tabela tradicional, agora com cabeçalho fixo.

Isso resolve o overflow na raiz em vez de mitigar. E o cabeçalho fixo passa a ser um recurso de desktop/tablet, onde ele realmente faz sentido (no card mobile o rótulo já vem ao lado de cada valor).

**Painel lateral no lugar do modal.**

Todo formulário e detalhe passa a abrir num painel ancorado na borda, seguindo o padrão que já funciona bem no `AssetFormPanel` / `AssetDetailPanel`. Sem `backdrop-filter`, sem centralização, sem dependência da altura do viewport. No desktop entra pela direita; no mobile ocupa a tela cheia. Fim dos quatro problemas descritos em 1.4 de uma vez só.

---

## 3. Fases

### Fase 1 — Fundação (base compartilhada)

Sem essa camada, cada módulo vira uma gambiarra diferente. Ela é pré-requisito de tudo.

**1.1 `index.html`**
- `viewport-fit=cover` na meta viewport
- `<meta name="theme-color" content="#0f172a">`
- `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`

**1.2 `tailwind.config.js`**
- Breakpoint `xs: '480px'` para o degrau entre iPhone SE e iPhone Pro Max
- Utilitários de safe-area: `spacing: { 'safe-top': 'env(safe-area-inset-top)', 'safe-bottom': 'env(safe-area-inset-bottom)', ... }`

**1.3 `index.css`** — o coração da mudança
- `.card`: `p-4 md:p-6` (recupera 16px de largura no celular)
- `.table-header` / `.table-cell`: `px-2 py-2.5 md:px-4 md:py-3`
- **Novos utilitários de tabela:**
  - `.table-scroll` — container com `max-h-[calc(100dvh-var(--table-offset))]`, `overflow-auto`, `overscroll-contain`
  - `.table-sticky-head` — `sticky top-0 z-20` + fundo sólido `bg-dark-800` (obrigatório: sem fundo, as linhas aparecem através do cabeçalho) + `shadow` sutil quando rolado
- `.input-field` / `.select-field`: `text-base md:text-sm` — **mata o zoom automático do iOS**
- `.btn-*`: `min-h-[44px] min-w-[44px]` no mobile, voltando ao tamanho compacto em `md`
- `.modal-overlay`: **remover `backdrop-blur-sm`** e subir para `bg-black/50` sólido (ver 1.4a)
- `.modal-content`: trocar `max-h-[90vh]` por `max-h-[85dvh]`
- Novas classes `.data-card`, `.data-card-row`, `.data-card-label` para a visão mobile
- Nova classe `.panel-surface` para o painel lateral (fundo, borda, sombra de borda no lugar do blur)
- `html { -webkit-text-size-adjust: 100%; }` e `scroll-behavior` respeitando reduced-motion

**1.4 Novo componente `components/DataTable.jsx`**

Componente único que recebe a definição de colunas e decide sozinho entre tabela e cards:

```jsx
<DataTable
  colunas={[
    { chave: 'numeroFilial', header: 'Núm.', render: (r) => ..., mobile: 'titulo' },
    { chave: 'nome',         header: 'Nome',  render: (r) => ..., mobile: 'subtitulo' },
    { chave: 'cnpj',         header: 'CNPJ',  render: (r) => ..., mobile: 'oculto' },
    ...
  ]}
  dados={filtered}
  acoes={(r) => <>...</>}
  vazio="Nenhuma filial encontrada."
  carregando={isLoading}
/>
```

Responsabilidades:
- `md:` para cima → `<table>` com `thead` sticky e container de altura limitada
- abaixo de `md` → lista de cards; campo `mobile` de cada coluna define se vira título, subtítulo, badge, linha rotulada ou fica oculto
- estados de vazio e carregando padronizados (hoje cada módulo escreve o seu)
- área de ações com alvo de toque de 44px

**1.5 Novo hook `hooks/useMediaQuery.js`** — para os poucos casos que precisam decidir em JS, não em CSS.

**Arquivos da Fase 1:** `index.html`, `tailwind.config.js`, `src/index.css`, `src/components/DataTable.jsx` (novo), `src/hooks/useMediaQuery.js` (novo).

---

### Fase 2 — Correções nativas de iOS

- `App.jsx`: `h-screen` → `h-[100dvh]`; `<main>` ganha `pb-[env(safe-area-inset-bottom)]`; header mobile ganha `pt-[env(safe-area-inset-top)]`
- `Sidebar.jsx`: `min-h-screen` → `h-[100dvh]`, rodapé com padding de safe-area
- `Modal.jsx`: `max-h-[60vh]` → `max-h-[70dvh]`
- Adicionar `overscroll-behavior: contain` nos containers roláveis
- Travar o scroll do `body` enquanto a sidebar mobile estiver aberta — usando o `useScrollLock` da Fase 4, **não** a lógica atual de `overflow: hidden`, que não funciona no iOS (ver 1.4c)

> **Nota de ordem:** o `useScrollLock` (item 4.2) é adiantado para cá, porque a sidebar precisa dele e ele corrige um bug ativo. O resto da Fase 4 segue depois.

**Arquivos:** `App.jsx`, `Sidebar.jsx`, `Modal.jsx`, `useScrollLock.js` (novo), `index.css`.

---

### Fase 3 — Navegação mobile

- Sidebar: fechar arrastando para a esquerda (swipe), foco preso no menu enquanto aberto, `Esc` fecha
- Transição do overlay com fade (hoje é `block`/`hidden`, aparece de forma seca)
- **Barra de navegação inferior** com os 4 módulos mais usados + botão "Mais" que abre a sidebar. Só abaixo de `lg`, respeitando a safe-area inferior. Reduz de 2 toques para 1 a troca de módulo.
- Título do módulo atual no header mobile (hoje só mostra a marca — o usuário perde a referência de onde está)

**Arquivos:** `App.jsx`, `Sidebar.jsx`, `src/components/BottomNav.jsx` (novo).

---

### Fase 4 — Substituir o Modal pelo painel lateral

Esta é a fase de maior impacto percebido no dia a dia. São **16 chamadas de `<Modal>` em 13 arquivos** para migrar.

#### 4.1 Novo componente `components/SidePanel.jsx`

Um único componente que substitui o `Modal`, mantendo uma API quase idêntica para que a migração seja quase um find-and-replace:

```jsx
<SidePanel
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  title="Editar Filial"
  size="md"                    // sm | md | lg | xl  → 380 / 480 / 640 / 820px
  footer={<>                   // rodapé fixo, sempre visível
    <button className="btn-secondary">Cancelar</button>
    <button className="btn-primary">Salvar</button>
  </>}
>
  ...campos...
</SidePanel>
```

**Comportamento:**

| | Desktop (`md`+) | Mobile (< `md`) |
|---|---|---|
| Origem | Desliza da direita | Tela cheia, entra da direita |
| Largura | Conforme `size` | 100% |
| Altura | `100dvh` | `100dvh` |
| Fundo | `bg-black/50` **sólido, sem blur** | idem |
| Rodapé | Fixo no rodapé do painel | Fixo, com `padding-bottom` de safe-area |

**O que muda em relação ao Modal atual:**

- **Sem `backdrop-filter`.** Resolve o item (a) — a digitação deixa de repintar a tela toda. Se quisermos manter algum efeito de profundidade, usamos uma sombra projetada na borda do painel, que é composta uma vez só e não custa nada por frame.
- **Ancorado na borda, não centralizado.** Resolve o item (d) — o teclado do iOS sobe e o painel simplesmente não se importa, porque nada depende do centro do viewport.
- **Rodapé fixo por padrão.** O botão "Salvar" nunca fica fora de alcance. Hoje cada modal desenha o próprio rodapé dentro da área rolável, e em vários deles é preciso rolar para achar o botão.
- **Reaproveita o `useSlidePanel`** que já existe e já resolveu a animação de entrada/saída com o truque dos dois `requestAnimationFrame`. Não vamos reinventar isso.
- **Transição via `transform: translateX()`**, que roda no compositor da GPU — diferente do modal atual, que anima `opacity` + `scale` do conteúdo inteiro.

#### 4.2 Novo hook `hooks/useScrollLock.js`

Corrige os itens (b) e (c) do diagnóstico, e passa a ser usado tanto pelo `SidePanel` quanto pela sidebar mobile:

- **Contador de travas** em vez de booleano — abrir um `ConfirmDialog` de dentro de um painel não destrava o fundo ao fechar só o de cima. Corrige o bug de modais aninhados do `KnowledgeBase` e do `StockDashboard`.
- **`position: fixed` no body com `top: -scrollY`**, restaurando a posição ao destravar — o método que realmente funciona no iOS Safari, ao contrário de `overflow: hidden`.
- **`overscroll-behavior: contain`** na área rolável do painel, para o scroll não vazar para o fundo ao chegar no fim da lista.

#### 4.3 Migração das 16 chamadas

| Arquivo | Chamadas | Observação |
|---|---|---|
| `KnowledgeBase.jsx` | 4 | Maior beneficiado — é onde o bug de modal aninhado aparece |
| `StockDashboard.jsx` | 2 | Idem |
| `BranchManagement.jsx` | 1 | Formulário longo; ganha muito com rodapé fixo |
| `UsuarioManagement.jsx` | 1 | |
| `LinksManager.jsx` | 1 | |
| `ZebraSupplies.jsx` | 1 | |
| `EmployeeSchedule.jsx` | 1 | |
| `InventoryPlan.jsx` | 1 | |
| `EquipeInventarioManagement.jsx` | 1 | |
| `ReceivingCalendar.jsx` | 1 | |
| `Dashboard.jsx` | 1 | Formulário curto ("Novo Aviso") |
| `InventoryResultPanel.jsx` | 1 | É leitura, não formulário — encaixa perfeitamente no painel |
| `ConfirmDialog.jsx` | 1 | **Exceção deliberada — ver 4.4** |

#### 4.4 A exceção: `ConfirmDialog`

Confirmação de exclusão **não** deve virar painel lateral. É uma decisão binária de uma linha; um painel de tela cheia para responder "sim ou não" é desproporcional e ainda esconde o contexto que o usuário precisa ver para decidir.

Ele continua centralizado, mas ganha as correções que importam: **remoção do `backdrop-blur`**, uso do `useScrollLock` novo, `max-h-[85dvh]` e botões com 44px de altura. Ou seja, o `Modal.jsx` não é deletado — fica reduzido ao papel de diálogo de confirmação, que é o caso em que ele é a ferramenta certa.

#### 4.5 Ajustes de formulário que vêm junto

- Grids: `grid-cols-2` → `grid-cols-1 sm:grid-cols-2`. Hoje o `BranchManagement` força 2 colunas em qualquer largura, espremendo CNPJ e endereço em ~140px cada no iPhone.
- `inputMode="numeric"` em CNPJ, número de filial e quantidades — abre o teclado numérico direto, sem o usuário procurar a aba "123".
- `autoComplete` e `enterKeyHint="search"` nos campos de busca.
- `AssetFormPanel` e `AssetDetailPanel`: hoje são painéis *inline* que empurram a tabela (`shrink-0` com transição de `width`). No mobile, 420px inline não cabe. Passam a usar o `SidePanel` em sobreposição abaixo de `md`, mantendo o comportamento inline atual no desktop, que funciona bem.

**Arquivos:** `SidePanel.jsx` (novo), `useScrollLock.js` (novo), `Modal.jsx`, `ConfirmDialog.jsx`, `index.css`, `AssetFormPanel.jsx`, `AssetDetailPanel.jsx`, `InventoryResultPanel.jsx` + os 11 componentes que chamam `<Modal>`.

---

### Fase 5 — Filtros e busca

- Padrão hoje: `flex flex-col sm:flex-row` empilha busca + selects, consumindo metade da tela antes do primeiro dado aparecer
- Novo padrão: campo de busca sempre visível + botão "Filtros" com contador de filtros ativos, abrindo um painel deslizante
- Chips de filtro ativo, removíveis com um toque
- Novo componente `components/FiltroBar.jsx` compartilhado

**Arquivos:** `FiltroBar.jsx` (novo), aplicado em `AssetList`, `BranchManagement`, `StockDashboard`, `ZebraSupplies`, `UsuarioManagement`, `KnowledgeBase`.

---

### Fase 6 — Aplicação nos módulos

Migração para `DataTable` + `FiltroBar`, do mais simples ao mais complexo:

| Ordem | Módulo | Colunas | Observação |
|---|---|---|---|
| 1 | `BranchManagement` | 8 | **Piloto** — valida o `DataTable` antes de propagar |
| 2 | `UsuarioManagement` | 6 | Direto |
| 3 | `AssetList` | 3 + dinâmicas | Já tem `COLUNA_DEFS` — encaixa quase 1:1 no novo formato |
| 4 | `EquipeInventarioManagement` | 3 | Direto |
| 5 | `AccuracyReport` | 7 | Tem números — cuidar do alinhamento no card |
| 6 | `StockDispatch` | 7 | Direto |
| 7 | `ZebraSupplies` | 7 | Layout `lg:grid-cols-5` precisa virar 1 coluna no mobile |
| 8 | `StockDashboard` | 7 | Tem controles de +/- na tabela; alvos de toque maiores |
| 9 | `KnowledgeBase` | 5 | Já tem `max-h-[60vh]` — só ajustar para `dvh` e sticky |
| 10 | `InventoryPlan` | 12 | **Mais complexo.** 12 colunas + grid de calendário `grid-cols-7`. Card mobile precisa de desenho próprio. |
| 11 | `EmployeeSchedule` | grade | **Exceção:** é uma grade dia×pessoa, não uma lista. Mantém scroll horizontal, mas ganha primeira coluna congelada (`sticky left-0`) e cabeçalho de dias congelado. |
| 12 | `ReceivingCalendar` / `EquipeCalendarManagement` | `grid-cols-7` | Calendário: manter 7 colunas, reduzir tipografia e altura da célula no mobile |
| 13 | `Dashboard` | `lg:grid-cols-6` | Revisar ordem dos cards no empilhamento mobile — o mais importante primeiro |

---

### Fase 7 — Verificação

- Build (`npm run build`) e lint sem erros novos
- Teste visual em 3 larguras: 375px (iPhone SE), 393px (iPhone 15), 430px (Pro Max) — via DevTools
- Checklist manual por módulo: sem scroll horizontal, cabeçalho fixo funcionando no desktop, sem zoom ao focar input, nenhum botão abaixo de 44px, nada cortado pelo notch ou barra de gestos
- `git diff` revisado arquivo a arquivo antes do commit

---

## 4. Critérios de aceite

1. Nenhuma tela apresenta scroll horizontal em 375px
2. O cabeçalho da tabela permanece visível ao rolar até a última filial (desktop e tablet)
3. Focar um campo de busca não dispara zoom no iOS
4. Nenhum elemento interativo abaixo de 44×44px no mobile
5. Nada é cortado pelo notch, Dynamic Island ou barra de gestos
6. O desktop não regride — todas as telas continuam idênticas ou melhores acima de 1024px
7. Digitar num formulário aberto não apresenta travamento ou atraso perceptível no iPhone
8. Com o painel aberto, o conteúdo de trás não rola; ao fechar, a página volta exatamente para a posição em que estava
9. Fechar um `ConfirmDialog` aberto de dentro de um painel não destrava o scroll do fundo
10. Com o teclado aberto, o campo em foco e os botões de ação continuam visíveis

---

## 5. Riscos

| Risco | Mitigação |
|---|---|
| `DataTable` genérico demais não atender casos como `InventoryPlan` | Piloto em `BranchManagement` primeiro; `InventoryPlan` e `EmployeeSchedule` ficam por último e podem manter implementação própria |
| Regressão no desktop | Toda mudança usa prefixo `md:`/`lg:` para preservar o comportamento atual em telas grandes |
| Volume de arquivos (≈25) num commit só | Commits por fase, permitindo reverter uma fase isolada |
| `dvh` não suportado em Safari < 15.4 | Fallback `100vh` declarado antes de `100dvh` — navegadores antigos ignoram a segunda regra |
| Migrar 16 modais de uma vez quebrar algum formulário | API do `SidePanel` propositalmente igual à do `Modal` (`isOpen`/`onClose`/`title`/`size`); migração começa por `Dashboard` (1 modal curto) e `LinksManager` antes de encostar no `KnowledgeBase` (4 modais) |
| `position: fixed` no body causar salto visual ao travar/destravar | Salvar e restaurar `scrollY`; testar especificamente com a página rolada até o fim |
| Painel lateral em tela cheia esconder o contexto no mobile | Título do painel sempre indica o registro (ex.: "Editar — Filial 12"); `ConfirmDialog` mantido centralizado justamente por isso |

---

## 6. Ordem de execução sugerida

Fase 1 → Fase 2 (+ `useScrollLock`) → **validar no iPhone** → Fase 4 → **validar** → Fase 6 (módulos 1–4) → **validar** → Fases 3 e 5 → Fase 6 (módulos 5–13) → Fase 7.

A Fase 4 foi adiantada para logo depois da fundação: ela corrige um bug ativo (scroll destravando com modais aninhados) e resolve o travamento de digitação, que é o incômodo mais imediato no uso diário. As três paradas de validação existem para você conferir no aparelho antes de cada propagação em massa.
