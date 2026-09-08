BEGIN;

ALTER TABLE zebra_envios ALTER COLUMN data_envio DROP NOT NULL;

ALTER TABLE zebra_envios ADD COLUMN IF NOT EXISTS status VARCHAR(20);
ALTER TABLE zebra_envios ADD COLUMN IF NOT EXISTS data_prevista DATE;
ALTER TABLE zebra_envios ADD COLUMN IF NOT EXISTS envio_numero INTEGER;
ALTER TABLE zebra_envios ADD COLUMN IF NOT EXISTS observacao TEXT;

UPDATE zebra_envios
SET status = 'ENVIADO', data_prevista = data_envio
WHERE status IS NULL;

ALTER TABLE zebra_envios ALTER COLUMN status SET NOT NULL;
ALTER TABLE zebra_envios ALTER COLUMN data_prevista SET NOT NULL;

COMMIT;