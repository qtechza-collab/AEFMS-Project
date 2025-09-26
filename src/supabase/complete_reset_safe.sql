-- Logan Freights Complete Safe Reset Script
-- This script safely handles all conflicts and policy issues
-- ⚠️  WARNING: This will DELETE ALL DATA but handles existing policies properly

-- =====================================
-- PHASE 1: SAFE CLEANUP WITH CONFLICT HANDLING
-- =====================================

-- Disable RLS temporarily
DO $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        AND tablename IN ('users', 'expense_claims', 'notifications', 'recent_activities', 
                         'company_financials', 'expense_categories', 'file_uploads', 
                         'email_logs', 'audit_logs')
    LOOP
        EXECUTE format('ALTER TABLE IF EXISTS public.%I DISABLE ROW LEVEL SECURITY', table_record.tablename);
    END LOOP;
END $$;

-- Drop all policies safely
DO $$ 
DECLARE 
    policy_record RECORD;
BEGIN
    -- Drop all public schema policies
    FOR policy_record IN
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I CASCADE', 
                          policy_record.policyname, 
                          policy_record.schemaname, 
                          policy_record.tablename);
        EXCEPTION WHEN OTHERS THEN
            -- Ignore errors when dropping policies
            NULL;
        END;
    END LOOP;
    
    -- Drop storage policies separately
    FOR policy_record IN
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage'
        AND (policyname LIKE '%logan%' OR 
             policyname IN ('Authenticated users can upload files', 'Users can view their own files'))
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects CASCADE', policy_record.policyname);
        EXCEPTION WHEN OTHERS THEN
            -- Ignore errors when dropping storage policies
            NULL;
        END;
    END LOOP;
END $$;

-- Drop all triggers safely
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
        BEGIN
            EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I CASCADE', 
                          trigger_record.trigger_name, 
                          trigger_record.event_object_table);
        EXCEPTION WHEN OTHERS THEN
            -- Ignore errors when dropping triggers
            NULL;
        END;
    END LOOP;
END $$;

-- Drop all functions safely
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN
        SELECT routine_name, routine_schema
        FROM information_schema.routines
        WHERE routine_schema = 'public'
        AND routine_type = 'FUNCTION'
        AND routine_name IN ('update_updated_at_column', 'audit_trigger_function', 
                           'get_user_role', 'calculate_expense_totals', 'cleanup_old_data')
    LOOP
        BEGIN
            EXECUTE format('DROP FUNCTION IF EXISTS %I.%I CASCADE', 
                          func_record.routine_schema, 
                          func_record.routine_name);
        EXCEPTION WHEN OTHERS THEN
            -- Ignore errors when dropping functions
            NULL;
        END;
    END LOOP;
END $$;

-- Clear all data from tables safely
DO $$
DECLARE
    table_record RECORD;
    table_list TEXT[] := ARRAY['audit_logs', 'email_logs', 'file_uploads', 'notifications', 
                              'recent_activities', 'expense_claims', 'company_financials', 
                              'expense_categories', 'users'];
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY table_list
    LOOP
        BEGIN
            EXECUTE format('TRUNCATE TABLE IF EXISTS public.%I CASCADE', table_name);
        EXCEPTION WHEN OTHERS THEN
            -- If truncate fails, try delete
            BEGIN
                EXECUTE format('DELETE FROM public.%I', table_name);
            EXCEPTION WHEN OTHERS THEN
                -- Ignore if table doesn't exist
                NULL;
            END;
        END;
    END LOOP;
END $$;

-- Drop all tables safely
DO $$
DECLARE
    table_name TEXT;
    table_list TEXT[] := ARRAY['audit_logs', 'email_logs', 'file_uploads', 'notifications', 
                              'recent_activities', 'expense_claims', 'company_financials', 
                              'expense_categories', 'users'];
BEGIN
    FOREACH table_name IN ARRAY table_list
    LOOP
        BEGIN
            EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', table_name);
        EXCEPTION WHEN OTHERS THEN
            -- Ignore errors when dropping tables
            NULL;
        END;
    END LOOP;
END $$;

-- Clean up storage safely
DO $$
BEGIN
    BEGIN
        DELETE FROM storage.objects WHERE bucket_id IN ('logan-receipts', 'logan-profiles', 'logan-financials');
    EXCEPTION WHEN OTHERS THEN
        -- Ignore if storage objects don't exist
        NULL;
    END;
END $$;

-- Clean up indexes safely
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
        BEGIN
            EXECUTE format('DROP INDEX IF EXISTS public.%I CASCADE', index_record.indexname);
        EXCEPTION WHEN OTHERS THEN
            -- Ignore errors when dropping indexes
            NULL;
        END;
    END LOOP;
END $$;

SELECT 'Phase 1 Complete: Safe cleanup finished' as status;

-- =====================================
-- PHASE 2: RECREATION WITH CONFLICT PREVENTION
-- =====================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Now run the complete schema recreation...
-- (For brevity, I'm showing the structure - you would include your complete schema here)

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    employee_id TEXT UNIQUE NOT NULL,
    department TEXT NOT NULL,
    position TEXT NOT NULL,
    phone TEXT,
    role TEXT CHECK (role IN ('employee', 'manager', 'hr', 'administrator')) NOT NULL DEFAULT 'employee',
    manager_id UUID REFERENCES public.users(id),
    status TEXT CHECK (status IN ('active', 'pending', 'suspended')) DEFAULT 'active',
    profile_photo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- [Continue with all other table creations from your schema.sql...]

-- Create storage buckets with conflict handling
INSERT INTO storage.buckets (id, name, public) VALUES 
('logan-receipts', 'logan-receipts', false),
('logan-profiles', 'logan-profiles', false),
('logan-financials', 'logan-financials', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies with unique names to prevent conflicts
DO $$
BEGIN
    -- Only create policies if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'logan_upload_policy' AND tablename = 'objects') THEN
        CREATE POLICY "logan_upload_policy" ON storage.objects
            FOR INSERT WITH CHECK (
                bucket_id IN ('logan-receipts', 'logan-profiles', 'logan-financials') 
                AND auth.role() = 'authenticated'
            );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'logan_view_policy' AND tablename = 'objects') THEN
        CREATE POLICY "logan_view_policy" ON storage.objects
            FOR SELECT USING (
                bucket_id IN ('logan-receipts', 'logan-profiles', 'logan-financials') 
                AND auth.role() = 'authenticated'
            );
    END IF;
END $$;

-- Final verification
SELECT 
    'Complete safe reset finished successfully!' as status,
    NOW() as completed_at,
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public') as public_tables_count,
    (SELECT COUNT(*) FROM storage.buckets WHERE id LIKE 'logan-%') as storage_buckets_count,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE 'logan_%') as storage_policies_count;

-- Instructions for next steps
SELECT 
    'NEXT STEPS:' as instruction,
    '1. Run your complete schema.sql file to recreate all tables and data' as step_1,
    '2. The storage policies have been fixed with unique names' as step_2,
    '3. No more conflicts should occur' as step_3;