-- IMMEDIATE FIX for "policy already exists" error
-- Run this script right now in your Supabase SQL Editor to resolve the error

-- Step 1: Drop the conflicting storage policies
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own files" ON storage.objects;

-- Step 2: Create new policies with unique names
CREATE POLICY "logan_upload_policy" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id IN ('logan-receipts', 'logan-profiles', 'logan-financials') 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "logan_view_policy" ON storage.objects
    FOR SELECT USING (
        bucket_id IN ('logan-receipts', 'logan-profiles', 'logan-financials') 
        AND auth.role() = 'authenticated'
    );

-- Step 3: Ensure storage buckets exist
INSERT INTO storage.buckets (id, name, public) VALUES 
('logan-receipts', 'logan-receipts', false),
('logan-profiles', 'logan-profiles', false),
('logan-financials', 'logan-financials', false)
ON CONFLICT (id) DO NOTHING;

-- Verification
SELECT 
    'IMMEDIATE FIX COMPLETE!' as status,
    'You can now run your schema.sql without conflicts' as message,
    COUNT(*) as logan_policies_created
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage' 
AND policyname LIKE 'logan_%';