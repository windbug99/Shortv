#!/usr/bin/env node
// Complete Replit autoscale deployment solution with port override
import { execSync } from 'child_process';
import fs from 'fs';

console.log('Creating complete Replit autoscale deployment...');

try {
  // Clean and prepare
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  fs.mkdirSync('dist', { recursive: true });

  // Build with aggressive port 8080 enforcement
  execSync(`esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js --alias:@shared=./shared --define:process.env.NODE_ENV=\\"production\\" --define:process.env.PORT=\\"8080\\" --target=node18 --minify`, {
    stdio: 'inherit'
  });

  // Force all port references to 8080 in the built code
  let code = fs.readFileSync('dist/index.js', 'utf8');
  
  // Replace all possible port patterns
  code = code.replace(/parseInt\(process\.env\.PORT\s*\|\|\s*['"]\d+['"]\)/g, '8080');
  code = code.replace(/process\.env\.PORT\s*\|\|\s*['"]\d+['"]/, '"8080"');
  code = code.replace(/parseInt\("[^"]*"\)/g, (match) => {
    if (match.includes('5000') || match.includes('3000')) {
      return 'parseInt("8080")';
    }
    return match;
  });
  
  // Ensure 0.0.0.0 binding
  code = code.replace(/"localhost"/g, '"0.0.0.0"');
  code = code.replace(/'localhost'/g, '"0.0.0.0"');
  
  fs.writeFileSync('dist/index.js', code);

  // Create package.json with forced port configuration
  const originalPkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const deployPkg = {
    name: originalPkg.name,
    version: originalPkg.version,
    type: "module",
    main: "index.js",
    scripts: {
      start: "PORT=8080 NODE_ENV=production node index.js",
      dev: "PORT=8080 NODE_ENV=development node index.js"
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

  fs.writeFileSync('dist/package.json', JSON.stringify(deployPkg, null, 2));

  // Copy application files
  if (fs.existsSync('shared')) {
    fs.cpSync('shared', 'dist/shared', { recursive: true });
  }
  if (fs.existsSync('client')) {
    fs.cpSync('client', 'dist/client', { recursive: true });
  }
  fs.mkdirSync('dist/public', { recursive: true });

  // Create startup wrapper with absolute port override
  const startup = `#!/usr/bin/env node
// Absolute port 8080 enforcement for Replit autoscale
delete process.env.PORT;
process.env.PORT = "8080";
process.env.NODE_ENV = "production";

console.log("Replit autoscale: Forcing port 8080");
console.log("Port:", process.env.PORT);

// Prevent any port changes
Object.defineProperty(process.env, 'PORT', {
  value: "8080",
  writable: false,
  configurable: false
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Application error:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Promise rejection:', reason);
  process.exit(1);
});

// Start server
import('./index.js').then(() => {
  console.log('Server initialization complete');
}).catch(error => {
  console.error('Server startup failed:', error.message);
  process.exit(1);
});
`;

  fs.writeFileSync('dist/server.js', startup);

  // Create health check endpoint file
  const health = `#!/usr/bin/env node
// Health check for Replit autoscale
import http from 'http';

const options = {
  hostname: '0.0.0.0',
  port: 8080,
  path: '/health',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  console.log('Health check:', res.statusCode === 200 ? 'PASS' : 'FAIL');
  process.exit(res.statusCode === 200 ? 0 : 1);
});

req.on('error', (err) => {
  console.log('Health check: FAIL -', err.message);
  process.exit(1);
});

req.on('timeout', () => {
  console.log('Health check: FAIL - timeout');
  req.destroy();
  process.exit(1);
});

req.end();
`;

  fs.writeFileSync('dist/health-check.js', health);

  // Verify deployment package
  if (!fs.existsSync('dist/index.js') || !fs.existsSync('dist/package.json')) {
    throw new Error('Deployment package incomplete');
  }

  const stats = fs.statSync('dist/index.js');
  console.log('Deployment package created: ' + (stats.size / 1024).toFixed(1) + 'kb');
  console.log('Port 8080 enforced at all levels');
  console.log('Ready for Replit autoscale deployment');
  console.log('Files created:');
  console.log('- dist/index.js (main server)');
  console.log('- dist/package.json (deployment config)');
  console.log('- dist/server.js (startup wrapper)');
  console.log('- dist/health-check.js (health verification)');

} catch (error) {
  console.error('Deployment creation failed:', error.message);
  process.exit(1);
}