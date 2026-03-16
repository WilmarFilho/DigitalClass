-- Add Bank Details to Professor Profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS conta_bancaria TEXT,
ADD COLUMN IF NOT EXISTS chave_pix TEXT,
ADD COLUMN IF NOT EXISTS dia_repasse INTEGER CHECK (dia_repasse IN (5, 10, 15)),
ADD COLUMN IF NOT EXISTS preferencia_repasse TEXT CHECK (preferencia_repasse IN ('pix', 'transferencia_bancaria'));
