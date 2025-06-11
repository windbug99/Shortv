#!/usr/bin/env node
// Minimal Replit build to fix MODULE_NOT_FOUND and crash loops
import { execSync } from 'child_process';
import fs from 'fs';

console.log('Creating minimal Replit deployment build...');

try {
  // Clean dist directory
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  fs.mkdirSync('dist', { recursive: true });

  // Build with packages external but inline problematic imports
  execSync('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js --alias:@shared=./shared --define:process.env.NODE_ENV=\\"production\\"', {
    stdio: 'inherit'
  });

  // Create simplified package.json with core dependencies only
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
    dependencies: {
      "@neondatabase/serverless": originalPkg.dependencies["@neondatabase/serverless"],
      "express": originalPkg.dependencies["express"],
      "express-session": originalPkg.dependencies["express-session"],
      "drizzle-orm": originalPkg.dependencies["drizzle-orm"],
      "passport": originalPkg.dependencies["passport"],
      "passport-local": originalPkg.dependencies["passport-local"],
      "openid-client": originalPkg.dependencies["openid-client"],
      "node-cron": originalPkg.dependencies["node-cron"],
      "zod": originalPkg.dependencies["zod"],
      "connect-pg-simple": originalPkg.dependencies["connect-pg-simple"]
    },
    optionalDependencies: {
      "bufferutil": "^4.0.8"
    }
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

  // Create robust startup script for Replit
  const startupScript = `#!/usr/bin/env node
// Replit deployment startup with error handling
process.env.NODE_ENV = 'production';
process.env.PORT = process.env.PORT || '8080';

console.log('Starting Replit deployment...');
console.log('Environment:', process.env.NODE_ENV);
console.log('Port:', process.env.PORT);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
import('./index.js').catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
`;

  fs.writeFileSync('dist/server.js', startupScript);

  // Verify build
  if (!fs.existsSync('dist/index.js')) {
    throw new Error('Build failed: index.js not created');
  }

  const stats = fs.statSync('dist/index.js');
  console.log(`Minimal Replit build complete: ${(stats.size / 1024).toFixed(1)}kb`);
  console.log('Core dependencies included for MODULE_NOT_FOUND prevention');
  console.log('Port 8080 configured for Replit autoscale');

} catch (error) {
  console.error('Minimal Replit build failed:', error.message);
  process.exit(1);
}