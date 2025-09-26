# Quick Deploy Reference - Logan Freights

## 🚀 Essential Commands

### Git Deployment
```bash
# Commit and push changes
git add .
git commit -m "Production deployment ready"
git push origin main
```

### Local Testing
```bash
# Install dependencies
npm install --legacy-peer-deps

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment Variables (Vercel)
```
VITE_SUPABASE_URL=https://lrwfehxhophofxcxohsc.supabase.co
VITE_SUPABASE_ANON_KEY=[your-anon-key]
NODE_ENV=production
```

## 🔧 Key Configuration Files

### `.npmrc`
```
legacy-peer-deps=true
fund=false
audit=false
package-lock=true
```

### `vercel.json` (key settings)
```json
{
  "installCommand": "npm install --legacy-peer-deps --no-audit --no-fund",
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}
```

## 📋 Deployment Checklist

### Pre-Deploy
- [ ] All files committed to git
- [ ] Environment variables set in Vercel
- [ ] Supabase database schema deployed
- [ ] RLS policies configured

### Post-Deploy
- [ ] App loads at Vercel URL
- [ ] Authentication works
- [ ] Database connections active
- [ ] File uploads functional
- [ ] All user roles tested

## 🚨 Emergency Commands

### If Build Fails
```bash
# Clean and reinstall
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps

# Force fresh deployment
git commit --allow-empty -m "Force redeploy"
git push
```

### Quick Debug
```
# Check health endpoint
https://your-app.vercel.app/health.html

# View browser console
F12 → Console → Look for Logan Freights logs

# Check sessionStorage errors
sessionStorage.getItem('logan-errors')
```

## 🎯 Test URLs After Deploy

- **Login**: `https://your-app.vercel.app/`
- **Health Check**: `https://your-app.vercel.app/health.html`
- **Employee Dashboard**: Login as employee role
- **Manager Dashboard**: Login as manager role
- **HR Dashboard**: Login as hr role
- **Admin Dashboard**: Login as administrator role

## 💡 Pro Tips

1. **Always test locally first**: `npm run build && npm run preview`
2. **Use incognito mode** for testing auth flows
3. **Check Vercel logs** if deployment fails
4. **Monitor Supabase usage** after go-live
5. **Set up alerts** for critical errors

Ready to deploy your Logan Freights system! 🚛