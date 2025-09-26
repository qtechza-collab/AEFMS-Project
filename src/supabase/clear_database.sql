-- Logan Freights Database Reset Script
-- ⚠️  WARNING: This script will DELETE ALL DATA in your database!
-- Use this script when you want to completely reset your database and start fresh.
-- Make sure you have a backup before running this script!

-- Step 1: Disable Row Level Security temporarily to avoid foreign key issues
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.expense_claims DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.recent_activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.company_financials DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.expense_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.file_uploads DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.email_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop all policies
DO $$ 
DECLARE 
    policy_record RECORD;
BEGIN
    -- Drop all policies on all tables
    FOR policy_record IN
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      policy_record.policyname, 
                      policy_record.schemaname, 
                      policy_record.tablename);
    END LOOP;
END $$;

-- Step 3: Drop all triggers (except system triggers)
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN
        SELECT trigger_name, event_object_table
        FROM information_schema.triggers
        WHERE trigger_schema = 'public'
        AND trigger_name NOT LIKE 'RI_%' -- Avoid system triggers
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I CASCADE', 
                      trigger_record.trigger_name, 
                      trigger_record.event_object_table);
    END LOOP;
END $$;

-- Step 4: Drop all custom functions
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.audit_trigger_function() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.calculate_expense_totals() CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_old_data() CASCADE;

-- Step 5: Clear all data from tables (in order to respect foreign key constraints)
-- Clear dependent tables first
TRUNCATE TABLE IF EXISTS public.audit_logs CASCADE;
TRUNCATE TABLE IF EXISTS public.email_logs CASCADE;
TRUNCATE TABLE IF EXISTS public.file_uploads CASCADE;
TRUNCATE TABLE IF EXISTS public.notifications CASCADE;
TRUNCATE TABLE IF EXISTS public.recent_activities CASCADE;
TRUNCATE TABLE IF EXISTS public.expense_claims CASCADE;
TRUNCATE TABLE IF EXISTS public.company_financials CASCADE;
TRUNCATE TABLE IF EXISTS public.expense_categories CASCADE;
TRUNCATE TABLE IF EXISTS public.users CASCADE;

-- Step 6: Drop all tables completely
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.email_logs CASCADE;
DROP TABLE IF EXISTS public.file_uploads CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.recent_activities CASCADE;
DROP TABLE IF EXISTS public.expense_claims CASCADE;
DROP TABLE IF EXISTS public.company_financials CASCADE;
DROP TABLE IF EXISTS public.expense_categories CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Step 7: Drop all indexes that might still exist
DO $$
DECLARE
    index_record RECORD;
BEGIN
    FOR index_record IN
        SELECT indexname 
        FROM pg_indexes 
        WHERE schemaname = 'public'
        AND indexname LIKE 'idx_%'
    LOOP
        EXECUTE format('DROP INDEX IF EXISTS public.%I CASCADE', index_record.indexname);
    END LOOP;
END $$;

-- Step 8: Clean up storage buckets and policies
DELETE FROM storage.objects WHERE bucket_id IN ('logan-receipts', 'logan-profiles', 'logan-financials');
DELETE FROM storage.buckets WHERE id IN ('logan-receipts', 'logan-profiles', 'logan-financials');

-- Step 9: Drop storage policies
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage'
        AND policyname LIKE '%logan%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_record.policyname);
    END LOOP;
END $$;

-- Step 10: Clean up any remaining sequences
DO $$
DECLARE
    seq_record RECORD;
BEGIN
    FOR seq_record IN
        SELECT sequence_name 
        FROM information_schema.sequences 
        WHERE sequence_schema = 'public'
    LOOP
        EXECUTE format('DROP SEQUENCE IF EXISTS public.%I CASCADE', seq_record.sequence_name);
    END LOOP;
END $$;

-- Step 11: Reset any custom types (if any exist)
DO $$
DECLARE
    type_record RECORD;
BEGIN
    FOR type_record IN
        SELECT typname 
        FROM pg_type 
        WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        AND typtype = 'e' -- enum types
    LOOP
        EXECUTE format('DROP TYPE IF EXISTS public.%I CASCADE', type_record.typname);
    END LOOP;
END $$;

-- Step 12: Clean up any grants/permissions that might interfere
REVOKE ALL ON SCHEMA public FROM authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM authenticated;

-- Final verification: List any remaining tables
DO $$
DECLARE
    table_count INTEGER;
    remaining_tables TEXT;
BEGIN
    SELECT COUNT(*), string_agg(tablename, ', ')
    INTO table_count, remaining_tables
    FROM pg_tables 
    WHERE schemaname = 'public';
    
    IF table_count > 0 THEN
        RAISE NOTICE 'Warning: % tables still exist: %', table_count, remaining_tables;
    ELSE
        RAISE NOTICE 'Success: All Logan Freights tables have been cleared!';
    END IF;
END $$;

-- Display completion message
SELECT 
    'Database cleared successfully! You can now run the schema.sql file to recreate the database structure.' as status,
    NOW() as cleared_at;

-- Instructions for next steps:
-- 1. Run this script in your Supabase SQL Editor
-- 2. Wait for all commands to complete
-- 3. Run the schema.sql file to recreate the database structure
-- 4. Your database will be completely fresh and ready for use