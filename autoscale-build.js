#!/usr/bin/env node
// Autoscale-compatible build that bundles all dependencies
import { execSync } from 'child_process';
import fs from 'fs';

console.log('Creating autoscale-compatible build...');

try {
  // Clean dist directory
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  fs.mkdirSync('dist', { recursive: true });

  // Build with packages external for autoscale compatibility  
  console.log('Building server with external packages...');
  execSync(`esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js --alias:@shared=./shared --define:process.env.NODE_ENV=\\"production\\"`, {
    stdio: 'inherit'
  });

  // Create production package.json with all runtime dependencies
  const originalPackageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const packageJson = {
    name: originalPackageJson.name,
    version: originalPackageJson.version,
    type: originalPackageJson.type,
    scripts: {
      start: "node index.js"
    },
    dependencies: originalPackageJson.dependencies,
    optionalDependencies: originalPackageJson.optionalDependencies || {}
  };

  fs.writeFileSync('dist/package.json', JSON.stringify(packageJson, null, 2));

  // Copy shared schema separately since it's aliased
  if (fs.existsSync('shared')) {
    fs.cpSync('shared', 'dist/shared', { recursive: true });
  }

  // Create client directory for static serving
  fs.mkdirSync('dist/public', { recursive: true });
  if (fs.existsSync('client')) {
    fs.cpSync('client', 'dist/client', { recursive: true });
  }

  // Verify build
  if (!fs.existsSync('dist/index.js')) {
    throw new Error('dist/index.js was not created');
  }

  const stats = fs.statSync('dist/index.js');
  console.log(`Autoscale build complete - ${(stats.size / 1024).toFixed(1)}kb`);
  console.log('All dependencies bundled for autoscale deployment');

} catch (error) {
  console.error('Autoscale build failed:', error.message);
  process.exit(1);
}