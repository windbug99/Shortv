#!/usr/bin/env node
// Replit autoscale build that prevents crash loops and MODULE_NOT_FOUND errors
import { execSync } from 'child_process';
import fs from 'fs';

console.log('Building for Replit autoscale with crash loop prevention...');

try {
  // Clean dist directory
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  fs.mkdirSync('dist', { recursive: true });

  // Build with all modules inlined to prevent MODULE_NOT_FOUND
  console.log('Creating crash-resistant build...');
  execSync('esbuild server/index.ts --platform=node --bundle --format=esm --outfile=dist/index.js --alias:@shared=./shared --external:pg-native --external:cpu-features --external:lightningcss --external:@babel/preset-typescript --define:process.env.NODE_ENV=\\"production\\"', {
    stdio: 'inherit'
  });

  // Create minimal package.json for Replit
  const packageJson = {
    name: "youtube-summarizer",
    version: "1.0.0",
    type: "module",
    main: "index.js",
    scripts: {
      start: "node index.js"
    },
    engines: {
      node: ">=18.0.0"
    },
    dependencies: {
      "@neondatabase/serverless": "^0.10.4",
      "express": "^4.21.2",
      "drizzle-orm": "^0.39.1"
    }
  };

  fs.writeFileSync('dist/package.json', JSON.stringify(packageJson, null, 2));

  // Copy only essential files
  if (fs.existsSync('shared')) {
    fs.cpSync('shared', 'dist/shared', { recursive: true });
  }
  
  // Create public directory
  fs.mkdirSync('dist/public', { recursive: true });
  
  // Copy client files
  if (fs.existsSync('client')) {
    fs.cpSync('client', 'dist/client', { recursive: true });
  }

  // Create startup wrapper to handle crashes gracefully
  const startupWrapper = `#!/usr/bin/env node
import { spawn } from 'child_process';

console.log('Replit startup wrapper - preventing crash loops');

function startServer() {
  const child = spawn('node', ['index.js'], {
    stdio: 'inherit',
    env: { ...process.env, PORT: process.env.PORT || '8080' }
  });

  child.on('exit', (code) => {
    if (code !== 0) {
      console.log('Server crashed, waiting before restart...');
      setTimeout(startServer, 5000);
    }
  });
}

startServer();
`;

  fs.writeFileSync('dist/start.js', startupWrapper);
  fs.chmodSync('dist/start.js', 0o755);

  // Verify build
  if (!fs.existsSync('dist/index.js')) {
    throw new Error('Build failed: index.js not created');
  }

  const stats = fs.statSync('dist/index.js');
  console.log(`Replit autoscale build complete: ${(stats.size / 1024).toFixed(1)}kb`);
  console.log('Crash loop prevention enabled');
  console.log('Ready for deployment with port 8080');

} catch (error) {
  console.error('Replit autoscale build failed:', error.message);
  process.exit(1);
}