# Production Setup Instructions for Logan Freights

## Step 1: Database Schema Setup

You need to run the database schema in your Supabase project to create all the necessary tables and functions.

### Manual Setup:
1. Go to your Supabase project: https://supabase.com/dashboard/project/lrwfehxhophofxcxohsc
2. Navigate to **SQL Editor** in the left sidebar
3. Copy the entire contents of `/supabase/schema.sql` from this project
4. Paste it into the SQL Editor
5. Click **Run** to execute the schema

### What this creates:
- **Users table** - Employee profiles and roles
- **Expense claims table** - All expense submissions
- **Notifications table** - System notifications
- **Recent activities table** - Activity tracking
- **Company financials table** - Financial data storage
- **Expense categories table** - Expense categorization
- **File uploads table** - Receipt and document storage
- **Email logs table** - Email tracking
- **Audit logs table** - System audit trail

## Step 2: Verify Connection

After running the schema, your system should automatically detect the production Supabase connection and switch from demo mode to production mode.

### Test User Accounts Created:
- **Employee**: `employee.dummy@loganfreights.co.za` / Password: `Employee123!`
- **Manager**: `manager.dummy@loganfreights.co.za` / Password: `Manager123!`
- **HR**: `hr.dummy@loganfreights.co.za` / Password: `HR123!`
- **Admin**: `admin@loganfreights.co.za` / Password: `Admin123!`

## Step 3: Storage Buckets

The schema will create these storage buckets automatically:
- `logan-receipts` - For expense receipts
- `logan-profiles` - For user profile photos  
- `logan-financials` - For financial documents

## Step 4: Environment Variables for Deployment

For Vercel deployment, set these environment variables:

```
VITE_SUPABASE_URL=https://lrwfehxhophofxcxohsc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxyd2ZlaHhob3Bob2Z4Y3hvaHNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3NDEyMTUsImV4cCI6MjA3NDMxNzIxNX0.2b_7XMuBs1uUD-qlm1Qz6z88mB2o4QhMiTv0bwH5dFQ
NODE_ENV=production
```

## Step 5: Features Available in Production

✅ **User Authentication** - Full login/logout with role-based access
✅ **Expense Management** - Submit, approve, reject expense claims
✅ **Receipt Upload** - Upload and view receipt images
✅ **Financial Analytics** - Real-time expense analytics and reporting
✅ **Fraud Detection** - Automated fraud detection and flagging
✅ **IFRS Compliance** - South African accounting compliance
✅ **Email Notifications** - Automated email notifications
✅ **Audit Logging** - Complete audit trail of all actions
✅ **File Storage** - Secure cloud file storage
✅ **Multi-role Dashboards** - Employee, Manager, HR, Admin dashboards

## Next Steps

1. Run the SQL schema in your Supabase project
2. Test login with the demo accounts
3. Deploy to Vercel with the environment variables
4. Add real employees through the Admin dashboard
5. Configure any additional settings as needed

## Support

If you encounter any issues:
1. Check the browser console for errors
2. Verify the SQL schema ran successfully
3. Confirm environment variables are set correctly
4. Test the Supabase connection in the dashboard