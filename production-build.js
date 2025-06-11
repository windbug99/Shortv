#!/usr/bin/env node
// Production build script for deployment
import { execSync } from 'child_process';
import fs from 'fs';

console.log('🚀 Starting deployment build...');

// Clean dist directory
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}
fs.mkdirSync('dist', { recursive: true });

// Build server bundle with deployment optimizations
console.log('📦 Building server bundle...');
try {
  execSync('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js --alias:@shared=./shared --define:process.env.NODE_ENV=\\"production\\"', {
    stdio: 'inherit'
  });
} catch (error) {
  console.error('❌ Server build failed:', error.message);
  process.exit(1);
}

// Create production package.json
console.log('📄 Creating production package.json...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const prodPackageJson = {
  name: packageJson.name,
  version: packageJson.version,
  type: packageJson.type,
  scripts: {
    start: "NODE_ENV=production node index.js"
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

// Copy client files for development serving
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
console.log('✅ Production build ready for deployment');