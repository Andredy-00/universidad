-- ============================================
-- MIGRACIÓN SEGURA - Elimina dependencias primero
-- ============================================

-- Paso 1: Eliminar políticas que dependen de role
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Paso 2: Eliminar funciones que dependen de role
DROP FUNCTION IF EXISTS is_super_admin() CASCADE;
DROP FUNCTION IF EXISTS is_super_admin(UUID) CASCADE;
DROP FUNCTION IF EXISTS is_admin_or_higher(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_user_role(UUID) CASCADE;

-- Paso 3: Crear enums si no existen
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'cliente');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE proceso_estado AS ENUM ('pendiente', 'en_proceso', 'en_revision', 'resuelto', 'archivado', 'cancelado');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE documento_tipo AS ENUM ('demanda', 'contestacion', 'sentencia', 'recurso', 'contrato', 'poder', 'escritura', 'certificado', 'otro');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Paso 4: Migrar columna role a enum
-- Crear columna temporal con el nuevo tipo
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role_enum user_role DEFAULT 'cliente';

-- Migrar datos existentes
UPDATE profiles SET role_enum = 
  CASE 
    WHEN role::text = 'super_admin' THEN 'super_admin'::user_role
    WHEN role::text = 'admin' THEN 'admin'::user_role
    ELSE 'cliente'::user_role
  END;

-- Eliminar columna vieja y renombrar nueva
ALTER TABLE profiles DROP COLUMN IF EXISTS role CASCADE;
ALTER TABLE profiles RENAME COLUMN role_enum TO role;

-- Paso 5: Añadir nuevas columnas a profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS celular TEXT,
ADD COLUMN IF NOT EXISTS numero_identificacion TEXT,
ADD COLUMN IF NOT EXISTS direccion TEXT,
ADD COLUMN IF NOT EXISTS notas TEXT,
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true NOT NULL,
ADD COLUMN IF NOT EXISTS creado_por_id UUID REFERENCES profiles(id);

-- Paso 6: Crear funciones helper
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = user_id;
$$;

CREATE OR REPLACE FUNCTION is_admin_or_higher(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id AND role IN ('admin', 'super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION is_super_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id AND role = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'super_admin'
  );
$$;

-- Paso 7: Crear políticas RLS para profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (
    id = auth.uid() OR 
    is_admin_or_higher(auth.uid()) OR
    creado_por_id = auth.uid()
  );

CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE USING (
    id = auth.uid() OR 
    is_super_admin(auth.uid()) OR
    (is_admin_or_higher(auth.uid()) AND creado_por_id = auth.uid())
  );

CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT WITH CHECK (is_admin_or_higher(auth.uid()));

CREATE POLICY "profiles_delete" ON profiles
  FOR DELETE USING (
    is_super_admin(auth.uid()) OR
    (is_admin_or_higher(auth.uid()) AND creado_por_id = auth.uid())
  );

-- ============================================
-- PROCESOS JURÍDICOS
-- ============================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "procesos_select" ON procesos_juridicos;
DROP POLICY IF EXISTS "procesos_insert" ON procesos_juridicos;
DROP POLICY IF EXISTS "procesos_update" ON procesos_juridicos;
DROP POLICY IF EXISTS "procesos_delete" ON procesos_juridicos;
DROP POLICY IF EXISTS "Users can view own procesos" ON procesos_juridicos;
DROP POLICY IF EXISTS "Admins can manage procesos" ON procesos_juridicos;

-- Añadir nuevas columnas
ALTER TABLE procesos_juridicos
ADD COLUMN IF NOT EXISTS numero_proceso TEXT,
ADD COLUMN IF NOT EXISTS descripcion TEXT,
ADD COLUMN IF NOT EXISTS fecha_inicio TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS fecha_audiencia TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS fecha_cierre TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS juzgado TEXT,
ADD COLUMN IF NOT EXISTS ciudad TEXT,
ADD COLUMN IF NOT EXISTS notas_internas TEXT,
ADD COLUMN IF NOT EXISTS abogado_id UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS creado_por_id UUID REFERENCES profiles(id);

-- Migrar estado a enum si es text
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'procesos_juridicos' 
    AND column_name = 'estado' 
    AND data_type = 'text'
  ) THEN
    ALTER TABLE procesos_juridicos ADD COLUMN estado_enum proceso_estado DEFAULT 'pendiente';
    
    UPDATE procesos_juridicos SET estado_enum = 
      CASE 
        WHEN estado = 'en_proceso' THEN 'en_proceso'::proceso_estado
        WHEN estado = 'en_revision' THEN 'en_revision'::proceso_estado
        WHEN estado = 'resuelto' THEN 'resuelto'::proceso_estado
        WHEN estado = 'archivado' THEN 'archivado'::proceso_estado
        WHEN estado = 'cancelado' THEN 'cancelado'::proceso_estado
        ELSE 'pendiente'::proceso_estado
      END;
    
    ALTER TABLE procesos_juridicos DROP COLUMN estado;
    ALTER TABLE procesos_juridicos RENAME COLUMN estado_enum TO estado;
  END IF;
END $$;

-- Eliminar columnas obsoletas
ALTER TABLE procesos_juridicos 
DROP COLUMN IF EXISTS storage_path CASCADE,
DROP COLUMN IF EXISTS nombre_archivo CASCADE,
DROP COLUMN IF EXISTS tamano CASCADE,
DROP COLUMN IF EXISTS mime_type CASCADE,
DROP COLUMN IF EXISTS nota CASCADE,
DROP COLUMN IF EXISTS subido_por CASCADE;

ALTER TABLE procesos_juridicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "procesos_select" ON procesos_juridicos
  FOR SELECT USING (
    cliente_id = auth.uid() OR
    abogado_id = auth.uid() OR
    creado_por_id = auth.uid() OR
    is_admin_or_higher(auth.uid())
  );

CREATE POLICY "procesos_insert" ON procesos_juridicos
  FOR INSERT WITH CHECK (is_admin_or_higher(auth.uid()));

CREATE POLICY "procesos_update" ON procesos_juridicos
  FOR UPDATE USING (
    creado_por_id = auth.uid() OR
    abogado_id = auth.uid() OR
    is_super_admin(auth.uid())
  );

CREATE POLICY "procesos_delete" ON procesos_juridicos
  FOR DELETE USING (
    creado_por_id = auth.uid() OR
    is_super_admin(auth.uid())
  );

-- ============================================
-- DOCUMENTOS
-- ============================================

DROP POLICY IF EXISTS "documentos_select" ON documentos;
DROP POLICY IF EXISTS "documentos_insert" ON documentos;
DROP POLICY IF EXISTS "documentos_delete" ON documentos;
DROP POLICY IF EXISTS "Users can view own documents" ON documentos;
DROP POLICY IF EXISTS "Admins can manage documents" ON documentos;

ALTER TABLE documentos 
ADD COLUMN IF NOT EXISTS proceso_id UUID REFERENCES procesos_juridicos(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS tipo documento_tipo DEFAULT 'otro',
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS es_version_actual BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS visible_para_cliente BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS subido_por_id UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS tamano_bytes INTEGER;

-- Migrar subido_por si existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documentos' AND column_name = 'subido_por') THEN
    UPDATE documentos SET subido_por_id = subido_por WHERE subido_por_id IS NULL;
    ALTER TABLE documentos DROP COLUMN subido_por CASCADE;
  END IF;
END $$;

ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documentos_select" ON documentos
  FOR SELECT USING (
    is_admin_or_higher(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM procesos_juridicos p
      WHERE p.id = documentos.proceso_id
      AND p.cliente_id = auth.uid()
      AND documentos.visible_para_cliente = true
    ) OR
    cliente_id = auth.uid()
  );

CREATE POLICY "documentos_insert" ON documentos
  FOR INSERT WITH CHECK (is_admin_or_higher(auth.uid()));

CREATE POLICY "documentos_delete" ON documentos
  FOR DELETE USING (
    subido_por_id = auth.uid() OR
    is_super_admin(auth.uid())
  );

-- ============================================
-- NUEVAS TABLAS
-- ============================================

CREATE TABLE IF NOT EXISTS actividad_historial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  entidad_tipo TEXT NOT NULL,
  entidad_id UUID NOT NULL,
  accion TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  datos_anteriores JSONB,
  datos_nuevos JSONB,
  usuario_id UUID NOT NULL REFERENCES profiles(id),
  ip_address TEXT,
  user_agent TEXT
);

CREATE TABLE IF NOT EXISTS notificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  usuario_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  entidad_tipo TEXT,
  entidad_id UUID,
  leida BOOLEAN DEFAULT false NOT NULL,
  leida_at TIMESTAMPTZ
);

ALTER TABLE actividad_historial ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "actividad_select" ON actividad_historial;
DROP POLICY IF EXISTS "actividad_insert" ON actividad_historial;
DROP POLICY IF EXISTS "notificaciones_select" ON notificaciones;
DROP POLICY IF EXISTS "notificaciones_update" ON notificaciones;
DROP POLICY IF EXISTS "notificaciones_insert" ON notificaciones;

CREATE POLICY "actividad_select" ON actividad_historial
  FOR SELECT USING (is_admin_or_higher(auth.uid()));

CREATE POLICY "actividad_insert" ON actividad_historial
  FOR INSERT WITH CHECK (true);

CREATE POLICY "notificaciones_select" ON notificaciones
  FOR SELECT USING (usuario_id = auth.uid());

CREATE POLICY "notificaciones_update" ON notificaciones
  FOR UPDATE USING (usuario_id = auth.uid());

CREATE POLICY "notificaciones_insert" ON notificaciones
  FOR INSERT WITH CHECK (is_admin_or_higher(auth.uid()));

-- ============================================
-- ÍNDICES
-- ============================================

CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles(role);
CREATE INDEX IF NOT EXISTS profiles_creado_por_idx ON profiles(creado_por_id);
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);
CREATE INDEX IF NOT EXISTS procesos_cliente_idx ON procesos_juridicos(cliente_id);
CREATE INDEX IF NOT EXISTS procesos_estado_idx ON procesos_juridicos(estado);
CREATE INDEX IF NOT EXISTS procesos_abogado_idx ON procesos_juridicos(abogado_id);
CREATE INDEX IF NOT EXISTS documentos_proceso_idx ON documentos(proceso_id);
CREATE INDEX IF NOT EXISTS documentos_tipo_idx ON documentos(tipo);
CREATE INDEX IF NOT EXISTS actividad_entidad_idx ON actividad_historial(entidad_tipo, entidad_id);
CREATE INDEX IF NOT EXISTS actividad_usuario_idx ON actividad_historial(usuario_id);
CREATE INDEX IF NOT EXISTS notificaciones_usuario_idx ON notificaciones(usuario_id);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS procesos_updated_at ON procesos_juridicos;
CREATE TRIGGER procesos_updated_at
  BEFORE UPDATE ON procesos_juridicos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- LIMPIAR TABLAS OBSOLETAS
-- ============================================

DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;

SELECT 'Migración completada exitosamente' as resultado;
