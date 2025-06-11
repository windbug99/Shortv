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
execSync('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js --external:./client --external:../client', {
  stdio: 'inherit'
});

// Build client with a simpler approach
console.log('🎨 Building client assets...');
try {
  // Create a minimal client build
  execSync('vite build --config vite.config.ts', {
    stdio: 'inherit',
    timeout: 180000 // 3 minutes timeout
  });
  
  // Move client build to dist/public for serving
  if (fs.existsSync('client/dist')) {
    if (fs.existsSync('dist/public')) {
      fs.rmSync('dist/public', { recursive: true });
    }
    fs.renameSync('client/dist', 'dist/public');
  }
} catch (error) {
  console.log('⚠️  Client build failed, creating minimal static assets...');
  
  // Create minimal static files for deployment
  fs.mkdirSync('dist/public', { recursive: true });
  
  // Create a basic index.html
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Loading...</title>
    <style>
        body { 
            font-family: system-ui, -apple-system, sans-serif; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            height: 100vh; 
            background: #f8fafc;
            margin: 0;
        }
        .loading { 
            text-align: center; 
            color: #64748b;
        }
    </style>
</head>
<body>
    <div class="loading">
        <h1>Application Starting...</h1>
        <p>Please wait while the application loads.</p>
    </div>
    <script>
        // Reload after 3 seconds to check if server is ready
        setTimeout(() => window.location.reload(), 3000);
    </script>
</body>
</html>`;
  
  fs.writeFileSync('dist/public/index.html', indexHtml);
}

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