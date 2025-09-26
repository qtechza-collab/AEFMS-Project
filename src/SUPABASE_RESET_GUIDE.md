# Supabase Database Reset Guide - Logan Freights

## 📋 Available Reset Options

I've created three different scripts for resetting your Supabase database:

### 1. **Complete Database Clear** (`/supabase/clear_database.sql`)
- **Use when**: You want to completely start over with a clean slate
- **What it does**: Deletes ALL tables, functions, triggers, policies, and data
- **Result**: Empty database ready for fresh schema installation

### 2. **Data Only Clear** (`/supabase/clear_data_only.sql`) 
- **Use when**: You want to keep the table structure but reset all data
- **What it does**: Deletes all data but preserves tables, functions, and structure
- **Result**: Empty tables ready for fresh data

### 3. **Fresh Complete Setup** (`/supabase/fresh_setup.sql`)
- **Use when**: You want a one-click complete reset and setup
- **What it does**: Clears everything AND recreates the complete schema with sample data
- **Result**: Fully functional database ready to use

## 🚀 How to Execute Scripts

### Step 1: Access Supabase SQL Editor
1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project: `lrwfehxhophofxcxohsc`
3. Click on **SQL Editor** in the left sidebar

### Step 2: Choose Your Reset Option

#### Option A: Complete Reset (Recommended for fresh start)
```sql
-- Copy and paste the entire content of /supabase/clear_database.sql
-- Then run the script
```

#### Option B: Data Only Reset (Keep structure)
```sql
-- Copy and paste the entire content of /supabase/clear_data_only.sql
-- Then run the script
```

#### Option C: One-Click Fresh Setup
```sql
-- Copy and paste the entire content of /supabase/fresh_setup.sql
-- Then run the script (this is the easiest option)
```

### Step 3: Recreate Schema (If using Option A or B)
1. After clearing, copy and paste your complete `/supabase/schema.sql`
2. Run the schema script to recreate everything
3. Your database will be fresh and ready

### Step 4: Verify Setup
1. Check that all tables exist:
   ```sql
   SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
   ```

2. Verify sample data is present:
   ```sql
   SELECT COUNT(*) as user_count FROM public.users;
   SELECT COUNT(*) as category_count FROM public.expense_categories;
   ```

## ⚠️  Important Warnings

### Before Running Any Script:
- [ ] **Backup Important Data**: If you have any data you want to keep, export it first
- [ ] **Verify Project**: Double-check you're in the correct Supabase project
- [ ] **Test Environment**: Consider testing on a development project first

### After Running Scripts:
- [ ] **Check Environment Variables**: Ensure your app still connects properly
- [ ] **Test Authentication**: Verify login works with sample users
- [ ] **Test Core Features**: Submit a test expense claim to ensure everything works

## 🔧 Troubleshooting

### If Script Fails:
1. **Check for Errors**: Look at the error message in SQL Editor
2. **Run in Parts**: Execute sections of the script individually
3. **Foreign Key Issues**: Make sure you're clearing tables in the right order

### If App Won't Connect After Reset:
1. **Check Environment Variables**: Verify Supabase URL and key are correct
2. **Clear Browser Cache**: Hard refresh your application
3. **Check RLS Policies**: Ensure Row Level Security policies are properly created

### Common Issues:
- **"Table doesn't exist"**: This is normal if tables were already cleared
- **"Policy already exists"**: Safe to ignore, policies are created with IF NOT EXISTS
- **"Permission denied"**: Make sure you're logged in as the project owner

## 🎯 Sample Login Credentials (After Schema Setup)

After running the schema, you can test with these dummy accounts:

- **Employee**: `employee.dummy@loganfreights.co.za`
- **Manager**: `manager.dummy@loganfreights.co.za`  
- **HR**: `hr.dummy@loganfreights.co.za`
- **Admin**: `admin@loganfreights.co.za`

*Note: You'll need to set passwords for these users in Supabase Authentication*

## 📞 Quick Commands Reference

### View All Tables:
```sql
\dt public.*
```

### Count Records in All Tables:
```sql
SELECT 
    schemaname,
    tablename,
    n_tup_ins as "rows"
FROM pg_stat_user_tables 
WHERE schemaname = 'public';
```

### Check RLS Status:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

Your Logan Freights database will be completely fresh and ready for production use! 🚛