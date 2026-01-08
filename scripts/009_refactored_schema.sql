-- ============================================
-- SCHEMA REFACTORIZADO PARA LEGALTECH
-- Ejecutar este script para migrar a la nueva estructura
-- ============================================

-- Crear enums
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

-- ============================================
-- PROFILES - Refactorizado
-- ============================================

-- Añadir nuevas columnas a profiles existente
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS celular TEXT,
ADD COLUMN IF NOT EXISTS numero_identificacion TEXT,
ADD COLUMN IF NOT EXISTS direccion TEXT,
ADD COLUMN IF NOT EXISTS notas TEXT,
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true NOT NULL;

-- Actualizar columna role para usar enum (si existe como text)
-- Primero crear columna temporal
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role_new user_role DEFAULT 'cliente';

-- Migrar datos existentes
UPDATE profiles SET role_new = 
  CASE 
    WHEN role = 'super_admin' THEN 'super_admin'::user_role
    WHEN role = 'admin' THEN 'admin'::user_role
    ELSE 'cliente'::user_role
  END
WHERE role_new IS NULL OR role_new = 'cliente';

-- Si la columna role existe como text, renombrarla y usar la nueva
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role' AND data_type = 'text') THEN
    ALTER TABLE profiles DROP COLUMN IF EXISTS role;
    ALTER TABLE profiles RENAME COLUMN role_new TO role;
  ELSE
    ALTER TABLE profiles DROP COLUMN IF EXISTS role_new;
  END IF;
END $$;

-- Renombrar creado_por a creado_por_id si existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'creado_por') THEN
    ALTER TABLE profiles RENAME COLUMN creado_por TO creado_por_id;
  END IF;
END $$;

-- Crear índices
CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles(role);
CREATE INDEX IF NOT EXISTS profiles_creado_por_idx ON profiles(creado_por_id);
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);

-- ============================================
-- PROCESOS JURÍDICOS - Refactorizado
-- ============================================

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

-- Migrar estado a enum
ALTER TABLE procesos_juridicos ADD COLUMN IF NOT EXISTS estado_new proceso_estado DEFAULT 'pendiente';

UPDATE procesos_juridicos SET estado_new = 
  CASE 
    WHEN estado = 'en_proceso' THEN 'en_proceso'::proceso_estado
    WHEN estado = 'en_revision' THEN 'en_revision'::proceso_estado
    WHEN estado = 'resuelto' THEN 'resuelto'::proceso_estado
    WHEN estado = 'archivado' THEN 'archivado'::proceso_estado
    WHEN estado = 'cancelado' THEN 'cancelado'::proceso_estado
    ELSE 'pendiente'::proceso_estado
  END;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'procesos_juridicos' AND column_name = 'estado' AND data_type = 'text') THEN
    ALTER TABLE procesos_juridicos DROP COLUMN estado;
    ALTER TABLE procesos_juridicos RENAME COLUMN estado_new TO estado;
  ELSE
    ALTER TABLE procesos_juridicos DROP COLUMN IF EXISTS estado_new;
  END IF;
END $$;

-- Eliminar columnas obsoletas de archivos (ahora van en documentos)
ALTER TABLE procesos_juridicos 
DROP COLUMN IF EXISTS storage_path,
DROP COLUMN IF EXISTS nombre_archivo,
DROP COLUMN IF EXISTS tamano,
DROP COLUMN IF EXISTS mime_type,
DROP COLUMN IF EXISTS nota;

-- Renombrar subido_por
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'procesos_juridicos' AND column_name = 'subido_por') THEN
    UPDATE procesos_juridicos SET creado_por_id = subido_por WHERE creado_por_id IS NULL;
    ALTER TABLE procesos_juridicos DROP COLUMN subido_por;
  END IF;
END $$;

-- Crear índices
CREATE INDEX IF NOT EXISTS procesos_cliente_idx ON procesos_juridicos(cliente_id);
CREATE INDEX IF NOT EXISTS procesos_estado_idx ON procesos_juridicos(estado);
CREATE INDEX IF NOT EXISTS procesos_abogado_idx ON procesos_juridicos(abogado_id);
CREATE INDEX IF NOT EXISTS procesos_numero_idx ON procesos_juridicos(numero_proceso);

-- ============================================
-- DOCUMENTOS - Refactorizado
-- ============================================

-- Añadir columna proceso_id
ALTER TABLE documentos ADD COLUMN IF NOT EXISTS proceso_id UUID;

-- Añadir nuevas columnas
ALTER TABLE documentos
ADD COLUMN IF NOT EXISTS tipo documento_tipo DEFAULT 'otro',
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS es_version_actual BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS visible_para_cliente BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS subido_por_id UUID REFERENCES profiles(id);

-- Renombrar tamano a tamano_bytes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documentos' AND column_name = 'tamano') THEN
    ALTER TABLE documentos RENAME COLUMN tamano TO tamano_bytes_text;
    ALTER TABLE documentos ADD COLUMN IF NOT EXISTS tamano_bytes INTEGER;
    ALTER TABLE documentos DROP COLUMN IF EXISTS tamano_bytes_text;
  END IF;
END $$;

-- Migrar subido_por a subido_por_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documentos' AND column_name = 'subido_por') THEN
    UPDATE documentos SET subido_por_id = subido_por WHERE subido_por_id IS NULL;
    ALTER TABLE documentos DROP COLUMN subido_por;
  END IF;
END $$;

-- Crear índices
CREATE INDEX IF NOT EXISTS documentos_proceso_idx ON documentos(proceso_id);
CREATE INDEX IF NOT EXISTS documentos_tipo_idx ON documentos(tipo);
CREATE INDEX IF NOT EXISTS documentos_version_actual_idx ON documentos(es_version_actual);

-- ============================================
-- ACTIVIDAD HISTORIAL - Nueva tabla
-- ============================================

CREATE TABLE IF NOT EXISTS actividad_historial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  entidad_tipo TEXT NOT NULL,
  entidad_id UUID NOT NULL,
  accion TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  datos_anteriores TEXT,
  datos_nuevos TEXT,
  usuario_id UUID NOT NULL REFERENCES profiles(id),
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS actividad_entidad_idx ON actividad_historial(entidad_tipo, entidad_id);
CREATE INDEX IF NOT EXISTS actividad_usuario_idx ON actividad_historial(usuario_id);
CREATE INDEX IF NOT EXISTS actividad_fecha_idx ON actividad_historial(created_at);

-- ============================================
-- NOTIFICACIONES - Nueva tabla
-- ============================================

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

CREATE INDEX IF NOT EXISTS notificaciones_usuario_idx ON notificaciones(usuario_id);
CREATE INDEX IF NOT EXISTS notificaciones_leida_idx ON notificaciones(leida);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Función helper para verificar rol
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = user_id;
$$;

-- Función helper para verificar si es admin o superior
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

-- Función helper para verificar si es super admin
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

-- Versión sin parámetros para RLS
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

-- Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE procesos_juridicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE actividad_historial ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

-- Policies para profiles
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (
    id = auth.uid() OR 
    is_admin_or_higher(auth.uid()) OR
    creado_por_id = auth.uid()
  );

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (
    id = auth.uid() OR 
    is_super_admin(auth.uid()) OR
    (is_admin_or_higher(auth.uid()) AND creado_por_id = auth.uid())
  );

DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT WITH CHECK (is_admin_or_higher(auth.uid()));

-- Policies para procesos_juridicos
DROP POLICY IF EXISTS "procesos_select" ON procesos_juridicos;
CREATE POLICY "procesos_select" ON procesos_juridicos
  FOR SELECT USING (
    cliente_id = auth.uid() OR
    abogado_id = auth.uid() OR
    creado_por_id = auth.uid() OR
    is_admin_or_higher(auth.uid())
  );

DROP POLICY IF EXISTS "procesos_insert" ON procesos_juridicos;
CREATE POLICY "procesos_insert" ON procesos_juridicos
  FOR INSERT WITH CHECK (is_admin_or_higher(auth.uid()));

DROP POLICY IF EXISTS "procesos_update" ON procesos_juridicos;
CREATE POLICY "procesos_update" ON procesos_juridicos
  FOR UPDATE USING (
    creado_por_id = auth.uid() OR
    abogado_id = auth.uid() OR
    is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "procesos_delete" ON procesos_juridicos;
CREATE POLICY "procesos_delete" ON procesos_juridicos
  FOR DELETE USING (
    creado_por_id = auth.uid() OR
    is_super_admin(auth.uid())
  );

-- Policies para documentos
DROP POLICY IF EXISTS "documentos_select" ON documentos;
CREATE POLICY "documentos_select" ON documentos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM procesos_juridicos p
      WHERE p.id = documentos.proceso_id
      AND (
        p.cliente_id = auth.uid() OR
        p.abogado_id = auth.uid() OR
        p.creado_por_id = auth.uid() OR
        is_admin_or_higher(auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "documentos_insert" ON documentos;
CREATE POLICY "documentos_insert" ON documentos
  FOR INSERT WITH CHECK (is_admin_or_higher(auth.uid()));

DROP POLICY IF EXISTS "documentos_delete" ON documentos;
CREATE POLICY "documentos_delete" ON documentos
  FOR DELETE USING (
    subido_por_id = auth.uid() OR
    is_super_admin(auth.uid())
  );

-- Policies para actividad_historial
DROP POLICY IF EXISTS "actividad_select" ON actividad_historial;
CREATE POLICY "actividad_select" ON actividad_historial
  FOR SELECT USING (is_admin_or_higher(auth.uid()));

DROP POLICY IF EXISTS "actividad_insert" ON actividad_historial;
CREATE POLICY "actividad_insert" ON actividad_historial
  FOR INSERT WITH CHECK (true);

-- Policies para notificaciones
DROP POLICY IF EXISTS "notificaciones_select" ON notificaciones;
CREATE POLICY "notificaciones_select" ON notificaciones
  FOR SELECT USING (usuario_id = auth.uid());

DROP POLICY IF EXISTS "notificaciones_update" ON notificaciones;
CREATE POLICY "notificaciones_update" ON notificaciones
  FOR UPDATE USING (usuario_id = auth.uid());

DROP POLICY IF EXISTS "notificaciones_insert" ON notificaciones;
CREATE POLICY "notificaciones_insert" ON notificaciones
  FOR INSERT WITH CHECK (is_admin_or_higher(auth.uid()));

-- ============================================
-- TRIGGER PARA UPDATED_AT
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

DROP TRIGGER IF EXISTS documentos_updated_at ON documentos;
CREATE TRIGGER documentos_updated_at
  BEFORE UPDATE ON documentos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- LIMPIAR TABLAS OBSOLETAS
-- ============================================

-- Las tablas admins y clientes ya no son necesarias
-- Los datos deben migrarse a profiles antes de eliminarlas
-- DROP TABLE IF EXISTS admins CASCADE;
-- DROP TABLE IF EXISTS clientes CASCADE;

SELECT 'Schema refactorizado exitosamente' as resultado;
