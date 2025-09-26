#!/bin/bash

echo "🧹 Cleaning Logan Freights project for fresh deployment..."

# Remove all node modules and lock files
rm -rf node_modules
rm -f package-lock.json
rm -f yarn.lock
rm -f pnpm-lock.yaml

# Clear npm cache
npm cache clean --force

# Ensure we're using the correct registry
npm config set registry https://registry.npmjs.org/

echo "📦 Installing dependencies with correct Supabase package..."

# Install dependencies
npm install

echo "🔍 Verifying Supabase installation..."
npm list @supabase/supabase-js

echo "🏗️ Building project..."
npm run build

echo "✅ Clean installation complete! Ready for deployment."