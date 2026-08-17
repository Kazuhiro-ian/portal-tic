-- Correção do modelo de "estoque dividido" (armazém 01/03) do módulo de Qualidade.
--
-- A primeira versão modelava o armazém como propriedade do agendamento
-- (inventarios.armazem), criando um inventário por armazém. Isso foi corrigido: o dia do
-- inventário é da loja (um único inventário por filial/mês, como sempre foi); o armazém
-- passa a ser uma propriedade de CADA RESULTADO/ITEM IMPORTADO dentro desse inventário
-- (duas planilhas, um dia só).
--
-- Rode isto manualmente contra o banco (o Flyway está desligado -- ver migrations/README.md).
-- Confira o nome real da constraint antiga antes de rodar:
--   psql "$DATABASE_URL" -c "\d inventario_resultados"
-- O nome usado abaixo (inventario_resultados_inventario_id_key) é o padrão que o Postgres dá
-- a uma coluna UNIQUE simples criada via Hibernate; ajuste se o seu banco tiver outro nome.

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
ALTER TABLE inventario_resultados DROP CONSTRAINT IF EXISTS inventario_resultados_inventario_id_key;
ALTER TABLE inventario_resultados ADD CONSTRAINT uk_inv_resultado_armazem UNIQUE (inventario_id, armazem);

COMMIT;
