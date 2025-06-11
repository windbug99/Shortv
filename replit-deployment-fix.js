#!/usr/bin/env node
// Replit autoscale deployment fix - replaces existing build process
import { execSync } from 'child_process';
import fs from 'fs';

console.log('Fixing Replit autoscale deployment configuration...');

try {
  // Clean and prepare dist directory
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  fs.mkdirSync('dist', { recursive: true });

  // First run the client build if it exists
  if (fs.existsSync('vite.config.ts')) {
    console.log('Building client assets...');
    try {
      execSync('vite build', { stdio: 'inherit' });
    } catch (clientError) {
      console.warn('Client build warning:', clientError.message);
    }
  }

  // Build server optimized for Replit autoscale
  console.log('Building server for Replit autoscale...');
  execSync(`esbuild server/index.ts \\
    --platform=node \\
    --packages=external \\
    --bundle \\
    --format=esm \\
    --outfile=dist/index.js \\
    --alias:@shared=./shared \\
    --define:process.env.NODE_ENV=\\"production\\" \\
    --define:process.env.PORT=\\"8080\\" \\
    --target=node18 \\
    --minify`, {
    stdio: 'inherit'
  });

  // Read original package.json
  const originalPkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

  // Create Replit-optimized package.json
  const replitPkg = {
    name: originalPkg.name,
    version: originalPkg.version,
    type: "module",
    main: "index.js",
    scripts: {
      start: "PORT=8080 NODE_ENV=production node index.js",
      dev: "PORT=8080 NODE_ENV=development node index.js"
    },
    engines: {
      node: ">=18.0.0",
      npm: ">=8.0.0"
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

  fs.writeFileSync('dist/package.json', JSON.stringify(replitPkg, null, 2));

  // Copy essential files
  if (fs.existsSync('shared')) {
    fs.cpSync('shared', 'dist/shared', { recursive: true });
  }

  if (fs.existsSync('client')) {
    fs.cpSync('client', 'dist/client', { recursive: true });
  }

  fs.mkdirSync('dist/public', { recursive: true });

  // Create production startup script that forces port 8080
  const startupScript = `#!/usr/bin/env node
// Replit autoscale startup - forces port 8080
process.env.PORT = '8080';
process.env.NODE_ENV = 'production';

console.log('🚀 Replit autoscale deployment starting...');
console.log('Port:', process.env.PORT);
console.log('Environment:', process.env.NODE_ENV);

// Error handling for Replit deployment
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

// Start the server
try {
  await import('./index.js');
} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
}
`;

  fs.writeFileSync('dist/server.js', startupScript);

  // Override the existing dist/index.js to force port 8080 binding
  const serverContent = fs.readFileSync('dist/index.js', 'utf8');
  const fixedServerContent = serverContent.replace(
    /process\.env\.PORT \|\| ['"]\d+['"]/, 
    'process.env.PORT || "8080"'
  );
  
  fs.writeFileSync('dist/index.js', fixedServerContent);

  // Verification
  if (!fs.existsSync('dist/index.js') || !fs.existsSync('dist/package.json')) {
    throw new Error('Build verification failed - missing required files');
  }

  const stats = fs.statSync('dist/index.js');
  console.log(`Build complete: ${(stats.size / 1024).toFixed(1)}kb`);
  console.log('Replit autoscale configuration applied');
  console.log('Port 8080 deployment ready');

} catch (error) {
  console.error('Deployment fix failed:', error.message);
  process.exit(1);
}