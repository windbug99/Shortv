#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Building for Replit Autoscale Deployment...');

try {
  // Clean previous build
  if (fs.existsSync('dist')) {
    console.log('Cleaning previous build...');
    fs.rmSync('dist', { recursive: true, force: true });
  }
  
  // Create dist directory
  fs.mkdirSync('dist', { recursive: true });
  
  // Build client first
  console.log('Building client...');
  execSync('vite build', { stdio: 'inherit' });
  
  // Build server with exact path expected by deployment system
  console.log('Building server...');
  execSync('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js', { 
    stdio: 'inherit' 
  });
  
  // Verify the deployment file exists at exact expected path
  const deploymentFile = path.join(process.cwd(), 'dist', 'index.js');
  if (!fs.existsSync(deploymentFile)) {
    throw new Error('Deployment file not created at expected path: ' + deploymentFile);
  }
  
  const stats = fs.statSync(deploymentFile);
  console.log(`✅ Deployment file created: ${deploymentFile}`);
  console.log(`📦 File size: ${(stats.size / 1024).toFixed(2)}KB`);
  
  // Copy package.json for deployment
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const deployPackageJson = {
    name: packageJson.name,
    version: packageJson.version,
    type: "module",
    main: "index.js",
    scripts: {
      start: "NODE_ENV=production node index.js"
    },
    dependencies: packageJson.dependencies || {}
  };
  
  fs.writeFileSync('dist/package.json', JSON.stringify(deployPackageJson, null, 2));
  console.log('📄 Deployment package.json created');
  
  console.log('🎉 Deployment build completed successfully!');
  console.log('Ready for Replit Autoscale deployment');
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}