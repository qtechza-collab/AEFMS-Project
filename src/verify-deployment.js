#!/usr/bin/env node

// Logan Freights Deployment Verification Script
console.log('🚀 Logan Freights Expense Management System - Deployment Verification');
console.log('===================================================================');

const fs = require('fs');
const path = require('path');

let errors = [];
let warnings = [];
let success = [];

// Check Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

if (majorVersion >= 22) {
  success.push(`✅ Node.js version: ${nodeVersion} (compatible)`);
} else if (majorVersion >= 18) {
  warnings.push(`⚠️ Node.js version: ${nodeVersion} (works but 22+ recommended)`);
} else {
  errors.push(`❌ Node.js version: ${nodeVersion} (too old, requires 18+)`);
}

// Check required files
const requiredFiles = [
  'package.json',
  'vercel.json',
  '.nvmrc',
  '.gitignore',
  'App.tsx',
  'utils/supabase/client.ts',
  'utils/supabase/info.tsx',
  'utils/env.ts'
];

requiredFiles.forEach(file => {
  if (fs.existsSync(path.join(__dirname, file))) {
    success.push(`✅ Required file exists: ${file}`);
  } else {
    errors.push(`❌ Missing required file: ${file}`);
  }
});

// Check package.json configuration
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  
  if (packageJson.engines && packageJson.engines.node) {
    success.push(`✅ Package.json engines configured: ${packageJson.engines.node}`);
  } else {
    warnings.push(`⚠️ Package.json missing engines field`);
  }

  if (packageJson.scripts && packageJson.scripts.build) {
    success.push(`✅ Build script configured`);
  } else {
    errors.push(`❌ Missing build script in package.json`);
  }

  if (packageJson.dependencies && packageJson.dependencies['@supabase/supabase-js']) {
    success.push(`✅ Supabase dependency configured`);
  } else {
    errors.push(`❌ Missing Supabase dependency`);
  }

} catch (error) {
  errors.push(`❌ Error reading package.json: ${error.message}`);
}

// Check vercel.json configuration
try {
  const vercelJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'vercel.json'), 'utf8'));
  
  if (vercelJson.nodeVersion) {
    success.push(`✅ Vercel Node.js version configured: ${vercelJson.nodeVersion}`);
  } else {
    warnings.push(`⚠️ Vercel Node.js version not explicitly set`);
  }

  if (vercelJson.buildCommand) {
    success.push(`✅ Vercel build command configured: ${vercelJson.buildCommand}`);
  } else {
    warnings.push(`⚠️ Vercel build command not configured`);
  }

  if (vercelJson.regions && vercelJson.regions.includes('iad1')) {
    success.push(`✅ Production region (iad1 - Washington D.C.) configured - optimal for global access`);
  } else if (vercelJson.regions && vercelJson.regions.length > 0) {
    success.push(`✅ Vercel region configured: ${vercelJson.regions.join(', ')}`);
  } else {
    warnings.push(`⚠️ No specific region configured - will use Vercel default`);
  }

} catch (error) {
  errors.push(`❌ Error reading vercel.json: ${error.message}`);
}

// Check .nvmrc
try {
  const nvmrc = fs.readFileSync(path.join(__dirname, '.nvmrc'), 'utf8').trim();
  const nvmrcVersion = parseInt(nvmrc);
  
  if (nvmrcVersion >= 22) {
    success.push(`✅ .nvmrc configured for Node.js ${nvmrc}`);
  } else if (nvmrcVersion >= 18) {
    warnings.push(`⚠️ .nvmrc version ${nvmrc} works but 22+ recommended`);
  } else {
    errors.push(`❌ .nvmrc version ${nvmrc} too old`);
  }
} catch (error) {
  errors.push(`❌ Error reading .nvmrc: ${error.message}`);
}

// Check environment template
if (fs.existsSync(path.join(__dirname, '.env.example'))) {
  success.push(`✅ Environment template (.env.example) exists`);
} else {
  warnings.push(`⚠️ Consider creating .env.example for documentation`);
}

// Check if .env files are properly ignored
if (fs.existsSync(path.join(__dirname, '.gitignore'))) {
  const gitignore = fs.readFileSync(path.join(__dirname, '.gitignore'), 'utf8');
  if (gitignore.includes('.env')) {
    success.push(`✅ Environment files properly ignored in git`);
  } else {
    errors.push(`❌ Environment files not ignored in .gitignore`);
  }
} else {
  errors.push(`❌ Missing .gitignore file`);
}

// Check Supabase connection info
try {
  const supabaseInfo = require('./utils/supabase/info.tsx');
  if (supabaseInfo.projectId && supabaseInfo.publicAnonKey) {
    success.push(`✅ Supabase connection info configured`);
  } else {
    errors.push(`❌ Supabase connection info incomplete`);
  }
} catch (error) {
  errors.push(`❌ Error loading Supabase info: ${error.message}`);
}

// Summary
console.log('\n📊 DEPLOYMENT VERIFICATION RESULTS');
console.log('==================================');

if (success.length > 0) {
  console.log('\n✅ SUCCESS:');
  success.forEach(msg => console.log(msg));
}

if (warnings.length > 0) {
  console.log('\n⚠️ WARNINGS:');
  warnings.forEach(msg => console.log(msg));
}

if (errors.length > 0) {
  console.log('\n❌ ERRORS:');
  errors.forEach(msg => console.log(msg));
}

console.log('\n📋 DEPLOYMENT READINESS:');
if (errors.length === 0) {
  console.log('🎉 LOGAN FREIGHTS SYSTEM READY FOR DEPLOYMENT! No critical errors found.');
  console.log('\n🚀 Next steps:');
  console.log('1. Push to GitHub');
  console.log('2. Deploy to Vercel (Washington D.C. region)');
  console.log('3. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel environment variables');
  console.log('4. System will be accessible globally with London Supabase backend');
  process.exit(0);
} else {
  console.log('🚫 NOT READY FOR DEPLOYMENT! Please fix the errors above.');
  process.exit(1);
}
