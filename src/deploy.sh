#!/bin/bash

# Logan Freights Deployment Script
# This script ensures clean deployment to Vercel

echo "🚀 Logan Freights Expense System - Deployment Script"
echo "=================================================="

# Set Node version (Vercel compatible)
export NODE_VERSION="18.18.0"
export NODE_ENV="production"

# Clean any existing builds
echo "🧹 Cleaning previous builds..."
rm -rf dist/
rm -rf node_modules/
rm -f package-lock.json

# Fresh install with legacy peer deps
echo "📦 Installing dependencies..."
npm install --legacy-peer-deps --no-fund --no-audit

# Generate fresh lock file
echo "🔒 Generating package-lock.json..."
npm install --package-lock-only

# Type check
echo "✅ Running type check..."
npx tsc --noEmit

# Build the application
echo "🏗️  Building application..."
npm run build

echo "✅ Build completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Push changes to GitHub:"
echo "   git add ."
echo "   git commit -m \"Fix: Resolve npm ci deployment issue\""
echo "   git push origin main"
echo ""
echo "2. Vercel will auto-deploy with the new configuration"
echo ""
echo "🎯 Build output in: ./dist/"
echo "📊 Build size: $(du -sh dist/ 2>/dev/null || echo 'Unknown')"