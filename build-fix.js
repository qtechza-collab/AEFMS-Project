#!/usr/bin/env node

// Logan Freights Build Fix Script
// Ensures correct output directory for Vercel deployment

const fs = require('fs');
const path = require('path');

console.log('🔧 Logan Freights Build Fix Script');
console.log('==================================');

// Check if build directory exists and clean it up
const buildDir = path.join(__dirname, 'build');
const distDir = path.join(__dirname, 'dist');

if (fs.existsSync(buildDir)) {
  console.log('⚠️ Found incorrect build/ directory, cleaning up...');
  try {
    fs.rmSync(buildDir, { recursive: true, force: true });
    console.log('✅ Cleaned up build/ directory');
  } catch (error) {
    console.error('❌ Failed to clean build/ directory:', error.message);
  }
}

if (fs.existsSync(distDir)) {
  console.log('🧹 Cleaning existing dist/ directory...');
  try {
    fs.rmSync(distDir, { recursive: true, force: true });
    console.log('✅ Cleaned up dist/ directory');
  } catch (error) {
    console.error('❌ Failed to clean dist/ directory:', error.message);
  }
}

// Verify Vite config
const viteConfigPath = path.join(__dirname, 'vite.config.ts');
if (fs.existsSync(viteConfigPath)) {
  const viteConfig = fs.readFileSync(viteConfigPath, 'utf8');
  if (viteConfig.includes("outDir: 'dist'")) {
    console.log('✅ Vite config correctly set to output to dist/');
  } else {
    console.log('⚠️ Vite config may have incorrect outDir setting');
  }
} else {
  console.log('❌ Vite config not found');
}

// Verify Vercel config
const vercelConfigPath = path.join(__dirname, 'vercel.json');
if (fs.existsSync(vercelConfigPath)) {
  const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));
  if (vercelConfig.outputDirectory === 'dist') {
    console.log('✅ Vercel config correctly set to expect dist/');
  } else {
    console.log('⚠️ Vercel config outputDirectory:', vercelConfig.outputDirectory);
  }
} else {
  console.log('❌ Vercel config not found');
}

console.log('\n🚀 Ready for deployment!');
console.log('Next steps:');
console.log('1. Push changes to GitHub');
console.log('2. Trigger new Vercel deployment');
console.log('3. Files should now build to dist/ directory correctly');
