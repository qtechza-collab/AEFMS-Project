#!/usr/bin/env node

// Logan Freights PostCSS Immediate Fix
// Resolves PostCSS configuration syntax errors

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Logan Freights PostCSS Immediate Fix');
console.log('=====================================');

// Create all PostCSS configuration variants
const configs = [
  {
    name: 'postcss.config.js',
    content: `/** @type {import('postcss-load-config').Config} */
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {}
  }
}`
  },
  {
    name: 'postcss.config.cjs',
    content: `/** @type {import('postcss-load-config').Config} */
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {}
  }
}`
  },
  {
    name: 'postcss.config.mjs',
    content: `/** @type {import('postcss-load-config').Config} */
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {}
  }
}`
  }
];

// Create all configuration files
configs.forEach(config => {
  const configPath = path.join(__dirname, config.name);
  fs.writeFileSync(configPath, config.content);
  console.log(`✅ Created ${config.name}`);
});

// Remove problematic alternative config
const altConfigPath = path.join(__dirname, 'postcss.config.alternative.js');
if (fs.existsSync(altConfigPath)) {
  fs.unlinkSync(altConfigPath);
  console.log('🗑️  Removed problematic alternative config');
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

// Check package.json for required dependencies
const packageJsonPath = path.join(__dirname, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  const requiredDeps = {
    '@tailwindcss/postcss': '^4.0.0-alpha.25',
    'autoprefixer': '^10.4.16',
    'postcss': '^8.4.35'
  };
  
  let needsUpdate = false;
  Object.entries(requiredDeps).forEach(([dep, version]) => {
    if (!packageJson.devDependencies?.[dep]) {
      if (!packageJson.devDependencies) {
        packageJson.devDependencies = {};
      }
      packageJson.devDependencies[dep] = version;
      needsUpdate = true;
      console.log(`✅ Added ${dep} to devDependencies`);
    } else {
      console.log(`✅ ${dep} already present`);
    }
  });
  
  if (needsUpdate) {
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('✅ Updated package.json');
  }
}

console.log('\n🚀 PostCSS configuration fixed!');
console.log('Next steps:');
console.log('1. Run: npm install');
console.log('2. Try: npm run build');
console.log('3. Deploy: git push origin main');

console.log('\n📋 Created configurations:');
console.log('- postcss.config.js (CommonJS - primary)');
console.log('- postcss.config.cjs (CommonJS - backup)');
console.log('- postcss.config.mjs (ES Module - backup)');

console.log('\n✅ Logan Freights PostCSS error resolved!');
