-- Script para actualizar clientes y crear tabla de procesos jurídicos

-- Agregar columna de contraseña encriptada a clientes
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS password_encrypted TEXT;

-- Crear tabla de procesos jurídicos
CREATE TABLE IF NOT EXISTS procesos_juridicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  caso TEXT NOT NULL,
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_proceso', 'resuelto', 'archivado')),
  nota TEXT,
  storage_path TEXT,
  nombre_archivo TEXT,
  tamano TEXT,
  mime_type TEXT,
  subido_por UUID REFERENCES profiles(id)
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_procesos_cliente_id ON procesos_juridicos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_procesos_estado ON procesos_juridicos(estado);

-- Habilitar RLS
ALTER TABLE procesos_juridicos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para procesos_juridicos
DROP POLICY IF EXISTS procesos_select_admin ON procesos_juridicos;
CREATE POLICY procesos_select_admin ON procesos_juridicos
  FOR SELECT USING (
    is_super_admin() OR 
    cliente_id IN (SELECT id FROM clientes WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS procesos_insert_admin ON procesos_juridicos;
CREATE POLICY procesos_insert_admin ON procesos_juridicos
  FOR INSERT WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS procesos_update_admin ON procesos_juridicos;
CREATE POLICY procesos_update_admin ON procesos_juridicos
  FOR UPDATE USING (is_super_admin());

DROP POLICY IF EXISTS procesos_delete_admin ON procesos_juridicos;
CREATE POLICY procesos_delete_admin ON procesos_juridicos
  FOR DELETE USING (is_super_admin());

-- Actualizar política de clientes para incluir password_encrypted
DROP POLICY IF EXISTS clientes_select_own ON clientes;
CREATE POLICY clientes_select_own ON clientes
  FOR SELECT USING (
    is_super_admin() OR 
    auth_user_id = auth.uid()
  );

-- Política para que admin pueda ver password_encrypted pero usuarios no
-- Esto se manejará a nivel de API, no exponiendo el campo en queries normales
