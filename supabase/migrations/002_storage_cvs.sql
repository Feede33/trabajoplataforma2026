-- ==============================================================================
-- Storage Setup: Bucket 'cvs' and RLS Policies for Supabase Storage
-- ==============================================================================

-- 1. Crear el bucket 'cvs' público para alojar currículums en PDF o Word (máx 5MB)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'cvs',
    'cvs',
    true,
    5242880, -- 5 MB
    ARRAY[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

-- 2. Habilitar RLS en storage.objects (por defecto suele estar habilitado)
-- Políticas para el bucket 'cvs':

-- Lectura: Cualquier usuario (reclutadores, empresas, candidatos) puede ver/descargar los CVs
DROP POLICY IF EXISTS "CVs are publicly viewable" ON storage.objects;
CREATE POLICY "CVs are publicly viewable"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'cvs');

-- Inserción: Solo usuarios autenticados pueden subir archivos a este bucket
DROP POLICY IF EXISTS "Authenticated users can upload CVs" ON storage.objects;
CREATE POLICY "Authenticated users can upload CVs"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'cvs');

-- Modificación: Los usuarios autenticados pueden actualizar su archivo
DROP POLICY IF EXISTS "Authenticated users can update their CVs" ON storage.objects;
CREATE POLICY "Authenticated users can update their CVs"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'cvs');

-- Eliminación: Los usuarios autenticados pueden borrar su archivo
DROP POLICY IF EXISTS "Authenticated users can delete their CVs" ON storage.objects;
CREATE POLICY "Authenticated users can delete their CVs"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'cvs');
