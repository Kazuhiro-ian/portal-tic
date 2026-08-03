# Migrations e controle de schema

## Situação atual (o que está valendo hoje)

O schema do banco é criado e alterado pelo **Hibernate**, via `spring.jpa.hibernate.ddl-auto=update`.
O Flyway já está no projeto e configurado, mas **desligado** (`spring.flyway.enabled=false`).

Nada muda no comportamento até você seguir o roteiro de ativação abaixo, de propósito: o banco de
produção já existe e foi todo criado pelo Hibernate. Ligar o Flyway sem preparo faria ele tentar
aplicar a migration inicial sobre tabelas que já existem, e a aplicação não subiria.

### Por que sair do `ddl-auto=update`

`update` só sabe **adicionar**. Ele nunca remove nem renomeia nada, então:

- renomear um campo em Java cria uma coluna nova e deixa a antiga órfã, com os dados dentro;
- não existe registro do que mudou, nem como voltar atrás;
- a mesma alteração pode produzir resultados diferentes em máquinas diferentes;
- não há revisão: a alteração de schema acontece no boot, sem ninguém aprovar.

O arquivo `2026-08_impressoras_para_ativos.sql` nesta pasta é justamente um caso desses, resolvido
na mão porque o `update` não daria conta do rename.

---

## Roteiro de ativação (fazer uma vez, com calma)

> Faça isto num momento tranquilo, não numa sexta-feira à tarde. O passo 1 é obrigatório.

### 1. Backup do banco de produção

```bash
# A DATABASE_URL está nas variáveis do plugin Postgres, no painel da Railway
pg_dump "$DATABASE_URL" > backup-antes-do-flyway-$(date +%Y%m%d).sql
```

Confirme que o arquivo não está vazio antes de seguir.

### 2. Gerar o baseline a partir do schema real

O baseline precisa refletir o banco **que existe de verdade**, e não uma reconstrução a partir das
entidades Java — elas podem ter divergido do banco ao longo do tempo.

```bash
pg_dump --schema-only --no-owner --no-privileges "$DATABASE_URL" \
  > queiroz/src/main/resources/db/migration/V1__baseline.sql
```

Abra o arquivo gerado e remova o que não fizer parte do schema da aplicação (extensões,
`SET`s de sessão, o schema `public` em si). Ele nunca vai rodar no banco atual — serve para
que um banco novo (máquina de outro dev, ambiente de testes) nasça igual ao de produção.

### 3. Marcar o banco de produção como já estando no V1

No painel da Railway, defina nas variáveis do serviço:

```
FLYWAY_ENABLED=true
```

E em `application.properties`, troque `spring.flyway.baseline-version` de `0` para `1`.

Assim, no primeiro boot o Flyway cria a tabela `flyway_schema_history`, registra o banco como
estando na versão 1 e **não executa** o `V1__baseline.sql` (o schema já está lá). Da versão 2 em
diante, as migrations passam a rodar normalmente.

### 4. Validar

Suba a aplicação e confirme nos logs:

```
Flyway Community Edition ... 
Successfully baselined schema with version: 1
```

Confira também que `/actuator/health` responde `UP` e que a aplicação lê e grava dados normalmente.

### 5. Passar o Hibernate para modo conferente

Só depois do passo 4 dar certo, defina na Railway:

```
JPA_DDL_AUTO=validate
```

A partir daí o Hibernate para de alterar o schema e passa apenas a conferir, no boot, se as
entidades batem com as tabelas. Se não baterem, a aplicação recusa a subir — que é exatamente o
alerta que você quer, em vez de uma alteração silenciosa.

---

## Daqui em diante: como alterar o schema

1. Crie `V2__descricao_curta.sql` em `queiroz/src/main/resources/db/migration/`
2. Altere a entidade Java correspondente
3. Rode `./mvnw test` — a suíte usa H2 e o Flyway fica desligado nela, então o schema de teste
   continua vindo do Hibernate (`create-drop`)
4. Commit e deploy: o Flyway aplica a migration no boot, uma única vez, e registra na
   `flyway_schema_history`

**Nunca edite uma migration que já foi aplicada em produção.** O Flyway guarda um checksum de cada
arquivo; alterar um já aplicado faz a validação falhar e a aplicação não sobe. Para corrigir algo,
crie a próxima versão.

---

## Rotina de backup (independente do Flyway)

O plano gratuito da Railway não faz backup automático. Enquanto não houver algo agendado, vale rodar
periodicamente e guardar fora da Railway:

```bash
pg_dump "$DATABASE_URL" | gzip > portal-tic-$(date +%Y%m%d).sql.gz
```
