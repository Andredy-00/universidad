-- Crear tabla de clientes
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  nombre TEXT NOT NULL,
  correo TEXT NOT NULL UNIQUE,
  celular TEXT,
  usuario TEXT NOT NULL UNIQUE,
  auth_user_id UUID REFERENCES profiles(id),
  activo BOOLEAN DEFAULT true
);

-- Crear tabla de documentos
CREATE TABLE IF NOT EXISTS documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  storage_path TEXT NOT NULL,
  nombre_archivo TEXT NOT NULL,
  tamano TEXT,
  mime_type TEXT,
  subido_por UUID REFERENCES profiles(id)
);

-- Habilitar RLS
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;

-- Políticas para clientes
-- Super admins pueden ver todos los clientes
CREATE POLICY "clientes_select_admin" ON clientes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'super_admin'
    )
  );

-- Usuarios pueden ver solo su propio registro de cliente
CREATE POLICY "clientes_select_own" ON clientes
  FOR SELECT
  USING (auth_user_id = auth.uid());

-- Super admins pueden insertar clientes
CREATE POLICY "clientes_insert_admin" ON clientes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'super_admin'
    )
  );

-- Super admins pueden actualizar clientes
CREATE POLICY "clientes_update_admin" ON clientes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'super_admin'
    )
  );

-- Políticas para documentos
-- Super admins pueden ver todos los documentos
CREATE POLICY "documentos_select_admin" ON documentos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'super_admin'
    )
  );

-- Usuarios pueden ver documentos de su cliente
CREATE POLICY "documentos_select_own" ON documentos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clientes 
      WHERE clientes.id = documentos.cliente_id 
      AND clientes.auth_user_id = auth.uid()
    )
  );

-- Super admins pueden insertar documentos
CREATE POLICY "documentos_insert_admin" ON documentos
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'super_admin'
    )
  );

-- Super admins pueden eliminar documentos
CREATE POLICY "documentos_delete_admin" ON documentos
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'super_admin'
    )
  );

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_clientes_auth_user_id ON clientes(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_clientes_correo ON clientes(correo);
CREATE INDEX IF NOT EXISTS idx_documentos_cliente_id ON documentos(cliente_id);
