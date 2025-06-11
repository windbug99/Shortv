#!/usr/bin/env node
// Server-only build for Replit autoscale deployment
import { execSync } from 'child_process';
import fs from 'fs';

console.log('Building server for Replit autoscale deployment...');

try {
  // Clean dist directory
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  fs.mkdirSync('dist', { recursive: true });

  // Build server bundle for Replit autoscale
  execSync(`esbuild server/index.ts \\
    --platform=node \\
    --packages=external \\
    --bundle \\
    --format=esm \\
    --outfile=dist/index.js \\
    --alias:@shared=./shared \\
    --define:process.env.NODE_ENV=\\"production\\" \\
    --define:process.env.PORT=\\"8080\\" \\
    --target=node18`, {
    stdio: 'inherit'
  });

  // Read original package.json for dependencies
  const originalPkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

  // Create minimal production package.json for Replit
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

  // Copy essential files
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
  console.log(`Server build complete: ${(stats.size / 1024).toFixed(1)}kb`);
  console.log('Replit autoscale ready - Port 8080 configured');

} catch (error) {
  console.error('Server build failed:', error.message);
  process.exit(1);
}