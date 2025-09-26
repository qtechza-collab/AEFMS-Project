#!/usr/bin/env node

/**
 * Build Verification Script for Logan Freights
 * Checks for common build issues before deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Logan Freights build configuration...\n');

// Check for missing imports
function checkMissingImports() {
  console.log('1. Checking for missing imports...');
  
  const employeeDashboard = fs.readFileSync('./components/EmployeeDashboard.tsx', 'utf8');
  
  if (employeeDashboard.includes('enhancedClaimsDataService')) {
    console.log('❌ Found reference to missing enhancedClaimsDataService');
    return false;
  }
  
  console.log('✅ No missing imports found');
  return true;
}

// Check for duplicate methods
function checkDuplicateMethods() {
  console.log('2. Checking for duplicate methods...');
  
  const dataService = fs.readFileSync('./utils/supabaseDataService.ts', 'utf8');
  
  const createClaimMatches = dataService.match(/async createClaim\(/g);
  if (createClaimMatches && createClaimMatches.length > 1) {
    console.log(`❌ Found ${createClaimMatches.length} createClaim methods (should be 1)`);
    return false;
  }
  
  console.log('✅ No duplicate methods found');
  return true;
}

// Check package.json for duplicates
function checkPackageJson() {
  console.log('3. Checking package.json...');
  
  const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
  const deps = packageJson.dependencies;
  
  // Check for duplicate supabase entries
  let supabaseCount = 0;
  Object.keys(deps).forEach(dep => {
    if (dep.includes('supabase')) {
      supabaseCount++;
    }
  });
  
  if (supabaseCount > 1) {
    console.log(`❌ Found ${supabaseCount} Supabase dependencies (should be 1)`);
    return false;
  }
  
  console.log('✅ Package.json looks good');
  return true;
}

// Check environment variables
function checkEnvVars() {
  console.log('4. Checking environment configuration...');
  
  const appTsx = fs.readFileSync('./App.tsx', 'utf8');
  
  if (!appTsx.includes('VITE_SUPABASE_URL') || !appTsx.includes('VITE_SUPABASE_ANON_KEY')) {
    console.log('❌ Missing environment variable checks');
    return false;
  }
  
  console.log('✅ Environment variable handling found');
  return true;
}

// Check file structure
function checkFileStructure() {
  console.log('5. Checking critical files...');
  
  const criticalFiles = [
    './App.tsx',
    './main.tsx',
    './package.json',
    './vercel.json',
    './components/LoginPage.tsx',
    './utils/supabaseDataService.ts',
    './utils/supabaseAuth.ts'
  ];
  
  for (const file of criticalFiles) {
    if (!fs.existsSync(file)) {
      console.log(`❌ Missing critical file: ${file}`);
      return false;
    }
  }
  
  console.log('✅ All critical files present');
  return true;
}

// Run all checks
async function runVerification() {
  const checks = [
    checkMissingImports,
    checkDuplicateMethods,
    checkPackageJson,
    checkEnvVars,
    checkFileStructure
  ];
  
  let allPassed = true;
  
  for (const check of checks) {
    if (!check()) {
      allPassed = false;
    }
    console.log('');
  }
  
  if (allPassed) {
    console.log('🎉 All checks passed! Ready for deployment to Vercel.');
    console.log('\n📋 Next steps:');
    console.log('   1. git add .');
    console.log('   2. git commit -m "Fix: Build errors resolved"');
    console.log('   3. git push origin main');
    console.log('   4. Vercel will auto-deploy');
  } else {
    console.log('❌ Some checks failed. Please fix the issues above before deploying.');
    process.exit(1);
  }
}

// Handle errors gracefully
process.on('uncaughtException', (err) => {
  console.log('❌ Verification failed with error:', err.message);
  process.exit(1);
});

runVerification();