# Logan Freights Complete Deployment Guide

## 🚀 Pre-Deployment Checklist

### 1. Verify Files Are Ready
- [x] `.npmrc` configured with legacy peer deps
- [x] `vercel.json` updated with proper install commands
- [x] `package-lock.json` using lockfileVersion 2
- [x] Environment variables configured
- [x] Supabase project connected

### 2. Required Environment Variables
You'll need these in your Vercel project:
- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key

## 📋 Step-by-Step Deployment Process

### Step 1: Prepare Your Repository

1. **Commit all changes**:
   ```bash
   git add .
   git commit -m "Ready for production deployment"
   git push origin main
   ```

2. **Verify your repository structure**:
   - Ensure all files are committed
   - Check that `.npmrc` exists with proper configuration
   - Verify `vercel.json` has the updated install command

### Step 2: Set Up Supabase Database Schema

1. **Go to your Supabase project dashboard**:
   - Visit: https://supabase.com/dashboard/projects
   - Select your project (lrwfehxhophofxcxohsc)

2. **Run the database schema**:
   - Go to SQL Editor in your Supabase dashboard
   - Copy the contents from `/supabase/schema.sql`
   - Execute the SQL to create all necessary tables

3. **Verify tables are created**:
   Check that these tables exist:
   - `profiles` (user profiles)
   - `expenses` (expense records)
   - `expense_approvals` (approval workflow)
   - `categories` (expense categories)
   - `departments` (company departments)
   - `notifications` (system notifications)

### Step 3: Configure Vercel Project

1. **Connect to Vercel**:
   - Go to https://vercel.com
   - Click "New Project"
   - Import your Git repository

2. **Configure Build Settings**:
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install --legacy-peer-deps --no-audit --no-fund`

3. **Set Environment Variables**:
   In Vercel dashboard → Settings → Environment Variables:
   ```
   VITE_SUPABASE_URL = https://lrwfehxhophofxcxohsc.supabase.co
   VITE_SUPABASE_ANON_KEY = [your-anon-key]
   NODE_ENV = production
   ```

### Step 4: Deploy to Vercel

1. **Initial Deployment**:
   - Click "Deploy" in Vercel
   - Wait for the build to complete
   - Check deployment logs for any errors

2. **Verify Deployment**:
   - Visit your deployed URL
   - Check that the app loads without errors
   - Verify Supabase connection works

### Step 5: Set Up Row Level Security (RLS)

1. **Enable RLS on all tables**:
   In Supabase SQL Editor:
   ```sql
   -- Enable RLS on all tables
   ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
   ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
   ALTER TABLE expense_approvals ENABLE ROW LEVEL SECURITY;
   ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
   ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
   ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
   ```

2. **Create RLS Policies**:
   ```sql
   -- Example: Users can only see their own expenses
   CREATE POLICY "Users can view own expenses" ON expenses
   FOR SELECT USING (auth.uid() = user_id);

   -- Example: Users can insert their own expenses
   CREATE POLICY "Users can insert own expenses" ON expenses
   FOR INSERT WITH CHECK (auth.uid() = user_id);

   -- Example: Managers can approve expenses
   CREATE POLICY "Managers can approve expenses" ON expense_approvals
   FOR ALL USING (
     EXISTS (
       SELECT 1 FROM profiles 
       WHERE id = auth.uid() 
       AND role IN ('manager', 'administrator')
     )
   );
   ```

### Step 6: Create Initial Users

1. **Set up test users**:
   In Supabase Authentication → Users:
   - Create employee test user
   - Create manager test user
   - Create HR test user
   - Create administrator user

2. **Update user profiles**:
   ```sql
   -- Insert profile data for test users
   INSERT INTO profiles (id, name, email, role, department)
   VALUES 
   ('user-id-1', 'John Doe', 'employee@loganfreights.co.za', 'employee', 'Operations'),
   ('user-id-2', 'Jane Smith', 'manager@loganfreights.co.za', 'manager', 'Finance'),
   ('user-id-3', 'Bob Johnson', 'hr@loganfreights.co.za', 'hr', 'Human Resources'),
   ('user-id-4', 'Alice Brown', 'admin@loganfreights.co.za', 'administrator', 'IT');
   ```

## 🔧 Post-Deployment Configuration

### Step 7: Configure Email Settings (Optional)

1. **Set up SMTP in Supabase**:
   - Go to Authentication → Settings
   - Configure SMTP settings for email notifications

2. **Test email functionality**:
   - Try password reset
   - Test notification emails

### Step 8: Set Up File Storage

1. **Configure Storage Bucket**:
   - Go to Storage in Supabase
   - Create bucket named `receipts`
   - Set appropriate RLS policies for file access

2. **Test file upload**:
   - Try uploading a receipt in the app
   - Verify files are stored correctly

### Step 9: Production Testing

1. **Test All User Roles**:
   - Employee: Submit expenses, upload receipts
   - Manager: Approve/reject expenses, view analytics
   - HR: Manage employees, view reports
   - Administrator: Full system access

2. **Test Core Features**:
   - User authentication
   - Expense submission
   - Receipt upload
   - Approval workflow
   - Financial reporting
   - Export functionality

## 🚨 Troubleshooting Guide

### Common Issues and Solutions

#### Build Fails with npm lockfile error
**Solution**: 
- Check that `.npmrc` contains `legacy-peer-deps=true`
- Verify `vercel.json` uses the correct install command
- Try deleting `node_modules` and `package-lock.json`, then reinstall

#### Environment variables not working
**Solution**:
- Ensure variables start with `VITE_` prefix
- Check they're set in Vercel dashboard
- Redeploy after adding new variables

#### Supabase connection fails
**Solution**:
- Verify URL and anon key are correct
- Check network connectivity
- Ensure RLS policies allow access

#### Authentication not working
**Solution**:
- Check RLS policies on profiles table
- Verify email templates in Supabase
- Test with different browsers/incognito mode

### Health Check Endpoint

Your app includes a health check at `/health.html`:
- Visit: `https://your-domain.vercel.app/health.html`
- Should return system status information

### Debug Information

The app includes comprehensive logging:
- Check browser console for errors
- Look for Logan Freights system logs
- Check sessionStorage for error history

## 📊 Monitoring and Maintenance

### Performance Monitoring
- Use Vercel Analytics for performance metrics
- Monitor Supabase usage in dashboard
- Set up alerts for high error rates

### Regular Maintenance
- Keep dependencies updated
- Monitor security advisories
- Backup database regularly
- Review and update RLS policies

### Cost Optimization
- Monitor Vercel function usage
- Check Supabase bandwidth usage
- Optimize images and assets
- Use caching where appropriate

## 🎯 Success Verification

After deployment, verify these work:
- [ ] App loads without errors
- [ ] All user roles can log in
- [ ] Expense submission works
- [ ] Receipt upload functions
- [ ] Approval workflow operates
- [ ] Financial reports generate
- [ ] Export features work
- [ ] Mobile responsiveness
- [ ] Security headers are set
- [ ] HTTPS is enforced

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Vercel deployment logs
3. Check Supabase logs and metrics
4. Verify environment variables
5. Test in incognito/private browsing mode

Your Logan Freights expense management system should now be fully deployed and operational on Vercel with Supabase integration!