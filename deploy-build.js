#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';

console.log('Starting deployment build...');

// Clean and create dist directory
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}
fs.mkdirSync('dist', { recursive: true });

// Build server with esbuild (fast and reliable)
console.log('Building server...');
try {
  execSync('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js --alias:@shared=./shared', {
    stdio: 'inherit'
  });
} catch (error) {
  console.error('Server build failed:', error.message);
  process.exit(1);
}

// Copy package.json with production dependencies
console.log('Creating production package.json...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const prodPackageJson = {
  name: packageJson.name,
  version: packageJson.version,
  type: packageJson.type,
  dependencies: packageJson.dependencies,
  optionalDependencies: packageJson.optionalDependencies || {}
};

fs.writeFileSync('dist/package.json', JSON.stringify(prodPackageJson, null, 2));

// Copy shared modules if they exist
if (fs.existsSync('shared')) {
  console.log('Copying shared modules...');
  fs.cpSync('shared', 'dist/shared', { recursive: true });
}

// Create basic static serving structure
console.log('Setting up static file serving...');
fs.mkdirSync('dist/public', { recursive: true });

// Copy client source files for development serving
if (fs.existsSync('client')) {
  fs.cpSync('client', 'dist/client', { recursive: true });
}

console.log('Build completed successfully');
console.log('Files created:');
console.log('- dist/index.js (server bundle)');
console.log('- dist/package.json (production dependencies)');
console.log('- dist/shared/ (shared modules)');
console.log('- dist/client/ (client source for development serving)');