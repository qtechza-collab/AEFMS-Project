# Supabase Common Errors & Solutions - Logan Freights

## 🔥 IMMEDIATE ERROR: "policy already exists"

### Error Message:
```
ERROR: 42710: policy "Authenticated users can upload files" for table "objects" already exists
```

### ⚡ QUICK FIX (Run this RIGHT NOW):
1. Go to your Supabase SQL Editor
2. Copy and paste the entire contents of `/supabase/IMMEDIATE_FIX.sql`
3. Click "Run" 
4. Problem solved! ✅

---

## 📋 Common Supabase Setup Errors

### 1. **Policy Already Exists (42710)**
**Cause**: Trying to create storage policies that already exist  
**Solution**: Use the IMMEDIATE_FIX.sql script above

### 2. **Table Already Exists (42P07)**
**Cause**: Running schema.sql multiple times  
**Solution**: Use `/supabase/clear_database.sql` first, then run schema.sql

### 3. **Function Already Exists (42723)**
**Cause**: Duplicate function creation  
**Solution**: Add `CREATE OR REPLACE FUNCTION` instead of `CREATE FUNCTION`

### 4. **Trigger Already Exists (42710)**
**Cause**: Trigger exists from previous setup  
**Solution**: Use `DROP TRIGGER IF EXISTS` before creating

### 5. **Permission Denied (42501)**
**Cause**: Insufficient permissions or wrong user  
**Solution**: Ensure you're logged in as project owner in Supabase

---

## 🛠️ Step-by-Step Error Resolution

### If You Get Policy Conflicts:
```sql
-- 1. Drop conflicting policies
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own files" ON storage.objects;

-- 2. Create with unique names
CREATE POLICY "logan_upload_policy" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id IN ('logan-receipts', 'logan-profiles', 'logan-financials') AND auth.role() = 'authenticated');
```

### If You Get Table Conflicts:
```sql
-- Option 1: Drop specific table
DROP TABLE IF EXISTS public.users CASCADE;

-- Option 2: Complete reset (use our scripts)
-- Run /supabase/clear_database.sql
```

### If You Get Function Conflicts:
```sql
-- Drop the function first
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- Then recreate with CREATE OR REPLACE
CREATE OR REPLACE FUNCTION update_updated_at_column() ...
```

---

## 🎯 Recommended Setup Process

### For Fresh Setup:
1. **Run**: `/supabase/IMMEDIATE_FIX.sql` (if you have policy errors)
2. **Run**: `/supabase/clear_database.sql` (complete clean slate)
3. **Run**: `/supabase/schema.sql` (your complete schema)
4. **Verify**: Check that all tables and policies exist

### For Partial Reset:
1. **Run**: `/supabase/clear_data_only.sql` (keep structure, clear data)
2. **Re-insert**: Sample data as needed

### For Complete Fresh Start:
1. **Run**: `/supabase/complete_reset_safe.sql` (handles all conflicts)
2. **Done**: Everything recreated safely

---

## 🔍 How to Debug Supabase Issues

### Check What Exists:
```sql
-- View all your tables
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- View all policies
SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname IN ('public', 'storage');

-- View all functions
SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public';

-- View storage buckets
SELECT * FROM storage.buckets;
```

### Check for Conflicts Before Running Scripts:
```sql
-- Check if policies exist
SELECT policyname FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage' 
AND policyname IN ('Authenticated users can upload files', 'Users can view their own files');

-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'expense_claims', 'notifications');
```

---

## 🚨 Prevention Tips

### Always Use Conflict-Safe SQL:
```sql
-- ✅ GOOD - Safe creation
CREATE TABLE IF NOT EXISTS public.users (...);
CREATE OR REPLACE FUNCTION my_function() ...;
INSERT INTO ... ON CONFLICT (id) DO NOTHING;

-- ❌ BAD - Will cause conflicts
CREATE TABLE public.users (...);
CREATE FUNCTION my_function() ...;
INSERT INTO ... (without conflict handling);
```

### Script Execution Order:
1. **First**: Clean up (drop policies, tables, functions)
2. **Second**: Create structure (tables, indexes)
3. **Third**: Create logic (functions, triggers)
4. **Fourth**: Create security (RLS, policies)
5. **Last**: Insert data

---

## 📞 Quick Commands for Emergencies

### Nuclear Option (Complete Reset):
```sql
-- WARNING: This deletes EVERYTHING
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

### Storage Reset:
```sql
-- Clear all storage
DELETE FROM storage.objects;
DELETE FROM storage.buckets;
-- Drop all storage policies
SELECT 'DROP POLICY IF EXISTS "' || policyname || '" ON storage.objects;' 
FROM pg_policies WHERE tablename = 'objects';
```

### Health Check:
```sql
-- Verify system is working
SELECT 
    'Logan Freights Health Check' as system,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') as tables,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as policies,
    (SELECT COUNT(*) FROM storage.buckets WHERE name LIKE 'logan-%') as buckets,
    NOW() as checked_at;
```

---

Your Logan Freights database should now work without any conflicts! 🚛✅