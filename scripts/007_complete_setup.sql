-- Script completo que incluye todas las funciones y tablas necesarias
-- Ejecutar este script si tienes errores de funciones no existentes

-- Paso 1: Crear función is_super_admin (sin parámetros, usa auth.uid())
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  );
$$;

-- Paso 2: Crear función is_super_admin con parámetro (para uso flexible)
CREATE OR REPLACE FUNCTION public.is_super_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'super_admin'
  );
$$;

-- Paso 3: Corregir políticas de profiles
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;

CREATE POLICY "profiles_select_policy"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_super_admin(auth.uid()));

CREATE POLICY "profiles_update_policy"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "profiles_insert_policy"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id OR public.is_super_admin(auth.uid()));

-- Paso 4: Crear tabla clientes si no existe
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  nombre TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  telefono TEXT,
  direccion TEXT,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  password_encrypted TEXT
);

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS clientes_select_own ON clientes;
DROP POLICY IF EXISTS clientes_insert_admin ON clientes;
DROP POLICY IF EXISTS clientes_update_admin ON clientes;
DROP POLICY IF EXISTS clientes_delete_admin ON clientes;

CREATE POLICY clientes_select_own ON clientes
  FOR SELECT USING (is_super_admin() OR auth_user_id = auth.uid());

CREATE POLICY clientes_insert_admin ON clientes
  FOR INSERT WITH CHECK (is_super_admin());

CREATE POLICY clientes_update_admin ON clientes
  FOR UPDATE USING (is_super_admin());

CREATE POLICY clientes_delete_admin ON clientes
  FOR DELETE USING (is_super_admin());

-- Paso 5: Crear tabla procesos_juridicos
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

CREATE INDEX IF NOT EXISTS idx_procesos_cliente_id ON procesos_juridicos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_procesos_estado ON procesos_juridicos(estado);

ALTER TABLE procesos_juridicos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS procesos_select_policy ON procesos_juridicos;
DROP POLICY IF EXISTS procesos_insert_admin ON procesos_juridicos;
DROP POLICY IF EXISTS procesos_update_admin ON procesos_juridicos;
DROP POLICY IF EXISTS procesos_delete_admin ON procesos_juridicos;

CREATE POLICY procesos_select_policy ON procesos_juridicos
  FOR SELECT USING (
    is_super_admin() OR 
    cliente_id IN (SELECT id FROM clientes WHERE auth_user_id = auth.uid())
  );

CREATE POLICY procesos_insert_admin ON procesos_juridicos
  FOR INSERT WITH CHECK (is_super_admin());

CREATE POLICY procesos_update_admin ON procesos_juridicos
  FOR UPDATE USING (is_super_admin());

CREATE POLICY procesos_delete_admin ON procesos_juridicos
  FOR DELETE USING (is_super_admin());

-- Paso 6: Crear bucket de storage para documentos
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos', 'documentos', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage
DROP POLICY IF EXISTS "documentos_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "documentos_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "documentos_delete_policy" ON storage.objects;

CREATE POLICY "documentos_select_policy" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documentos' AND (
      is_super_admin() OR 
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM clientes WHERE auth_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "documentos_insert_policy" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'documentos' AND is_super_admin());

CREATE POLICY "documentos_delete_policy" ON storage.objects
  FOR DELETE USING (bucket_id = 'documentos' AND is_super_admin());
