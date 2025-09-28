#!/usr/bin/env node

// Logan Freights Deployment Troubleshooting Script
// Comprehensive deployment issue checker for Vercel + Supabase

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Logan Freights Deployment Troubleshooting');
console.log('==============================================');
console.log('Checking for common build and deployment issues...\n');

let errorCount = 0;
let warningCount = 0;

const logError = (message) => {
  console.log(`❌ ERROR: ${message}`);
  errorCount++;
};

const logWarning = (message) => {
  console.log(`⚠️  WARNING: ${message}`);
  warningCount++;
};

const logSuccess = (message) => {
  console.log(`✅ ${message}`);
};

const logInfo = (message) => {
  console.log(`ℹ️  INFO: ${message}`);
};

// Check critical files
console.log('📁 Checking critical files:');
const criticalFiles = [
  { file: 'main.tsx', required: true },
  { file: 'App.tsx', required: true },
  { file: 'index.html', required: true },
  { file: 'vite.config.ts', required: true },
  { file: 'package.json', required: true },
  { file: 'vercel.json', required: false },
  { file: 'tsconfig.json', required: true },
  { file: 'postcss.config.js', required: true },
  { file: 'styles/globals.css', required: true }
];

criticalFiles.forEach(({ file, required }) => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    logSuccess(`${file} exists`);
  } else {
    if (required) {
      logError(`${file} MISSING! This is required for deployment.`);
    } else {
      logWarning(`${file} missing (optional)`);
    }
  }
});

// Check node_modules and key dependencies
console.log('\n📦 Checking dependencies:');
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
  logSuccess('node_modules directory exists');
  
  const keyDeps = [
    'react',
    'react-dom',
    'vite',
    '@vitejs/plugin-react',
    '@supabase/supabase-js',
    'tailwindcss',
    'typescript',
    'lucide-react',
    '@radix-ui/react-dialog',
    'sonner'
  ];
  
  keyDeps.forEach(dep => {
    const depPath = path.join(nodeModulesPath, dep);
    if (fs.existsSync(depPath)) {
      logSuccess(`${dep} installed`);
    } else {
      logError(`${dep} MISSING! Run: npm install`);
    }
  });
} else {
  logError('node_modules directory missing! Run: npm install');
}

// Check package.json configuration
console.log('\n📋 Checking package.json:');
try {
  const packageJsonPath = path.join(__dirname, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Check module type
    if (packageJson.type === 'module') {
      logSuccess('Package type is set to "module"');
    } else {
      logWarning('Package type not set to "module" - may cause issues');
    }
    
    // Check scripts
    if (packageJson.scripts && packageJson.scripts.build) {
      logSuccess('Build script exists');
      if (packageJson.scripts.build.includes('vite build')) {
        logSuccess('Build script uses Vite');
      } else {
        logWarning('Build script may not use Vite correctly');
      }
    } else {
      logError('Build script missing!');
    }
    
    // Check engines
    if (packageJson.engines && packageJson.engines.node) {
      logInfo(`Node version requirement: ${packageJson.engines.node}`);
    } else {
      logWarning('No Node.js engine requirement specified');
    }
    
    // Check key dependencies
    if (packageJson.dependencies) {
      const deps = packageJson.dependencies;
      
      // Check Sonner version
      if (deps.sonner) {
        if (deps.sonner.includes('2.0') || deps.sonner.includes('^2.')) {
          logSuccess(`Sonner version: ${deps.sonner}`);
        } else {
          logWarning(`Sonner version may be incompatible: ${deps.sonner} (should be ^2.0.3)`);
        }
      }
      
      // Check React version
      if (deps.react && deps['react-dom']) {
        logSuccess(`React versions: ${deps.react} / ${deps['react-dom']}`);
      } else {
        logError('React or React-DOM missing from dependencies');
      }
    }
  }
} catch (error) {
  logError(`Error reading package.json: ${error.message}`);
}

// Check Vite configuration
console.log('\n⚙️  Checking Vite configuration:');
try {
  const viteConfigPath = path.join(__dirname, 'vite.config.ts');
  if (fs.existsSync(viteConfigPath)) {
    const viteConfig = fs.readFileSync(viteConfigPath, 'utf8');
    
    // Check output directory
    if (viteConfig.includes("outDir: 'dist'")) {
      logSuccess('Vite config output directory set to "dist"');
    } else {
      logWarning('Vite config output directory may be incorrect');
    }
    
    // Check for plugins
    if (viteConfig.includes('@vitejs/plugin-react')) {
      logSuccess('React plugin configured');
    } else {
      logError('React plugin missing from Vite config');
    }
    
    // Check for manual chunks (potential issue)
    if (viteConfig.includes('manualChunks')) {
      if (viteConfig.includes('manualChunks: {') || viteConfig.includes('manualChunks: (')) {
        logSuccess('Manual chunks configuration present');
      } else {
        logWarning('Manual chunks configuration may be malformed');
      }
    }
    
    // Check for problematic patterns
    if (viteConfig.includes('@') && viteConfig.includes('node_modules')) {
      logWarning('Potential issue with versioned imports in Vite config');
    }
  }
} catch (error) {
  logError(`Error reading vite.config.ts: ${error.message}`);
}

// Check TypeScript configuration
console.log('\n🔷 Checking TypeScript configuration:');
try {
  const tsconfigPath = path.join(__dirname, 'tsconfig.json');
  if (fs.existsSync(tsconfigPath)) {
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
    
    if (tsconfig.compilerOptions) {
      if (tsconfig.compilerOptions.moduleResolution) {
        logSuccess(`Module resolution: ${tsconfig.compilerOptions.moduleResolution}`);
      }
      
      if (tsconfig.compilerOptions.target) {
        logSuccess(`Target: ${tsconfig.compilerOptions.target}`);
      }
      
      if (tsconfig.compilerOptions.jsx) {
        logSuccess(`JSX: ${tsconfig.compilerOptions.jsx}`);
      }
    }
  }
} catch (error) {
  logError(`Error reading tsconfig.json: ${error.message}`);
}

// Check Vercel configuration
console.log('\n🚀 Checking Vercel configuration:');
const vercelConfigPath = path.join(__dirname, 'vercel.json');
if (fs.existsSync(vercelConfigPath)) {
  try {
    const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));
    
    if (vercelConfig.outputDirectory) {
      if (vercelConfig.outputDirectory === 'dist') {
        logSuccess('Vercel output directory correctly set to "dist"');
      } else {
        logWarning(`Vercel output directory: ${vercelConfig.outputDirectory} (should be "dist")`);
      }
    } else {
      logInfo('Vercel output directory not explicitly set (using default)');
    }
    
    if (vercelConfig.buildCommand) {
      logInfo(`Vercel build command: ${vercelConfig.buildCommand}`);
    }
    
    if (vercelConfig.framework) {
      logInfo(`Vercel framework: ${vercelConfig.framework}`);
    }
  } catch (error) {
    logError(`Error parsing vercel.json: ${error.message}`);
  }
} else {
  logWarning('No vercel.json found (using defaults)');
}

// Check environment variables
console.log('\n🌍 Checking environment setup:');
const envFiles = ['.env', '.env.local', '.env.production', 'env.local'];
let envFound = false;

envFiles.forEach(envFile => {
  const envPath = path.join(__dirname, envFile);
  if (fs.existsSync(envPath)) {
    logSuccess(`${envFile} exists`);
    envFound = true;
    
    try {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const hasSupabaseUrl = envContent.includes('VITE_SUPABASE_URL');
      const hasSupabaseKey = envContent.includes('VITE_SUPABASE_ANON_KEY');
      
      if (hasSupabaseUrl) logSuccess('Supabase URL configured');
      if (hasSupabaseKey) logSuccess('Supabase key configured');
      
      if (!hasSupabaseUrl || !hasSupabaseKey) {
        logWarning('Supabase configuration may be incomplete');
      }
    } catch (error) {
      logWarning(`Error reading ${envFile}: ${error.message}`);
    }
  }
});

if (!envFound) {
  logWarning('No environment files found - check Vercel environment variables');
}

// Check UI components
console.log('\n🎨 Checking UI components:');
const uiPath = path.join(__dirname, 'components', 'ui');
if (fs.existsSync(uiPath)) {
  const uiFiles = fs.readdirSync(uiPath);
  const importantComponents = ['button.tsx', 'dialog.tsx', 'card.tsx', 'form.tsx'];
  
  logSuccess(`UI components directory exists (${uiFiles.length} files)`);
  
  importantComponents.forEach(component => {
    if (uiFiles.includes(component)) {
      logSuccess(`${component} exists`);
    } else {
      logWarning(`${component} missing`);
    }
  });
  
  // Check for version issues in UI components
  const sonnerPath = path.join(uiPath, 'sonner.tsx');
  if (fs.existsSync(sonnerPath)) {
    const sonnerContent = fs.readFileSync(sonnerPath, 'utf8');
    if (sonnerContent.includes('sonner@2.0.3')) {
      logSuccess('Sonner component uses correct version');
    } else if (sonnerContent.includes('@')) {
      logWarning('Sonner component may have version issues');
    }
  }
} else {
  logError('UI components directory missing!');
}

// Check for common build issues
console.log('\n🔧 Checking for common build issues:');

// Check for import issues
const searchForVersionedImports = (dir) => {
  if (!fs.existsSync(dir)) return [];
  
  const issues = [];
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  files.forEach(file => {
    if (file.isDirectory() && file.name !== 'node_modules') {
      issues.push(...searchForVersionedImports(path.join(dir, file.name)));
    } else if (file.name.endsWith('.tsx') || file.name.endsWith('.ts')) {
      try {
        const content = fs.readFileSync(path.join(dir, file.name), 'utf8');
        if (content.includes('@') && content.includes('from ') && 
            /from ['"][^'"]*@\d+\.\d+/.test(content)) {
          issues.push(path.join(dir, file.name));
        }
      } catch (error) {
        // Ignore read errors
      }
    }
  });
  
  return issues;
};

const versionedImports = searchForVersionedImports(__dirname);
if (versionedImports.length > 0) {
  logWarning(`Found ${versionedImports.length} files with versioned imports:`);
  versionedImports.slice(0, 5).forEach(file => {
    logWarning(`  ${path.relative(__dirname, file)}`);
  });
  if (versionedImports.length > 5) {
    logWarning(`  ... and ${versionedImports.length - 5} more`);
  }
} else {
  logSuccess('No versioned import issues found');
}

// Environment information
console.log('\n📊 Environment information:');
logInfo(`Node.js version: ${process.version}`);
logInfo(`Current working directory: ${process.cwd()}`);
logInfo(`NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
logInfo(`Platform: ${process.platform}`);

// Summary
console.log('\n📈 Summary:');
console.log('==========');
logInfo(`Total errors: ${errorCount}`);
logInfo(`Total warnings: ${warningCount}`);

if (errorCount === 0 && warningCount === 0) {
  console.log('\n🎉 All checks passed! Your project should deploy successfully.');
} else if (errorCount === 0) {
  console.log('\n✅ No critical errors found. Warnings should be reviewed but won\'t prevent deployment.');
} else {
  console.log('\n🚨 Critical errors found! These must be fixed before deployment.');
}

console.log('\n🚀 Next steps:');
console.log('1. Fix any critical errors shown above');
console.log('2. Review and address warnings');
console.log('3. Run: npm install (if dependencies are missing)');
console.log('4. Run: npm run build (to test build)');
console.log('5. Deploy: git push origin main');

console.log('\n💡 For Supabase issues, check: SUPABASE_ERROR_SOLUTIONS.md');
console.log('💡 For build issues, check: ROLLUP_ERROR_FIX.md');
console.log('💡 For deployment guide, check: COMPLETE_DEPLOYMENT_GUIDE.md');

// Exit with appropriate code
process.exit(errorCount > 0 ? 1 : 0);
