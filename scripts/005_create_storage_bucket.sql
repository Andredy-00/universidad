-- Crear bucket para documentos
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos', 'documentos', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para el bucket de documentos

-- Super admins pueden subir archivos
CREATE POLICY "documentos_insert_admin" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'documentos' AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'super_admin'
    )
  );

-- Super admins pueden ver todos los archivos
CREATE POLICY "documentos_select_admin" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'documentos' AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'super_admin'
    )
  );

-- Usuarios pueden ver archivos de sus documentos
CREATE POLICY "documentos_select_own" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'documentos' AND
    EXISTS (
      SELECT 1 FROM documentos
      JOIN clientes ON clientes.id = documentos.cliente_id
      WHERE documentos.storage_path = name
      AND clientes.auth_user_id = auth.uid()
    )
  );

-- Super admins pueden eliminar archivos
CREATE POLICY "documentos_delete_admin" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'documentos' AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'super_admin'
    )
  );
