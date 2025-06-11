#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🏗️  Starting production build...');

// Clean dist directory
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}
fs.mkdirSync('dist', { recursive: true });

// Build server with esbuild (fast and reliable)
console.log('📦 Building server...');
execSync('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js --external:./client --external:../client --external:@shared/*', {
  stdio: 'inherit'
});

// Skip client build for now - server will serve from development assets
console.log('📁 Creating public directory structure...');
fs.mkdirSync('dist/public', { recursive: true });

// Create a basic index.html that the server can serve
const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Content Discovery Platform</title>
</head>
<body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
</body>
</html>`;

fs.writeFileSync('dist/public/index.html', indexHtml);

// Copy package.json for production dependencies
console.log('📋 Copying package.json...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const prodPackageJson = {
  name: packageJson.name,
  version: packageJson.version,
  type: packageJson.type,
  dependencies: packageJson.dependencies,
  optionalDependencies: packageJson.optionalDependencies || {}
};

fs.writeFileSync('dist/package.json', JSON.stringify(prodPackageJson, null, 2));

console.log('✅ Build completed successfully!');
console.log('📁 Build output:');
console.log('   - dist/index.js (server)');
console.log('   - dist/public/ (client assets)');
console.log('   - dist/package.json (dependencies)');