#!/usr/bin/env node
// Replit autoscale build with port 8080 enforcement
import { execSync } from 'child_process';
import fs from 'fs';

console.log('Replit autoscale build starting...');

try {
  // Clean dist directory
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  fs.mkdirSync('dist', { recursive: true });

  // Build server for Replit autoscale
  console.log('Building server bundle...');
  execSync(`esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js --alias:@shared=./shared --define:process.env.NODE_ENV=\\"production\\" --define:process.env.PORT=\\"8080\\" --target=node18 --minify`, {
    stdio: 'inherit'
  });

  // Force port 8080 in generated code
  let serverCode = fs.readFileSync('dist/index.js', 'utf8');
  serverCode = serverCode.replace(/parseInt\(process\.env\.PORT\s*\|\|\s*['"]\d+['"]\)/g, '8080');
  serverCode = serverCode.replace(/process\.env\.PORT\s*\|\|\s*['"]\d+['"]/, '"8080"');
  serverCode = serverCode.replace(/const port = .+?;/g, 'const port = 8080;');
  serverCode = serverCode.replace(/"localhost"/g, '"0.0.0.0"');
  fs.writeFileSync('dist/index.js', serverCode);

  // Create production package.json
  const originalPkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const prodPkg = {
    name: originalPkg.name,
    version: originalPkg.version,
    type: "module",
    main: "index.js",
    scripts: {
      start: "PORT=8080 NODE_ENV=production node index.js"
    },
    engines: {
      node: ">=18.0.0"
    },
    dependencies: {
      "@neondatabase/serverless": originalPkg.dependencies["@neondatabase/serverless"],
      "express": originalPkg.dependencies["express"],
      "express-session": originalPkg.dependencies["express-session"],
      "drizzle-orm": originalPkg.dependencies["drizzle-orm"],
      "drizzle-zod": originalPkg.dependencies["drizzle-zod"],
      "passport": originalPkg.dependencies["passport"],
      "passport-local": originalPkg.dependencies["passport-local"],
      "openid-client": originalPkg.dependencies["openid-client"],
      "node-cron": originalPkg.dependencies["node-cron"],
      "zod": originalPkg.dependencies["zod"],
      "connect-pg-simple": originalPkg.dependencies["connect-pg-simple"],
      "node-fetch": originalPkg.dependencies["node-fetch"],
      "memoizee": originalPkg.dependencies["memoizee"],
      "memorystore": originalPkg.dependencies["memorystore"]
    }
  };

  fs.writeFileSync('dist/package.json', JSON.stringify(prodPkg, null, 2));

  // Copy application files
  if (fs.existsSync('shared')) {
    fs.cpSync('shared', 'dist/shared', { recursive: true });
  }
  if (fs.existsSync('client')) {
    fs.cpSync('client', 'dist/client', { recursive: true });
  }
  fs.mkdirSync('dist/public', { recursive: true });

  // Verify build
  if (!fs.existsSync('dist/index.js')) {
    throw new Error('Build failed: dist/index.js not created');
  }

  const stats = fs.statSync('dist/index.js');
  console.log('Build successful: ' + (stats.size / 1024).toFixed(1) + 'kb');
  console.log('Port 8080 enforced for Replit autoscale');

} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}