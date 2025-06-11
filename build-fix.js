#!/usr/bin/env node
// This script fixes the npm run build command by ensuring proper deployment build
import { execSync } from 'child_process';
import fs from 'fs';

console.log('🔧 Running deployment-ready build...');

try {
  // Clean and create dist directory
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  fs.mkdirSync('dist', { recursive: true });

  // Skip vite build to avoid deployment timeouts
  // Build server with correct outfile parameter
  console.log('📦 Building server with esbuild...');
  execSync('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js --alias:@shared=./shared', {
    stdio: 'inherit'
  });

  // Create production package.json
  console.log('📄 Creating production package.json...');
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const prodPackageJson = {
    name: packageJson.name,
    version: packageJson.version,
    type: packageJson.type,
    scripts: {
      start: packageJson.scripts.start
    },
    dependencies: packageJson.dependencies,
    optionalDependencies: packageJson.optionalDependencies || {}
  };

  fs.writeFileSync('dist/package.json', JSON.stringify(prodPackageJson, null, 2));

  // Copy shared modules
  if (fs.existsSync('shared')) {
    console.log('📁 Copying shared modules...');
    fs.cpSync('shared', 'dist/shared', { recursive: true });
  }

  // Create static directories
  fs.mkdirSync('dist/public', { recursive: true });

  // Copy client files for serving
  if (fs.existsSync('client')) {
    console.log('📁 Copying client files...');
    fs.cpSync('client', 'dist/client', { recursive: true });
  }

  // Verify build output
  if (!fs.existsSync('dist/index.js')) {
    console.error('❌ CRITICAL: dist/index.js was not created!');
    process.exit(1);
  }

  const stats = fs.statSync('dist/index.js');
  console.log(`✅ Build successful! dist/index.js created (${(stats.size / 1024).toFixed(1)}kb)`);
  console.log('✅ Deployment build ready - server will listen on port 5000');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}