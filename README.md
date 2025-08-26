# 🚀 NSIS Multi-Section Installer Builder

A professional web-based tool for creating Windows installers with multiple sections, nested folder support, and automatic NSIS script generation.

## ✨ Features

- **Multi-Section Support**: Create installers with multiple installation sections
- **Nested Folder Support**: Upload entire folder structures with preserved hierarchy
- **Individual File Support**: Add individual files alongside folders
- **Automatic Script Generation**: NSIS scripts generated automatically from your file structure
- **Real-time Preview**: See the generated script as you add files
- **Manual Editing**: Modify the generated script if needed
- **Large File Support**: Handle files up to 1GB each
- **Database Tracking**: Track installer history with file counts and sizes
- **Bundled NSIS Plugins**: NSIS unzip plugins included - no manual setup required!

## 🚀 Quick Start Guide

### **Step 1: Install Dependencies**

```bash
# Clone or download this project
git clone <your-repo-url>
cd installer-tool

# Install Node.js dependencies
npm install
```

**What gets installed:**
- ✅ Express.js web server
- ✅ Multer file upload handling
- ✅ MySQL2 database driver
- ✅ SQLite3 fallback support

### **Step 2: Install NSIS (makensis)**

#### **Windows:**
1. Download NSIS from [https://nsis.sourceforge.io/Download](https://nsis.sourceforge.io/Download)
2. Run the installer and follow the setup wizard
3. **Important**: Add NSIS to your system PATH during installation
4. Verify installation: Open Command Prompt and run `makensis /VERSION`

#### **Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install nsis
```

#### **Linux (CentOS/RHEL/Fedora):**
```bash
# CentOS/RHEL 7/8
sudo yum install nsis

# CentOS/RHEL 9, Fedora
sudo dnf install nsis
```

#### **macOS:**
```bash
# Using Homebrew
brew install nsis

# Using MacPorts
sudo port install nsis
```

#### **Verify NSIS Installation:**
```bash
makensis /VERSION
# Should output something like: "NSIS 3.x.x"
```

### **Step 3: Configure Database**

#### **Option A: MySQL (Recommended)**
1. Install MySQL server
2. Create database: `CREATE DATABASE installer_tool;`
3. Edit `server.js` with your MySQL credentials:

```javascript
const db = mysql.createPool({
  host: "localhost",
  user: "your_username",
  password: "your_password",
  database: "installer_tool",
});
```

#### **Option B: SQLite (No Setup Required)**
- SQLite is included as a fallback
- No configuration needed - works out of the box

### **Step 4: Start the Application**

```bash
# Start the web server
npm start

# Or run directly
node server.js
```

**The application will:**
- ✅ Create necessary directories (`uploads/`, `builds/`)
- ✅ Connect to database
- ✅ Start web server on port 3000
- ✅ Display setup status in console

### **Step 5: Access the Web Interface**

Open your browser and navigate to:
```
http://localhost:3000
```

## 🔧 What's Included

### **NSIS Plugins (No Setup Required!)**
- ✅ **`nsisunz.dll`** - NSIS unzip plugin for handling ZIP files
- ✅ **`nsisunz.nsh`** - NSIS include file with unzip functions
- ✅ **Location**: `./nsis-plugins/Plugins/` and `./nsis-plugins/Include/`

### **Project Structure**
```
installer-tool/
├── server.js              # Main server file
├── package.json           # Node.js dependencies
├── nsis-plugins/         # Bundled NSIS plugins
│   ├── Plugins/
│   │   └── nsisunz.dll
│   └── Include/
│       └── nsisunz.nsh
├── uploads/               # File upload directory
├── builds/                # Generated installer directory
└── public/                # Web interface files
```

## 📋 Prerequisites Checklist

Before running the application, ensure you have:

- ✅ **Node.js** (v14 or higher)
- ✅ **npm** (comes with Node.js)
- ✅ **NSIS** (makensis command available)
- ✅ **MySQL** (optional, SQLite fallback included)
- ✅ **Git** (for cloning the repository)

## 🐛 Troubleshooting

### **"makensis command not found"**
- **Windows**: Add NSIS to system PATH or restart Command Prompt
- **Linux/macOS**: Verify NSIS installation with `which makensis`

### **Database Connection Failed**
- Check MySQL credentials in `server.js`
- Ensure MySQL service is running
- SQLite fallback will work automatically

### **Port 3000 Already in Use**
```bash
# Use a different port
PORT=3001 npm start
```

### **Permission Denied (Linux/macOS)**
```bash
# Fix uploads/builds directory permissions
sudo chown -R $USER:$USER uploads/ builds/
chmod 755 uploads/ builds/
```

## 🎯 Usage Examples

### **Create a Multi-Section Installer**

1. **Add Section 1: Main Application**
   - Upload `main.exe` (individual file)
   - Upload `tools.zip` (ZIP with nested structure)

2. **Add Section 2: Documentation**
   - Upload `manual.pdf` (individual file)
   - Upload `examples.zip` (ZIP with examples)

3. **Generate NSIS Script**
   - Click "Generate NSIS Script"
   - Review the auto-generated script
   - Modify if needed

4. **Build Installer**
   - Click "Build Installer"
   - Download the generated `.exe` file

### **Mixed Content Support**
```
Section 1: Main Application
├── main.exe (individual file)
├── config.ini (individual file)
├── tools.zip (ZIP file with nested structure)
│   ├── tool1.exe
│   ├── subfolder/
│   │   └── nested.exe
│   └── config/
└── docs.zip (another ZIP file)
    └── manual.pdf
```

## 🚀 Advanced Configuration

### **Custom Port**
```bash
PORT=8080 npm start
```

### **Custom Database Host**
```bash
DB_HOST=192.168.1.100 npm start
```

### **Environment Variables**
Create a `.env` file:
```env
PORT=3000
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=installer_tool
```

## 📊 Database Schema

```sql
CREATE TABLE scripts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title TEXT NOT NULL,
  content LONGTEXT NOT NULL,
  installer_path TEXT,
  total_size BIGINT DEFAULT 0,
  file_count INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 🔒 Security Notes

- **File Upload Limits**: 1GB per file, 1000 files max
- **Database**: Use strong passwords for production
- **Port**: Change default port 3000 for production use
- **Firewall**: Configure firewall rules appropriately

## 📚 Additional Resources

- **NSIS Documentation**: [https://nsis.sourceforge.io/Docs/](https://nsis.sourceforge.io/Docs/)
- **NSIS Download**: [https://nsis.sourceforge.io/Download](https://nsis.sourceforge.io/Download)
- **Node.js**: [https://nodejs.org/](https://nodejs.org/)
- **MySQL**: [https://dev.mysql.com/downloads/](https://dev.mysql.com/downloads/)

## 🆘 Support

If you encounter issues:

1. **Check the console output** for error messages
2. **Verify NSIS installation**: `makensis /VERSION`
3. **Check database connection** (if using MySQL)
4. **Review file permissions** (Linux/macOS)
5. **Check port availability**: `netstat -an | grep 3000`

## 🎉 Success!

Once everything is working, you'll see:
```
✅ Created uploads directory
✅ Created builds directory
✅ Database connected successfully
✅ Scripts table ready
✅ installer_path column already exists
✅ NSIS Installer Tool ready! Make sure you have NSIS installed.
```

**Your professional installer builder is now ready to use! 🚀**

---

*Built with ❤️ using Node.js, Express, and NSIS*
