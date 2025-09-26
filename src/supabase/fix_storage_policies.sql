-- Logan Freights Storage Policy Fix
-- Run this script to resolve the "policy already exists" error

-- Step 1: Drop existing storage policies if they exist
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all storage policies related to Logan Freights
    FOR policy_record IN
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage'
        AND (policyname LIKE '%logan%' OR 
             policyname IN ('Authenticated users can upload files', 'Users can view their own files'))
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_record.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- Step 2: Recreate storage policies with proper names to avoid conflicts
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

CREATE POLICY "logan_update_policy" ON storage.objects
    FOR UPDATE USING (
        bucket_id IN ('logan-receipts', 'logan-profiles', 'logan-financials') 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "logan_delete_policy" ON storage.objects
    FOR DELETE USING (
        bucket_id IN ('logan-receipts', 'logan-profiles', 'logan-financials') 
        AND auth.role() = 'authenticated'
    );

-- Step 3: Ensure buckets exist
INSERT INTO storage.buckets (id, name, public) VALUES 
('logan-receipts', 'logan-receipts', false),
('logan-profiles', 'logan-profiles', false),
('logan-financials', 'logan-financials', false)
ON CONFLICT (id) DO NOTHING;

-- Step 4: Verify policies were created
SELECT 
    'Storage policies fixed successfully!' as status,
    COUNT(*) as policies_created
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage' 
AND policyname LIKE 'logan_%';

RAISE NOTICE 'Logan Freights storage policies have been fixed and recreated successfully!';