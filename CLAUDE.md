# CLAUDE.md — Portal TIC (Queiroz)

Contexto permanente do projeto para as sessões do Claude Code. Se algo aqui divergir do
código, **o código vence** — e vale corrigir este arquivo.

---

## 1. O que é o projeto

Portal interno de TI do Grupo Queiroz (rede de lojas + centros de distribuição). Reúne
num só lugar o que antes vivia em planilhas soltas: inventário de ativos, escala da equipe,
estoque de insumos, cadastro de filiais, base de conhecimento, cofre de credenciais,
controle de insumos das impressoras Zebra e o módulo de Qualidade (acuracidade de
inventário e calendário de recebimento).

Repositório: `https://github.com/Kazuhiro-ian/portal-tic` · branch principal `main`.

**O código, os comentários, os nomes de variáveis e as mensagens de commit são em
português.** Mantenha isso. Comentários explicam *por que*, não *o que* — e o projeto é
consistente nisso; siga o mesmo tom.

---

## 2. Stack e layout do repositório

```
portal-tic/
├── queiroz/            # backend — Spring Boot 4.1 / Java 25 / Maven (wrapper: mvnw)
│   ├── src/main/java/portal/ti/queiroz/
│   │   ├── config/     # BootstrapAdminRunner, OpenApiConfig
│   │   ├── controller/ # @RestController, 1 por módulo (24 arquivos)
│   │   ├── dto/        # records/classes de request e response
│   │   ├── exception/  # GlobalExceptionHandler + exceções de domínio
│   │   ├── model/      # entidades JPA + enums (37 arquivos)
│   │   ├── repository/ # Spring Data JPA
│   │   ├── security/   # JWT, CORS, cripto do cofre, rate limit de login
│   │   ├── service/    # regra de negócio (24 arquivos)
│   │   └── web/        # CorrelationIdFilter
│   ├── src/main/resources/application.properties
│   ├── src/test/       # 150 testes (JUnit 5 + Mockito + AssertJ, perfil "test" com H2)
│   └── migrations/     # SQLs manuais + README do plano de ativação do Flyway
├── frontend/           # React 18 + Vite 5 + Tailwind 3 (JS puro, sem TypeScript)
│   └── src/
│       ├── components/ # 1 arquivo por tela/painel (~44 arquivos, .jsx)
│       ├── context/    # AuthContext
│       ├── hooks/      # useToast, usePaginacao, useAbaNaUrl, useFocusTrap, ...
│       ├── services/api.js   # ÚNICO ponto de acesso HTTP ao backend
│       └── utils/      # datas, formato, escala, filiais, qualidade, zebra, roles, markdown
├── .github/            # ci.yml (CI) + dependabot.yml
└── SETUP.md            # como montar o ambiente do zero numa máquina nova
```

Versões exatas: Java 25, Spring Boot 4.1.0, PostgreSQL 18 (local), Node 24 local / Node 20
na CI, React 18.3, Vite 5.3, Tailwind 3.4, ESLint 8 (flat config em `eslint.config.js`),
Vitest 3.2.

---

## 3. Comandos do dia a dia

| O que | Comando | Onde |
|---|---|---|
| Subir backend | `.\mvnw.cmd spring-boot:run` | `queiroz/` |
| Testes backend | `.\mvnw.cmd test -B` | `queiroz/` |
| Um teste só | `.\mvnw.cmd test -Dtest=NomeDoTeste` | `queiroz/` |
| Empacotar | `.\mvnw.cmd package -DskipTests` | `queiroz/` |
| Subir frontend | `npm run dev` (porta 5173) | `frontend/` |
| Testes frontend | `npm test` (Vitest) | `frontend/` |
| Lint | `npm run lint` | `frontend/` |
| Build de produção | `npm run build` | `frontend/` |

O shell padrão da máquina é **PowerShell no Windows** — use `.\mvnw.cmd`, não `./mvnw`
(o `./mvnw` funciona pelo Bash tool, mas o usuário roda no PowerShell).

Swagger/OpenAPI sobe junto com o backend em `http://localhost:8080/swagger-ui.html`.

---

## 4. Configuração e segredos (armadilha comum)

São **dois mecanismos diferentes**, não confunda:

- **Backend**: lê variáveis de ambiente **do Windows** (`setx`), **não existe `.env`**.
  Três variáveis são obrigatórias e sem default — a aplicação **se recusa a subir** sem
  elas, de propósito: `DB_PASSWORD`, `JWT_SECRET`, `CREDENCIAL_ENC_KEY`.
  `setx` só é enxergado por terminais abertos **depois** do comando.
- **Frontend**: lê um `.env` de verdade (Vite). Modelo versionado em `frontend/.env.example`;
  a única chave é `VITE_API_BASE_URL`.

Erro de `Could not resolve placeholder` no boot = terminal antigo, sem as variáveis. O passo
a passo completo está no `SETUP.md`.

Nunca coloque segredo em `application.properties`, em teste, ou em qualquer arquivo
versionado. O `application-test.properties` usa segredos fictícios só para o contexto subir.

---

## 5. Autenticação e permissões

JWT stateless (jjwt 0.12.6), BCrypt nas senhas, rate limit de login (5 tentativas → 15 min
de bloqueio, configurável). `Usuario.tokenVersion` é incrementado para invalidar todos os
tokens já emitidos (ex.: ao trocar senha).

Quatro papéis (`model/Role.java`): **ADMIN**, **TECNICO**, **LEITURA**, **QUALIDADE**.

Regras em `security/SecurityConfig.java` — **a ordem dos matchers importa**, o primeiro que
casa vence. Resumo do que vale hoje:

- `POST /api/auth/login`, `GET /actuator/health`, Swagger → liberados sem token
- `/api/usuarios/**` → só ADMIN
- `GET /api/credenciais/auditoria` → só ADMIN (vem **antes** do matcher genérico de credenciais)
- `/api/credenciais/**` → ADMIN, TECNICO
- `PUT /api/qualidade/configuracao` → só ADMIN (metas de acuracidade)
- `GET /api/qualidade/**` → ADMIN, TECNICO, LEITURA, QUALIDADE
- resto de `/api/qualidade/**` → ADMIN, TECNICO, QUALIDADE
- `GET /api/**` → ADMIN, TECNICO, LEITURA, QUALIDADE
- resto de `/api/**` → ADMIN, TECNICO
- qualquer outra coisa → negado

No frontend o espelho disso está em `context/AuthContext.jsx`: `canWrite` é uma
**allowlist** (`ADMIN`/`TECNICO`), não "diferente de LEITURA" — senão o papel QUALIDADE veria
botões que o backend recusa com 403. Ao criar tela nova, use `canWrite` /
`canWriteQualidade` / `isAdmin` do `useAuth()` para esconder ação que o backend vai negar.

Primeiro boot com banco vazio: `BootstrapAdminRunner` cria o usuário `admin` e imprime a
senha gerada **uma única vez** no log.

---

## 6. Convenções do backend

- **Camadas**: controller (fino, só HTTP) → service (regra) → repository. Controller não
  contém regra de negócio.
- **Injeção**: `@Autowired` em campo é o padrão existente (não é o ideal moderno, mas é o
  que está em todo lugar — mantenha a consistência a menos que o usuário peça mudar).
- **Validação**: `@Valid` nos `@RequestBody` de escrita; constraints Bean Validation nas
  entidades/DTOs. Cuidado: **adicionar `@NotBlank` a um campo que a tela sempre deixou vazio
  quebra o cadastro em produção** — já aconteceu 3 vezes (Ativo/Desktop, Filial sem
  CNPJ/endereço, ZebraEnvio). Antes de tornar um campo obrigatório no model, confira se o
  formulário correspondente realmente o exige.
- **Erros**: lance `RecursoNaoEncontradoException` (404) ou `RegraDeNegocioException` (400,
  aceita um `codigo` opcional que o frontend lê). O `GlobalExceptionHandler` converte tudo
  em `ErroResponse` (`{timestamp, status, erro, mensagem, path, detalhes, codigo}`).
- **`salvar()` sempre zera o id recebido** (`entidade.setId(null)`) — sem isso um POST com
  id no corpo vira UPDATE silencioso de outro registro. É padrão em todos os services.
- **Logs**: cada linha carrega `[reqId=...]` vindo do `CorrelationIdFilter`, para agrupar as
  linhas de um mesmo erro em produção.
- **Schema**: hoje é o Hibernate (`ddl-auto=update`) quem cria/altera as tabelas. Flyway já
  está no projeto porém **desligado** (`spring.flyway.enabled=false`) — ligar sem o baseline
  descrito em `queiroz/migrations/README.md` derruba a aplicação. Alterações que o `update`
  não sabe fazer (rename, drop) viram SQL manual em `queiroz/migrations/`.

## 7. Convenções do frontend

- **Todo acesso HTTP passa por `src/services/api.js`.** Nenhum componente chama `fetch`
  direto. Adicione a função lá (`apiGet`/`apiPost`/`apiPut`/`apiPatch`/`apiDelete`/`apiUpload`)
  e importe.
- 401 em qualquer chamada dispara logout automático (`setUnauthorizedHandler`).
- **Roteamento por URL** (react-router-dom v7), não por estado em memória. A aba ativa
  dentro de uma tela também vai para a URL (`useAbaNaUrl`) — recarregar a página mantém o
  lugar.
- **Componentes compartilhados que já existem** — reaproveite em vez de recriar:
  `DataTable`, `Paginacao` (+ `usePaginacao`), `Modal`, `SidePanel`, `ConfirmDialog`
  (+ `useConfirm`), `Toast` (+ `useToast`), `FiltroBar`, `SearchableSelect`, `ErrorBoundary`,
  `DeltaBadge`.
- **Tailwind com breakpoints de conteúdo**: além de `sm/md/lg/xl`, existem `c-sm`/`c-md`/
  `c-lg`/`c-xl` em `tailwind.config.js`. Eles medem **o espaço que sobra para o conteúdo**
  (viewport − 320px da sidebar e do padding). Em grids densas (4+ colunas) use os `c-*` —
  usar `lg:grid-cols-6` foi exatamente o que quebrou o layout em notebooks 1024–1440px.
- Paleta: `primary` (verde Queiroz), `accent` (laranja), `dark-*` no fundo. Tema escuro.
- Mobile é cidadão de primeira classe: `BottomNav`, sidebar em overlay com focus trap,
  scroll lock e safe-areas.

---

## 8. Os módulos (mapa mental rápido)

| Rota | Tela | Backend |
|---|---|---|
| `/dashboard` | visão geral, "Trabalhando Hoje", cards de inventário/recebimento | vários |
| `/links` | links úteis por categoria/tag | `LinkUtil*` |
| `/ativos` | inventário de equipamentos, com teste de ping | `Ativo*` |
| `/estoque` | itens e movimentações de estoque | `EstoqueItem*`, `EstoqueMovimento*` |
| `/escala` | escala dos colaboradores, edição em lote | `Escala*`, `Colaborador*` |
| `/conhecimento` | base de conhecimento (artigos em markdown) + cofre de credenciais | `Artigo*`, `Credencial*` |
| `/filiais` | cadastro de filiais (CD/Loja), painel de detalhes | `Filiais*` |
| `/zebra` | insumos das impressoras Zebra | `ZebraCota*`, `ZebraEnvio*`, `ZebraAnalytics*` |
| `/qualidade` | plano de inventário, acuracidade, calendário de recebimento | `Inventario*`, `Acuracidade*`, `Recebimento*` |
| `/usuarios` | gestão de usuários (só ADMIN) | `Usuario*` |

Pontos de domínio que não se deduzem do código:

- **Filial** tem `tipo` CD ou LOJA e `periodicidadeInventario` MENSAL/SEMANAL/BIMESTRAL.
  `null` nesse campo é tratado como **MENSAL** em todo lugar (evita backfill das filiais
  antigas). O **CD 00** é semanal e tem múltiplos armazéns — foi a origem de vários bugs de
  layout e de "tela azul" no dashboard.
- **Acuracidade** vem de relatórios do **Protheus** (ERP), enviados como XML SpreadsheetML
  — formato bem verboso: ~10 mil produtos ≈ 15 MB (daí o limite de 30 MB no multipart).
  O parser é `RelatorioProtheusParser`.
- **Zebra**: cada filial tem uma cota mensal de etiquetas/ribbons; os envios seguem um
  cronograma `PREVISTO → ENVIADO`, importável por planilha, com análise de consumo.
- **Credenciais**: senhas são criptografadas em repouso com AES-256
  (`CredencialPasswordConverter` + `CREDENCIAL_ENC_KEY`), e todo acesso/revelação é
  auditado em `CredencialAcessoLog`.

---

## 9. Testes

- **Backend**: JUnit 5 + Mockito + AssertJ, `@ExtendWith(MockitoExtension.class)` com
  `@Mock` no repository e `@InjectMocks` no service. Nomes de teste em português descrevendo
  o comportamento (`salvarZeraOIdRecebidoParaNuncaSobrescreverOutroRegistro`). Modelo bom
  para copiar: `LinkUtilServiceTest`. Os testes de contexto usam o perfil `test` com H2 em
  memória — **não precisa de PostgreSQL para rodar a suíte**.
- **Frontend**: Vitest + Testing Library + jsdom. Os testes existentes cobrem regressões
  reais já vividas (a "tela azul" do CD 00, o ErrorBoundary).
- **CI** (`.github/workflows/ci.yml`), roda em push na `main` e em todo PR: backend
  (`mvnw test` + `mvnw package`) e frontend (`npm ci`, `npm audit --audit-level=critical`,
  lint, `npm test`, `npm run build`).

---

## 10. Deploy

- **Backend**: Railway. A plataforma injeta `PORT`; o healthcheck bate em `/actuator/health`
  (único endpoint do actuator exposto, sem detalhes). Em produção,
  `ATIVOS_PING_ENABLED=false` — o ping dos ativos só funciona dentro da rede da empresa, e
  fora dela marcaria como "Offline" equipamento que está no ar.
- **Frontend**: Vercel (`vercel.json` faz o rewrite de SPA para `index.html`).
- **Banco**: plugin Postgres da Railway. **Não há backup automático no plano gratuito** —
  o `pg_dump` manual está documentado no `migrations/README.md`.
- **Dependabot** atualiza Maven e npm semanalmente, mas **ignora saltos de major** de
  propósito: Tailwind 3→4 e ESLint 8→9 já quebraram o build de preview.

---

## 11. Trabalhando com o usuário

- É **programador iniciante**. Explique fundamentos; não presuma vocabulário de Java, Spring
  ou React. Diga o que cada coisa faz e por quê.
- Prefere **passo a passo, com ele digitando** e verificação a cada etapa antes de seguir.
- Fala e escreve em **português** — responda em português.
