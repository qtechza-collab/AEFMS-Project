# Logan Freights Production Deployment Guide

## 🎉 SUPABASE CONNECTED!

Your Logan Freights system is now connected to Supabase:

**Project URL:** https://lrwfehxhophofxcxohsc.supabase.co
**Project ID:** lrwfehxhophofxcxohsc
**Status:** ✅ Connected and Ready

## Prerequisites

### ✅ 1. Supabase Project Setup - COMPLETED
Your Supabase project is configured with:
- Project URL: https://lrwfehxhophofxcxohsc.supabase.co
- Anon Key: Configured ✅
- Service Role Key: Available for admin operations ✅

### 2. Environment Variables - CONFIGURED
The following environment variables are set:

```bash
VITE_SUPABASE_URL=https://lrwfehxhophofxcxohsc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxyd2ZlaHhob3Bob2Z4Y3hvaHNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3NDEyMTUsImV4cCI6MjA3NDMxNzIxNX0.2b_7XMuBs1uUD-qlm1Qz6z88mB2o4QhMiTv0bwH5dFQ
NODE_ENV=production
```

## 🚀 IMMEDIATE DEPLOYMENT STEPS

### Step 1: Database Setup - REQUIRED
**This is the only step needed to make your system fully functional:**

1. Go to your Supabase project: [Open SQL Editor](https://supabase.com/dashboard/project/lrwfehxhophofxcxohsc/sql)
2. Copy the entire contents of `/supabase/schema.sql` from this project
3. Paste it into the SQL Editor and click **Run**
4. ✅ This creates all tables, functions, policies, and demo users

**IMPORTANT:** The schema uses `$` syntax which is compatible with Supabase SQL Editor.

### Step 2: Storage Setup
1. In Supabase dashboard, go to **Storage**
2. The schema will automatically create these buckets:
   - `logan-receipts` (for expense receipts)
   - `logan-profiles` (for user profile photos)
   - `logan-financials` (for financial documents)

### Step 3: Vercel Deployment

#### Option A: Deploy with Vercel CLI (Recommended)
```bash
# Install Vercel CLI if you haven't
npm install -g vercel

# Login to Vercel
vercel login

# Deploy the project
vercel --prod

# Add environment variables
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel env add NODE_ENV

# Redeploy with environment variables
vercel --prod
```

#### Option B: Deploy via Vercel Dashboard
1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **Import Project**
3. Import your GitHub repository
4. In **Environment Variables**, add:
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key
   - `NODE_ENV`: `production`
5. Click **Deploy**

### Step 4: Test Login - READY NOW!
**You can test the system immediately with these credentials:**

- **Employee**: `employee.dummy@loganfreights.co.za` / `Employee123!`
- **Manager**: `manager.dummy@loganfreights.co.za` / `Manager123!`  
- **HR**: `hr.dummy@loganfreights.co.za` / `HR123!`
- **Admin**: `admin@loganfreights.co.za` / `Admin123!`

**Note:** After running the SQL schema, the system will automatically detect production mode and disable demo mode.

## Package Management

### npm ci vs npm install

**We use `npm ci` for production deployments because:**

- **npm ci**: 
  - Installs dependencies from `package-lock.json` exactly
  - Faster than `npm install` (up to 2x faster)
  - More reliable for production builds
  - Requires `package-lock.json` file (✅ included)
  - Used by default in our `vercel.json`

- **npm install**: 
  - Generates new `package-lock.json` if missing
  - Slower but more flexible
  - Use for development or if package-lock.json is missing

### Vercel Build Process
Vercel automatically:
1. Detects Node.js version from `package.json` engines field
2. Runs `npm ci` (as specified in `vercel.json`)
3. Runs `npm run build` (TypeScript compilation + Vite build)
4. Serves static files from `dist/` directory

## Authentication Flow

### User Registration
New users must be registered through the admin dashboard:
1. Login as administrator
2. Go to Admin Dashboard → User Management
3. Add new employees with their details and roles
4. System generates secure credentials

### Password Management
- Initial passwords are set by administrators
- Users can change passwords through their profile settings
- Password reset functionality available through Supabase auth

## Production Features

### Security Features
- Row Level Security (RLS) enabled on all tables
- Role-based access control
- Secure file upload with type validation
- CSRF protection headers
- Content Security Policy headers

### Performance Optimizations
- CDN deployment via Vercel Edge Network
- South African regions prioritized (IAD1)
- Optimized bundle sizes with Vite
- Lazy loading for large components
- Efficient database indexing

### Monitoring & Logging
- Error tracking in browser console
- Audit logs for all database changes
- User activity tracking
- Performance metrics via Vercel Analytics

## Maintenance

### Database Maintenance
Run the cleanup function monthly:
```sql
SELECT cleanup_old_data();
```

### Backup Strategy
1. Enable Supabase automatic backups (recommended)
2. Export important data regularly via admin dashboard
3. Store financial documents in secure cloud storage

## Support

### Production Issues
1. Check Vercel deployment logs
2. Verify environment variables are set correctly
3. Test Supabase connection from SQL editor
4. Check browser console for client-side errors

### Common Issues
- **"Demo mode" message**: Environment variables not set correctly
- **Database connection errors**: Check Supabase project status
- **Build failures**: Ensure all dependencies are listed in package.json
- **Authentication issues**: Verify RLS policies in Supabase

## Regional Considerations (South Africa)

### Internet Optimization
- Vercel Edge Network serves from Johannesburg (JNB1) and Cape Town (IAD1)
- Images optimized for slower connections
- Lazy loading implemented for better performance
- Offline-first approach for expense submissions

### Compliance
- IFRS-compliant financial reporting
- South African Rand (ZAR) as default currency
- Local date/time formatting
- GDPR-compliant data handling

### Business Hours
- Default timezone: SAST (GMT+2)
- Business hours: 08:00 - 17:00 SAST
- Automated reminders and notifications respect local business hours
