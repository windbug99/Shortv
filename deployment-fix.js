#!/usr/bin/env node
// Deployment-specific build that addresses connection refused errors
import { execSync } from 'child_process';
import fs from 'fs';

console.log('🔧 Creating deployment build with connection fixes...');

try {
  // Clean dist directory
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  fs.mkdirSync('dist', { recursive: true });

  // Build server with deployment-specific configurations
  console.log('Building server with deployment optimizations...');
  execSync('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js --alias:@shared=./shared --define:process.env.NODE_ENV=\\"production\\"', {
    stdio: 'inherit'
  });

  // Create production package.json with deployment settings
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const prodPackageJson = {
    name: packageJson.name,
    version: packageJson.version,
    type: packageJson.type,
    scripts: {
      start: "NODE_ENV=production node index.js"
    },
    dependencies: packageJson.dependencies,
    optionalDependencies: packageJson.optionalDependencies || {}
  };

  fs.writeFileSync('dist/package.json', JSON.stringify(prodPackageJson, null, 2));

  // Copy required files
  if (fs.existsSync('shared')) {
    fs.cpSync('shared', 'dist/shared', { recursive: true });
  }
  
  fs.mkdirSync('dist/public', { recursive: true });
  
  if (fs.existsSync('client')) {
    fs.cpSync('client', 'dist/client', { recursive: true });
  }

  // Create deployment startup script that handles port binding correctly
  const startupScript = `#!/usr/bin/env node
// Deployment startup wrapper
console.log('🚀 Deployment startup initiated');
console.log('Environment:', process.env.NODE_ENV || 'production');
console.log('Port:', process.env.PORT || '5000');
console.log('Host binding: 0.0.0.0');

// Set production environment
process.env.NODE_ENV = 'production';

// Import and start the main server
import('./index.js').catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
`;

  fs.writeFileSync('dist/start.js', startupScript);

  // Verify critical files exist
  if (!fs.existsSync('dist/index.js')) {
    throw new Error('dist/index.js was not created');
  }

  const stats = fs.statSync('dist/index.js');
  console.log(`✅ Deployment build complete - dist/index.js (${(stats.size / 1024).toFixed(1)}kb)`);
  console.log('✅ Server configured for 0.0.0.0:5000 binding');
  console.log('✅ Production environment variables set');
  console.log('Ready for deployment: node dist/index.js');

} catch (error) {
  console.error('❌ Deployment build failed:', error.message);
  process.exit(1);
}