-- Correção do modelo de "estoque dividido" (armazém 01/03) do módulo de Qualidade.
--
-- A primeira versão modelava o armazém como propriedade do agendamento
-- (inventarios.armazem), criando um inventário por armazém. Isso foi corrigido: o dia do
-- inventário é da loja (um único inventário por filial/mês, como sempre foi); o armazém
-- passa a ser uma propriedade de CADA RESULTADO/ITEM IMPORTADO dentro desse inventário
-- (duas planilhas, um dia só).
--
-- Rode isto manualmente contra o banco (o Flyway está desligado -- ver migrations/README.md).
--
-- CORRIGIDO EM 2026-08-18: a primeira versão deste script chutava o nome da constraint antiga
-- como `inventario_resultados_inventario_id_key` (o padrão que o *Postgres* usa para uma coluna
-- UNIQUE simples). Mas essa constraint foi criada pelo *Hibernate* a partir de `unique = true`
-- sem nome explícito, e o Hibernate gera um nome hash (ex: `uk33809s748qfpmy8onxy754tah`,
-- diferente em cada banco). Resultado: o `DROP CONSTRAINT IF EXISTS` era sempre um no-op
-- silencioso, a constraint antiga nunca saía, e a 2ª planilha (2º armazém) de qualquer
-- inventário dividido passava a ser rejeitada pelo banco com "duplicate key value" assim que
-- a 1ª já tivesse sido importada -- em produção e em qualquer ambiente que tenha rodado a
-- versão antiga deste arquivo. O bloco abaixo descobre o nome real pelo catálogo do Postgres
-- em vez de chutar, e é seguro rodar de novo mesmo num banco que já rodou a versão antiga.

BEGIN;

-- Reverte a coluna de armazém que tinha ido para o agendamento.
ALTER TABLE inventarios DROP COLUMN IF EXISTS armazem;

-- Armazém passa a viver no resultado e no item importado.
ALTER TABLE inventario_resultados ADD COLUMN IF NOT EXISTS armazem VARCHAR(20);
ALTER TABLE inventario_itens ADD COLUMN IF NOT EXISTS armazem VARCHAR(20);

-- inventario_resultados.inventario_id era UNIQUE sozinho (1 resultado por inventário).
-- Agora uma filial dividida tem até 2 resultados para o MESMO inventário (um por armazém),
-- então a unicidade precisa ser composta. Postgres trata múltiplos NULL como distintos em
-- UNIQUE, então isso não muda nada para filial não dividida (armazem sempre null).
DO $$
DECLARE
    constraint_antiga text;
BEGIN
    SELECT con.conname INTO constraint_antiga
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'inventario_resultados'
      AND con.contype = 'u'
      AND con.conkey = ARRAY[(
          SELECT attnum FROM pg_attribute
          WHERE attrelid = rel.oid AND attname = 'inventario_id'
      )];

    IF constraint_antiga IS NOT NULL THEN
        EXECUTE format('ALTER TABLE inventario_resultados DROP CONSTRAINT %I', constraint_antiga);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uk_inv_resultado_armazem') THEN
        ALTER TABLE inventario_resultados ADD CONSTRAINT uk_inv_resultado_armazem UNIQUE (inventario_id, armazem);
    END IF;
END $$;

COMMIT;
