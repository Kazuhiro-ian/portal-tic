# Portal TIC — Guia de Setup de Ambiente

Este guia explica como deixar o projeto rodando do zero em uma máquina Windows nova
(ou em qualquer máquina que ainda não tenha o ambiente configurado). Ele reflete a
Fase 1 de segurança (autenticação JWT, papéis ADMIN/TECNICO/LEITURA, criptografia do
cofre de credenciais, CORS centralizado).

## Antes de tudo: como funciona a configuração de ambiente aqui

O projeto tem **dois mecanismos diferentes** de configuração "por máquina", e eles
não devem ser confundidos:

### 1. Backend (`queiroz/`) — variáveis de ambiente do Windows, SEM arquivo `.env`

O `application.properties` do backend usa placeholders como `${DB_PASSWORD}`, que o
Spring Boot resolve lendo **variáveis de ambiente reais do sistema operacional** —
não um arquivo `.env`. As três variáveis obrigatórias são:

- `DB_PASSWORD` — senha do usuário do PostgreSQL
- `JWT_SECRET` — chave usada para assinar os tokens de login
- `CREDENCIAL_ENC_KEY` — chave AES-256 (base64) usada para criptografar o cofre de
  credenciais em repouso no banco

Se qualquer uma estiver ausente, **a aplicação recusa subir** — isso é intencional,
para nunca rodar em produção (ou dev) sem segredo configurado.

No Windows, essas variáveis são definidas com o comando `setx` (variável de ambiente
**de usuário**, permanente, mas só enxergada por processos abertos **depois** do
`setx` ter rodado).

### 2. Frontend (`frontend/`) — arquivo `.env` de verdade

Diferente do backend, o Vite (frontend) lê um arquivo `.env` real na raiz de
`frontend/`. Esse arquivo não é commitado (está no `.gitignore`); existe um
`frontend/.env.example` versionado que serve de modelo para copiar.

| | Backend | Frontend |
|---|---|---|
| Onde mora a config | Variável de ambiente do Windows | Arquivo `frontend/.env` |
| Como se cria | `setx NOME valor` | `copy .env.example .env` |
| Vai pro Git? | Não existe arquivo, então não há o que versionar | Não (`.gitignore`), só o `.example` vai |
| Quando é lido | No boot da aplicação Java | No `npm run dev` / `npm run build` |

---

## Pré-requisitos na máquina nova

Confirme que existem antes de começar:

```powershell
psql --version      # PostgreSQL (usado: 18.x)
java -version       # Java 25
node -v             # Node 24.x
npm -v
git --version
```

Se algo faltar, instale antes de seguir (PostgreSQL, JDK 25, Node.js LTS/24).

---

## Passo a passo

### 1. Clonar o repositório
```powershell
git clone <url-do-repositorio>
cd portal-tic
```

### 2. Confirmar que o PostgreSQL está rodando
```powershell
Get-Service -Name "postgresql*"
```
Deve haver um serviço com `Status: Running`. Anote a porta (padrão `5432`) — ela
precisa bater com `spring.datasource.url` em
`queiroz/src/main/resources/application.properties` (hoje fixo em
`jdbc:postgresql://localhost:5432/portal_db`).

### 3. Criar o banco `portal_db`
O nome do banco está fixo no `application.properties`, então precisa ser exatamente
esse:
```powershell
$env:PGPASSWORD = "<senha-do-usuario-postgres-nesta-maquina>"
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h localhost -p 5432 -c "CREATE DATABASE portal_db;"
Remove-Item Env:\PGPASSWORD
```
Se o banco já existir (ex: você está reaproveitando um ambiente), pule este passo.
Não precisa criar tabelas manualmente — o Hibernate cria tudo sozinho no primeiro
boot (`spring.jpa.hibernate.ddl-auto=update`).

### 4. Gerar segredos novos para esta máquina

**Nunca reaproveite os segredos de outra máquina.** Gere valores novos:

```powershell
Add-Type -AssemblyName System.Security
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()

$jwtBytes = New-Object byte[] 64
$rng.GetBytes($jwtBytes)
$jwtSecret = [Convert]::ToBase64String($jwtBytes)

$aesBytes = New-Object byte[] 32
$rng.GetBytes($aesBytes)
$credEncKey = [Convert]::ToBase64String($aesBytes)

Write-Output "JWT_SECRET=$jwtSecret"
Write-Output "CREDENCIAL_ENC_KEY=$credEncKey"
```
Copie os dois valores impressos — vai precisar deles no próximo passo. Guarde-os
também em um gerenciador de senhas; eles não ficam salvos em nenhum arquivo do
projeto.

### 5. Persistir as variáveis de ambiente no Windows
```powershell
setx DB_USERNAME "postgres"
setx DB_PASSWORD "<senha-do-postgres-nesta-maquina>"
setx JWT_SECRET "<valor-gerado-no-passo-4>"
setx CREDENCIAL_ENC_KEY "<valor-gerado-no-passo-4>"
```
**Importante:** `setx` só é enxergado por janelas/processos abertos **depois** desse
comando. Feche e reabra o PowerShell (ou o terminal/IDE que vai rodar o backend)
antes de seguir para o passo 7.

### 6. Criar o `.env` do frontend
```powershell
Copy-Item frontend\.env.example frontend\.env
```
O padrão (`VITE_API_BASE_URL=http://localhost:8080`) funciona para rodar tudo na
mesma máquina. Só mude se o backend rodar em outro host/porta.

### 7. Compilar e subir o backend
Abra um terminal **novo** (para garantir que as variáveis do passo 5 estão visíveis):
```powershell
cd queiroz
.\mvnw.cmd spring-boot:run
```
Verifique no log:
- Nenhum erro de `Could not resolve placeholder` (isso indicaria que as variáveis de
  ambiente não foram vistas pelo processo — normalmente porque o terminal é antigo).
- Se o banco estiver vazio, procure por uma mensagem `BootstrapAdminRunner` com o
  usuário/senha do admin inicial — **ela só aparece uma vez, nesse primeiro boot**:
  ```
  Nenhum usuário encontrado. Usuário ADMIN inicial criado:
    username: admin
    senha (gerada automaticamente, só aparece aqui UMA VEZ): ...
  ```
  Anote essa senha e troque-a assim que logar.

### 8. Subir o frontend
Em outro terminal:
```powershell
cd frontend
npm install
npm run dev
```
Acesse `http://localhost:5173` e faça login com o usuário/senha do passo 7.

---

## Checklist rápido (para quando você já souber o processo)

- [ ] PostgreSQL rodando, banco `portal_db` criado
- [ ] `setx DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`, `CREDENCIAL_ENC_KEY` feitos, terminal reaberto
- [ ] `frontend/.env` criado a partir do `.env.example`
- [ ] `cd queiroz && .\mvnw.cmd spring-boot:run` sem erro de placeholder
- [ ] Senha do admin capturada do log (se banco novo)
- [ ] `cd frontend && npm install && npm run dev`
- [ ] Login testado em `http://localhost:5173`
