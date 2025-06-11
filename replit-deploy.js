#!/usr/bin/env node
// Replit autoscale deployment build
import { execSync } from 'child_process';
import fs from 'fs';

console.log('Building for Replit autoscale deployment...');

try {
  // Clean dist directory
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  fs.mkdirSync('dist', { recursive: true });

  // Build with Replit-specific optimizations
  execSync('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js --alias:@shared=./shared --define:process.env.NODE_ENV=\\"production\\" --define:process.env.REPLIT_DEPLOYMENT=\\"true\\"', {
    stdio: 'inherit'
  });

  // Create Replit deployment package.json
  const originalPkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const deployPkg = {
    name: originalPkg.name,
    version: originalPkg.version,
    type: "module",
    scripts: {
      start: "node index.js"
    },
    engines: {
      node: ">=18.0.0"
    },
    dependencies: originalPkg.dependencies,
    optionalDependencies: originalPkg.optionalDependencies || {}
  };

  fs.writeFileSync('dist/package.json', JSON.stringify(deployPkg, null, 2));

  // Copy essential files
  if (fs.existsSync('shared')) {
    fs.cpSync('shared', 'dist/shared', { recursive: true });
  }
  
  fs.mkdirSync('dist/public', { recursive: true });
  
  if (fs.existsSync('client')) {
    fs.cpSync('client', 'dist/client', { recursive: true });
  }

  // Create deployment health check
  const healthCheck = `export function checkHealth() {
  return { status: 'ok', timestamp: new Date().toISOString() };
}`;
  fs.writeFileSync('dist/health.js', healthCheck);

  // Verify build
  if (!fs.existsSync('dist/index.js')) {
    throw new Error('Build failed: index.js not created');
  }

  const stats = fs.statSync('dist/index.js');
  console.log(`Replit deployment build complete: ${(stats.size / 1024).toFixed(1)}kb`);
  console.log('Ready for autoscale deployment');

} catch (error) {
  console.error('Replit deployment build failed:', error.message);
  process.exit(1);
}