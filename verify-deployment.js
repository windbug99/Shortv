#!/usr/bin/env node
// Deployment verification script
import fs from 'fs';
import { execSync } from 'child_process';

console.log('🔍 Verifying deployment readiness...\n');

let allChecks = true;

// Check 1: Verify dist/index.js exists
if (fs.existsSync('dist/index.js')) {
  const stats = fs.statSync('dist/index.js');
  console.log(`✅ dist/index.js exists (${Math.round(stats.size / 1024)}KB)`);
} else {
  console.log('❌ dist/index.js missing');
  allChecks = false;
}

// Check 2: Verify dist/package.json exists and has correct structure
if (fs.existsSync('dist/package.json')) {
  const pkg = JSON.parse(fs.readFileSync('dist/package.json', 'utf8'));
  if (pkg.scripts && pkg.scripts.start && pkg.dependencies) {
    console.log('✅ dist/package.json properly configured');
    console.log(`   - Start script: ${pkg.scripts.start}`);
    console.log(`   - Dependencies: ${Object.keys(pkg.dependencies).length} packages`);
  } else {
    console.log('❌ dist/package.json missing required fields');
    allChecks = false;
  }
} else {
  console.log('❌ dist/package.json missing');
  allChecks = false;
}

// Check 3: Verify shared directory
if (fs.existsSync('dist/shared')) {
  console.log('✅ dist/shared directory copied');
} else {
  console.log('❌ dist/shared directory missing');
  allChecks = false;
}

// Check 4: Verify client files
if (fs.existsSync('dist/client')) {
  console.log('✅ dist/client directory copied');
} else {
  console.log('❌ dist/client directory missing');
  allChecks = false;
}

// Check 5: Verify public directory
if (fs.existsSync('dist/public')) {
  console.log('✅ dist/public directory created');
} else {
  console.log('❌ dist/public directory missing');
  allChecks = false;
}

console.log('\n📋 Deployment Summary:');
if (allChecks) {
  console.log('🎉 All deployment checks passed!');
  console.log('\n🚀 Ready for deployment with:');
  console.log('   cd dist && node index.js');
  console.log('\n📝 Alternative deployment commands:');
  console.log('   node deployment-build.js');
  console.log('   node build-deploy.js');
  console.log('   node production-deploy.js');
} else {
  console.log('❌ Some deployment checks failed. Run a build script first.');
  process.exit(1);
}