#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing NSIS Setup...\n');

// Test the plugin copying functionality
console.log('📋 Testing plugin copying functionality...');

// Create a test build directory
const testBuildDir = path.join(__dirname, 'test-build');
if (fs.existsSync(testBuildDir)) {
  fs.rmSync(testBuildDir, { recursive: true, force: true });
}
fs.mkdirSync(testBuildDir, { recursive: true });

// Copy plugins to test build directory
const pluginsSourceDir = path.join(__dirname, 'nsis-plugins');
const pluginsDestDir = path.join(testBuildDir, 'nsis-plugins');

if (fs.existsSync(pluginsSourceDir)) {
  try {
    const copyRecursive = (src, dest) => {
      if (fs.statSync(src).isDirectory()) {
        if (!fs.existsSync(dest)) {
          fs.mkdirSync(dest, { recursive: true });
        }
        fs.readdirSync(src).forEach(file => {
          const srcPath = path.join(src, file);
          const destPath = path.join(dest, file);
          copyRecursive(srcPath, destPath);
        });
      } else {
        fs.copyFileSync(src, dest);
      }
    };
    
    copyRecursive(pluginsSourceDir, pluginsDestDir);
    console.log('✅ Plugin copying test successful');
    
    // Verify files were copied
    const testDll = path.join(pluginsDestDir, 'Plugins', 'nsisunz.dll');
    const testNsh = path.join(pluginsDestDir, 'Include', 'nsisunz.nsh');
    
    if (fs.existsSync(testDll) && fs.existsSync(testNsh)) {
      console.log('✅ Plugin files verified in test build directory');
    } else {
      console.log('❌ Plugin files not found in test build directory');
    }
    
    // Clean up test directory
    fs.rmSync(testBuildDir, { recursive: true, force: true });
    console.log('✅ Test build directory cleaned up');
    
  } catch (error) {
    console.error('❌ Plugin copying test failed:', error.message);
  }
} else {
  console.log('❌ NSIS plugins directory not found for testing');
}

console.log('');

// Check if NSIS plugins directory exists
const pluginsDir = path.join(__dirname, 'nsis-plugins');
const pluginsPath = path.join(pluginsDir, 'Plugins');
const includePath = path.join(pluginsDir, 'Include');

console.log('📁 Checking NSIS plugin directories...');

if (fs.existsSync(pluginsDir)) {
  console.log('✅ nsis-plugins directory exists');
} else {
  console.log('❌ nsis-plugins directory missing');
  process.exit(1);
}

if (fs.existsSync(pluginsPath)) {
  console.log('✅ Plugins subdirectory exists');
} else {
  console.log('❌ Plugins subdirectory missing');
  process.exit(1);
}

if (fs.existsSync(includePath)) {
  console.log('✅ Include subdirectory exists');
} else {
  console.log('❌ Include subdirectory missing');
  process.exit(1);
}

// Check if required files exist
const dllPath = path.join(pluginsPath, 'nsisunz.dll');
const nshPath = path.join(includePath, 'nsisunz.nsh');

if (fs.existsSync(dllPath)) {
  const stats = fs.statSync(dllPath);
  console.log(`✅ nsisunz.dll exists (${(stats.size / 1024).toFixed(1)} KB)`);
} else {
  console.log('❌ nsisunz.dll missing');
  process.exit(1);
}

if (fs.existsSync(nshPath)) {
  const stats = fs.statSync(nshPath);
  console.log(`✅ nsisunz.nsh exists (${(stats.size / 1024).toFixed(1)} KB)`);
} else {
  console.log('❌ nsisunz.nsh missing');
  process.exit(1);
}

// Check if makensis is available
const { exec } = require('child_process');
exec('makensis /VERSION', (error, stdout, stderr) => {
  if (error) {
    console.log('⚠️  makensis not found in PATH');
    console.log('   Please install NSIS:');
    console.log('   - Windows: Download from https://nsis.sourceforge.io/Download');
    console.log('   - Linux: sudo apt-get install nsis');
    console.log('   - macOS: brew install nsis');
  } else {
    console.log(`✅ makensis found: ${stdout.trim()}`);
  }
  
  console.log('\n🎉 NSIS Setup Test Complete!');
  console.log('📖 Your project is ready to use with bundled NSIS plugins.');
  console.log('🚀 Run "npm start" to launch the installer generator.');
});
