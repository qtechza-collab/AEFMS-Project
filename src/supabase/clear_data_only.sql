-- Logan Freights Data Reset Script (Structure Preserved)
-- This script clears all data but keeps the table structure intact
-- Safer option if you only want to reset data, not the entire schema

-- Step 1: Disable triggers temporarily to speed up deletion
SET session_replication_role = replica;

-- Step 2: Clear all data from tables (in correct order to respect foreign keys)
-- Clear dependent tables first, then parent tables

-- Clear audit and log tables
DELETE FROM public.audit_logs;
DELETE FROM public.email_logs;

-- Clear file uploads and notifications
DELETE FROM public.file_uploads;
DELETE FROM public.notifications;

-- Clear activities and claims
DELETE FROM public.recent_activities;
DELETE FROM public.expense_claims;

-- Clear financial and category data
DELETE FROM public.company_financials;
DELETE FROM public.expense_categories;

-- Clear users (this should be last due to foreign key references)
DELETE FROM public.users;

-- Step 3: Reset sequences (if any exist)
DO $$
DECLARE
    seq_record RECORD;
BEGIN
    FOR seq_record IN
        SELECT sequence_name 
        FROM information_schema.sequences 
        WHERE sequence_schema = 'public'
    LOOP
        EXECUTE format('ALTER SEQUENCE public.%I RESTART WITH 1', seq_record.sequence_name);
    END LOOP;
END $$;

-- Step 4: Clear storage objects but keep buckets
DELETE FROM storage.objects WHERE bucket_id IN ('logan-receipts', 'logan-profiles', 'logan-financials');

-- Step 5: Re-enable triggers
SET session_replication_role = DEFAULT;

-- Step 6: Verification - show empty table counts
SELECT 
    'users' as table_name, 
    COUNT(*) as record_count 
FROM public.users
UNION ALL
SELECT 
    'expense_claims' as table_name, 
    COUNT(*) as record_count 
FROM public.expense_claims
UNION ALL
SELECT 
    'notifications' as table_name, 
    COUNT(*) as record_count 
FROM public.notifications
UNION ALL
SELECT 
    'recent_activities' as table_name, 
    COUNT(*) as record_count 
FROM public.recent_activities
UNION ALL
SELECT 
    'company_financials' as table_name, 
    COUNT(*) as record_count 
FROM public.company_financials
UNION ALL
SELECT 
    'expense_categories' as table_name, 
    COUNT(*) as record_count 
FROM public.expense_categories
UNION ALL
SELECT 
    'file_uploads' as table_name, 
    COUNT(*) as record_count 
FROM public.file_uploads
UNION ALL
SELECT 
    'email_logs' as table_name, 
    COUNT(*) as record_count 
FROM public.email_logs
UNION ALL
SELECT 
    'audit_logs' as table_name, 
    COUNT(*) as record_count 
FROM public.audit_logs
ORDER BY table_name;

-- Display completion message
SELECT 
    'All data cleared successfully! Table structure preserved. You can now insert fresh data.' as status,
    NOW() as cleared_at;

-- Note: After running this script, you may want to re-insert:
-- 1. Default expense categories (from schema.sql lines 260-271)
-- 2. Test users (from schema.sql lines 274-281)
-- 3. Sample financial data (from schema.sql lines 288-296)