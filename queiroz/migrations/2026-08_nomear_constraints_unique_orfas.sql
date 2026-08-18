-- Nomeia as constraints UNIQUE que ainda dependiam do nome hash gerado pelo Hibernate
-- (`unique = true` sem @Table(uniqueConstraints=...) explícito).
--
-- Motivação: esse padrão já causou um incidente em produção com inventario_resultados
-- (ver 2026-08_acuracidade_por_armazem.sql) -- uma migração manual tentou remover a
-- constraint antiga chutando o nome padrão do Postgres, mas o Hibernate gera um nome
-- hash (tipo uk33809s748qfpmy8onxy754tah) quando não recebe nome explícito, então o
-- DROP virou no-op silencioso e a constraint órfã continuou bloqueando escritas
-- legítimas sem que ninguém percebesse até o dado divergir.
--
-- Rode isto manualmente contra o banco (o Flyway está desligado -- ver README.md).
-- É seguro rodar de novo: cada bloco descobre o nome real da constraint antiga pelo
-- catálogo do Postgres (não chuta) e só age se ela ainda existir.

BEGIN;

DO $$
DECLARE
    constraint_antiga text;
BEGIN
    -- usuarios.username
    SELECT con.conname INTO constraint_antiga
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'usuarios'
      AND con.contype = 'u'
      AND con.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = rel.oid AND attname = 'username')];
    IF constraint_antiga IS NOT NULL AND constraint_antiga <> 'uk_usuarios_username' THEN
        EXECUTE format('ALTER TABLE usuarios DROP CONSTRAINT %I', constraint_antiga);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uk_usuarios_username') THEN
        ALTER TABLE usuarios ADD CONSTRAINT uk_usuarios_username UNIQUE (username);
    END IF;

    -- dias_equipe.data
    SELECT con.conname INTO constraint_antiga
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'dias_equipe'
      AND con.contype = 'u'
      AND con.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = rel.oid AND attname = 'data')];
    IF constraint_antiga IS NOT NULL AND constraint_antiga <> 'uk_dias_equipe_data' THEN
        EXECUTE format('ALTER TABLE dias_equipe DROP CONSTRAINT %I', constraint_antiga);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uk_dias_equipe_data') THEN
        ALTER TABLE dias_equipe ADD CONSTRAINT uk_dias_equipe_data UNIQUE (data);
    END IF;

    -- dias_recebimento.data
    SELECT con.conname INTO constraint_antiga
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'dias_recebimento'
      AND con.contype = 'u'
      AND con.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = rel.oid AND attname = 'data')];
    IF constraint_antiga IS NOT NULL AND constraint_antiga <> 'uk_dias_recebimento_data' THEN
        EXECUTE format('ALTER TABLE dias_recebimento DROP CONSTRAINT %I', constraint_antiga);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uk_dias_recebimento_data') THEN
        ALTER TABLE dias_recebimento ADD CONSTRAINT uk_dias_recebimento_data UNIQUE (data);
    END IF;

    -- zebra_cotas.filial_id
    SELECT con.conname INTO constraint_antiga
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'zebra_cotas'
      AND con.contype = 'u'
      AND con.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = rel.oid AND attname = 'filial_id')];
    IF constraint_antiga IS NOT NULL AND constraint_antiga <> 'uk_zebra_cotas_filial_id' THEN
        EXECUTE format('ALTER TABLE zebra_cotas DROP CONSTRAINT %I', constraint_antiga);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uk_zebra_cotas_filial_id') THEN
        ALTER TABLE zebra_cotas ADD CONSTRAINT uk_zebra_cotas_filial_id UNIQUE (filial_id);
    END IF;
END $$;

COMMIT;
