-- Script para sistema de roles jerárquico
-- Super Admin > Admin > Cliente (Usuario)

-- Agregar columna creado_por a profiles si no existe
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS creado_por uuid REFERENCES profiles(id);

-- Agregar columna creado_por a clientes si no existe
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS creado_por uuid REFERENCES profiles(id);

-- Crear tabla de admins
CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  nombre text NOT NULL,
  correo text NOT NULL UNIQUE,
  usuario text NOT NULL UNIQUE,
  password_encrypted text,
  auth_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  activo boolean DEFAULT true,
  creado_por uuid REFERENCES profiles(id)
);

-- Habilitar RLS para admins
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Función para verificar si es super_admin (actualizada)
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si es admin o super_admin
CREATE OR REPLACE FUNCTION is_admin_or_super()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Políticas para admins (solo super_admin puede ver/crear/modificar admins)
DROP POLICY IF EXISTS admins_select_super ON admins;
CREATE POLICY admins_select_super ON admins FOR SELECT USING (is_super_admin());

DROP POLICY IF EXISTS admins_insert_super ON admins;
CREATE POLICY admins_insert_super ON admins FOR INSERT WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS admins_update_super ON admins;
CREATE POLICY admins_update_super ON admins FOR UPDATE USING (is_super_admin());

DROP POLICY IF EXISTS admins_delete_super ON admins;
CREATE POLICY admins_delete_super ON admins FOR DELETE USING (is_super_admin());

-- Actualizar políticas de clientes para que admin pueda ver solo sus clientes
DROP POLICY IF EXISTS clientes_select_admin ON clientes;
CREATE POLICY clientes_select_admin ON clientes FOR SELECT USING (
  is_super_admin() OR 
  (is_admin_or_super() AND creado_por = auth.uid())
);

DROP POLICY IF EXISTS clientes_insert_admin ON clientes;
CREATE POLICY clientes_insert_admin ON clientes FOR INSERT WITH CHECK (is_admin_or_super());

DROP POLICY IF EXISTS clientes_update_admin ON clientes;
CREATE POLICY clientes_update_admin ON clientes FOR UPDATE USING (
  is_super_admin() OR 
  (is_admin_or_super() AND creado_por = auth.uid())
);

DROP POLICY IF EXISTS clientes_delete_admin ON clientes;
CREATE POLICY clientes_delete_admin ON clientes FOR DELETE USING (
  is_super_admin() OR 
  (is_admin_or_super() AND creado_por = auth.uid())
);

-- Actualizar políticas de procesos jurídicos
DROP POLICY IF EXISTS procesos_select_admin ON procesos_juridicos;
CREATE POLICY procesos_select_admin ON procesos_juridicos FOR SELECT USING (
  is_super_admin() OR
  (is_admin_or_super() AND EXISTS (
    SELECT 1 FROM clientes WHERE clientes.id = procesos_juridicos.cliente_id AND clientes.creado_por = auth.uid()
  ))
);

DROP POLICY IF EXISTS procesos_insert_admin ON procesos_juridicos;
CREATE POLICY procesos_insert_admin ON procesos_juridicos FOR INSERT WITH CHECK (is_admin_or_super());

DROP POLICY IF EXISTS procesos_update_admin ON procesos_juridicos;
CREATE POLICY procesos_update_admin ON procesos_juridicos FOR UPDATE USING (is_admin_or_super());

DROP POLICY IF EXISTS procesos_delete_admin ON procesos_juridicos;
CREATE POLICY procesos_delete_admin ON procesos_juridicos FOR DELETE USING (is_admin_or_super());

-- Actualizar políticas de documentos
DROP POLICY IF EXISTS documentos_select_admin ON documentos;
CREATE POLICY documentos_select_admin ON documentos FOR SELECT USING (
  is_super_admin() OR
  (is_admin_or_super() AND EXISTS (
    SELECT 1 FROM clientes WHERE clientes.id = documentos.cliente_id AND clientes.creado_por = auth.uid()
  ))
);

DROP POLICY IF EXISTS documentos_insert_admin ON documentos;
CREATE POLICY documentos_insert_admin ON documentos FOR INSERT WITH CHECK (is_admin_or_super());

DROP POLICY IF EXISTS documentos_delete_admin ON documentos;
CREATE POLICY documentos_delete_admin ON documentos FOR DELETE USING (is_admin_or_super());

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_clientes_creado_por ON clientes(creado_por);
CREATE INDEX IF NOT EXISTS idx_admins_creado_por ON admins(creado_por);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
