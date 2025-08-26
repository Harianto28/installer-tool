# 🚀 NSIS Installer Tool - Easy Setup Guide

## 🎯 **What's New: Zero Plugin Setup Required!**

**Good news!** The NSIS unzip plugins (`nsisunz.dll` and `nsisunz.nsh`) are now **bundled with this project**. This means:

- ✅ **No manual plugin installation** required
- ✅ **No system-wide NSIS setup** needed  
- ✅ **Cross-platform compatibility** out of the box
- ✅ **Works immediately** after npm install

## 📋 **Prerequisites**

You only need **2 things**:

1. **Node.js** (v14 or higher)
2. **NSIS** (Nullsoft Scriptable Install System)

## 🚀 **Installation Steps**

### **Step 1: Get the Project**
```bash
git clone <your-repo-url>
cd installer-tool
```

### **Step 2: Install Dependencies**
```bash
npm install
```

**That's it!** The NSIS plugins are automatically included.

### **Step 3: Install NSIS**

**Windows:**
- Download from [https://nsis.sourceforge.io/Download](https://nsis.sourceforge.io/Download)
- Run the installer
- Restart your terminal/command prompt

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install nsis
```

**macOS:**
```bash
brew install nsis
```

### **Step 4: Start the Application**
```bash
npm start
```

### **Step 5: Open Your Browser**
Go to `http://localhost:3000`

## 🧪 **Testing Your Setup**

Run this command to verify everything is working:
```bash
npm test
```

This will check:
- ✅ NSIS plugin files are present
- ✅ Directory structure is correct
- ✅ NSIS compiler is available

## 📁 **Project Structure**

```
installer-tool/
├── nsis-plugins/          # 🎯 NSIS plugins (bundled!)
│   ├── Plugins/
│   │   └── nsisunz.dll   # Unzip plugin (88 KB)
│   └── Include/
│       └── nsisunz.nsh   # Unzip include file (0.6 KB)
├── builds/                # Generated installers
├── uploads/               # Temporary files
├── public/                # Frontend files
├── server.js              # Backend server
├── package.json           # Dependencies
└── test-nsis-setup.js     # Setup verification
```

## 🔧 **Available Commands**

```bash
npm start          # Start the application
npm test           # Test NSIS setup
npm run setup-nsis # Show setup information
```

## 🌟 **Key Benefits**

- **No system-wide installation** required
- **Plugins work immediately** after npm install
- **Cross-platform** compatibility
- **Professional installer generation** with minimal effort
- **ZIP file support** with automatic extraction

## 🆘 **Troubleshooting**

### **"makensis not found"**
- Make sure NSIS is installed and in your PATH
- Windows: Restart terminal after installation
- Linux/macOS: Verify with `which makensis`

### **"Plugin not found"**
- The plugins are bundled - no action needed
- Check that `nsis-plugins/` folder exists
- Run `npm test` to verify setup

### **Permission errors**
- Ensure write access to project directory
- Check firewall/antivirus settings

## 📖 **What Happens Behind the Scenes**

1. **NSIS compilation** uses local plugin directory: `./nsis-plugins/Plugins/`
2. **Include files** are loaded from: `./nsis-plugins/Include/`
3. **No absolute paths** - everything is relative to project directory
4. **Automatic plugin detection** - NSIS finds plugins automatically

## 🎉 **You're Ready!**

After following these steps, you can:
- Create multi-section installers
- Handle ZIP files with automatic extraction
- Generate professional Windows installers
- Edit and reuse existing scripts

**No more complex NSIS setup - just npm install and run!** 🚀
