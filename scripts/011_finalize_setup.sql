-- Script para finalizar la configuración
-- Las tablas y columnas principales ya existen, solo actualizamos funciones y políticas

-- ============================================
-- FUNCIONES DE SEGURIDAD
-- ============================================

-- Función para verificar si el usuario actual es super_admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'super_admin'
    AND activo = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si es admin o super_admin
CREATE OR REPLACE FUNCTION is_admin_or_above()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin')
    AND activo = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener el rol del usuario actual
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role::TEXT INTO user_role 
  FROM profiles 
  WHERE id = auth.uid();
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si un usuario puede ver a otro
CREATE OR REPLACE FUNCTION can_view_user(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_role TEXT;
BEGIN
  SELECT role::TEXT INTO current_role FROM profiles WHERE id = auth.uid();
  
  -- Super admin ve todo
  IF current_role = 'super_admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Admin ve a sus clientes
  IF current_role = 'admin' THEN
    RETURN EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = target_user_id 
      AND creado_por_id = auth.uid()
    );
  END IF;
  
  -- Cliente solo se ve a sí mismo
  RETURN target_user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- POLÍTICAS RLS PARA PROFILES
-- ============================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS profiles_select ON profiles;
DROP POLICY IF EXISTS profiles_select_policy ON profiles;
DROP POLICY IF EXISTS profiles_insert ON profiles;
DROP POLICY IF EXISTS profiles_update ON profiles;
DROP POLICY IF EXISTS profiles_update_policy ON profiles;
DROP POLICY IF EXISTS profiles_delete ON profiles;

-- Política SELECT: Super admin ve todo, admin ve sus clientes, cliente se ve a sí mismo
CREATE POLICY profiles_select ON profiles FOR SELECT
USING (
  is_super_admin() 
  OR (is_admin_or_above() AND creado_por_id = auth.uid())
  OR id = auth.uid()
);

-- Política INSERT: Super admin crea todo, admin solo crea clientes
CREATE POLICY profiles_insert ON profiles FOR INSERT
WITH CHECK (
  is_super_admin() 
  OR (is_admin_or_above() AND role = 'cliente')
);

-- Política UPDATE: Super admin actualiza todo, admin sus clientes, usuario a sí mismo
CREATE POLICY profiles_update ON profiles FOR UPDATE
USING (
  is_super_admin() 
  OR (is_admin_or_above() AND creado_por_id = auth.uid())
  OR id = auth.uid()
);

-- Política DELETE: Super admin elimina todo, admin solo sus clientes
CREATE POLICY profiles_delete ON profiles FOR DELETE
USING (
  is_super_admin() 
  OR (is_admin_or_above() AND creado_por_id = auth.uid() AND role = 'cliente')
);

-- ============================================
-- POLÍTICAS RLS PARA PROCESOS
-- ============================================

DROP POLICY IF EXISTS procesos_select ON procesos_juridicos;
DROP POLICY IF EXISTS procesos_insert ON procesos_juridicos;
DROP POLICY IF EXISTS procesos_insert_admin ON procesos_juridicos;
DROP POLICY IF EXISTS procesos_update ON procesos_juridicos;
DROP POLICY IF EXISTS procesos_update_admin ON procesos_juridicos;
DROP POLICY IF EXISTS procesos_delete ON procesos_juridicos;
DROP POLICY IF EXISTS procesos_delete_admin ON procesos_juridicos;

-- SELECT: Admin/Super ve los que creó o donde es abogado, cliente ve los suyos
CREATE POLICY procesos_select ON procesos_juridicos FOR SELECT
USING (
  is_super_admin()
  OR creado_por_id = auth.uid()
  OR abogado_id = auth.uid()
  OR cliente_id = auth.uid()
);

-- INSERT: Solo admin o superior
CREATE POLICY procesos_insert ON procesos_juridicos FOR INSERT
WITH CHECK (is_admin_or_above());

-- UPDATE: El que lo creó o super admin
CREATE POLICY procesos_update ON procesos_juridicos FOR UPDATE
USING (is_super_admin() OR creado_por_id = auth.uid());

-- DELETE: El que lo creó o super admin
CREATE POLICY procesos_delete ON procesos_juridicos FOR DELETE
USING (is_super_admin() OR creado_por_id = auth.uid());

-- ============================================
-- POLÍTICAS RLS PARA DOCUMENTOS
-- ============================================

DROP POLICY IF EXISTS documentos_select ON documentos;
DROP POLICY IF EXISTS documentos_insert ON documentos;
DROP POLICY IF EXISTS documentos_insert_admin ON documentos;
DROP POLICY IF EXISTS documentos_delete ON documentos;
DROP POLICY IF EXISTS documentos_delete_admin ON documentos;

-- SELECT: Admin ve los que subió, cliente los visibles para él
CREATE POLICY documentos_select ON documentos FOR SELECT
USING (
  is_super_admin()
  OR subido_por_id = auth.uid()
  OR (cliente_id = auth.uid() AND visible_para_cliente = true)
);

-- INSERT: Solo admin o superior
CREATE POLICY documentos_insert ON documentos FOR INSERT
WITH CHECK (is_admin_or_above());

-- DELETE: El que lo subió o super admin
CREATE POLICY documentos_delete ON documentos FOR DELETE
USING (is_super_admin() OR subido_por_id = auth.uid());

-- ============================================
-- ÍNDICES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_creado_por ON profiles(creado_por_id);
CREATE INDEX IF NOT EXISTS idx_procesos_cliente ON procesos_juridicos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_procesos_creador ON procesos_juridicos(creado_por_id);
CREATE INDEX IF NOT EXISTS idx_documentos_proceso ON documentos(proceso_id);
CREATE INDEX IF NOT EXISTS idx_documentos_cliente ON documentos(cliente_id);
