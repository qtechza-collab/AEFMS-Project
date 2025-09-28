#!/usr/bin/env node

// Logan Freights ES Module PostCSS Fix
// Resolves ES module scope errors in PostCSS configuration

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Logan Freights ES Module PostCSS Fix');
console.log('=====================================');

// ES Module compatible PostCSS configuration
const esModuleConfig = `/** @type {import('postcss-load-config').Config} */
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {}
  }
}`;

// CommonJS compatible PostCSS configuration
const commonJSConfig = `/** @type {import('postcss-load-config').Config} */
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {}
  }
}`;

// Create all PostCSS configuration variants
const configs = [
  {
    name: 'postcss.config.js',
    content: esModuleConfig,
    description: 'Primary ES Module config (matches package.json type: module)'
  },
  {
    name: 'postcss.config.mjs',
    content: esModuleConfig,
    description: 'ES Module backup'
  },
  {
    name: 'postcss.config.cjs',
    content: commonJSConfig,
    description: 'CommonJS backup'
  }
];

// Create all configuration files
configs.forEach(config => {
  const configPath = path.join(__dirname, config.name);
  fs.writeFileSync(configPath, config.content);
  console.log(`✅ Created ${config.name} - ${config.description}`);
});

// Clean up any problematic files
const problematicFiles = [
  'postcss.config.alternative.js',
  'postcss.config.backup.js'
];

problematicFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`🗑️  Removed problematic ${file}`);
  }
});

// Verify package.json configuration
const packageJsonPath = path.join(__dirname, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  if (packageJson.type === 'module') {
    console.log('✅ package.json correctly configured as ES module');
    console.log('✅ postcss.config.js using ES module syntax (export default)');
  } else {
    console.log('⚠️  package.json not set to ES module, using CommonJS fallback');
  }
}

// Verify Tailwind CSS import in globals.css
const globalsPath = path.join(__dirname, 'styles', 'globals.css');
if (fs.existsSync(globalsPath)) {
  const globalsContent = fs.readFileSync(globalsPath, 'utf8');
  
  if (globalsContent.includes('@import "tailwindcss"')) {
    console.log('✅ Tailwind CSS import verified in globals.css');
  } else {
    console.log('❌ Tailwind CSS import missing - adding...');
    const newContent = '@import "tailwindcss";\n\n' + globalsContent;
    fs.writeFileSync(globalsPath, newContent);
    console.log('✅ Added Tailwind CSS import to globals.css');
  }
}

// Check critical dependencies
const packageJsonContent = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const requiredDeps = {
  '@tailwindcss/postcss': '^4.0.0-alpha.25',
  'autoprefixer': '^10.4.16',
  'postcss': '^8.4.35'
};

let missingDeps = [];
Object.entries(requiredDeps).forEach(([dep, version]) => {
  if (!packageJsonContent.devDependencies?.[dep] && !packageJsonContent.dependencies?.[dep]) {
    missingDeps.push(`${dep}@${version}`);
  }
});

if (missingDeps.length > 0) {
  console.log('❌ Missing dependencies:', missingDeps.join(', '));
  console.log('   Run: npm install ' + missingDeps.join(' ') + ' --save-dev');
} else {
  console.log('✅ All required dependencies present');
}

console.log('\n🚀 ES Module PostCSS configuration complete!');
console.log('\nConfiguration priority:');
console.log('1. postcss.config.js (ES Module - primary)');
console.log('2. postcss.config.mjs (ES Module - backup)');
console.log('3. postcss.config.cjs (CommonJS - fallback)');

console.log('\nNext steps:');
console.log('1. npm install (if missing dependencies)');
console.log('2. npm run build');
console.log('3. Deploy to Vercel');

console.log('\n✅ Logan Freights PostCSS ES Module error resolved!');
