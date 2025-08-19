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

## 🗂️ How It Works

### **Mixed Content Example**
You can have both ZIP files AND individual files in the same section:

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

### **Generated NSIS Script**
```nsis
Section "Main Application" SEC01
  SetOutPath "$INSTDIR"
  SetOverwrite on
  File "main.exe"
  File "config.ini"
  
  ; Handle tools.zip
  SetOutPath "$INSTDIR"
  SetOverwrite on
  File "tools.zip"
  SetOutPath "$INSTDIR\tools"
  SetOverwrite on
  nsisunz::UnzipToLog "$INSTDIR\tools.zip" "$INSTDIR\tools"
  Pop $0
  ${If} $0 != "OK"
    DetailPrint "Failed to unzip tools.zip: $0"
  ${Else}
    DetailPrint "Successfully unzipped tools.zip to $INSTDIR\tools"
  ${EndIf}
  Delete "$INSTDIR\tools.zip"
  
  ; Handle docs.zip
  SetOutPath "$INSTDIR"
  SetOverwrite on
  File "docs.zip"
  SetOutPath "$INSTDIR\docs"
  SetOverwrite on
  nsisunz::UnzipToLog "$INSTDIR\docs.zip" "$INSTDIR\docs"
  Pop $0
  ${If} $0 != "OK"
    DetailPrint "Failed to unzip docs.zip: $0"
  ${Else}
    DetailPrint "Successfully unzipped docs.zip to $INSTDIR\docs"
  ${EndIf}
  Delete "$INSTDIR\docs.zip"
SectionEnd
```

## 🎯 Usage

### **1. Add ZIP Files (with nested structure)**
- Click "📦 Select ZIP File (with nested files)"
- Choose any ZIP file containing folders and files
- ZIP structure is automatically preserved and unzipped during installation

### **2. Add Individual Files**
- Click "📄 Add Individual Files"
- Select multiple individual files
- Files are placed in the section's root directory

### **3. Mix Both Types**
- You can have ZIP files AND individual files in the same section
- The system automatically organizes them correctly
- NSIS script is generated with proper unzip commands

## 🏗️ Technical Details

### **File Handling**
- **Folder Uploads**: Preserves complete directory structure
- **Individual Files**: Placed in section's root directory
- **Mixed Content**: Automatically organized by type
- **Path Preservation**: Maintains relative paths for NSIS generation

### **NSIS Script Generation**
- **Smart Grouping**: Files grouped by directory level
- **Proper SetOutPath**: One path per directory level
- **No Duplicates**: Eliminates redundant path commands
- **Windows Compatible**: Uses proper backslash escaping

### **Database & Storage**
- **MySQL LONGTEXT**: Supports scripts up to 4GB
- **File Storage**: Files stored on disk, not in database
- **Size Tracking**: Monitors total file size and count
- **Performance**: Optimized for large installer projects

## 🔧 Installation

### **Requirements**
- Node.js 14+
- MySQL 5.7+
- NSIS (makensis command available)

### **Setup**
```bash
# Install dependencies
npm install

# Configure database
# Edit server.js with your MySQL credentials

# Start server
node server.js
```

### **Database Schema**
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

## 📁 File Structure Support

### **Supported Patterns**
- ✅ Individual files: `file.exe`
- ✅ Simple folders: `tools/file.exe`
- ✅ Nested folders: `tools/subfolder/file.exe`
- ✅ Mixed content: `main.exe` + `tools/subfolder/file.exe`

### **NSIS Output Structure**
- Root files go to section's `installPath`
- Subfolder files get proper `SetOutPath` commands
- Each directory level gets its own path setting
- No duplicate or conflicting path commands

## 🚀 Perfect For

- **Software Distributions**: Main app + tools + documentation
- **Game Installers**: Game files + mods + assets
- **Development Tools**: Executables + libraries + configs
- **Documentation Sets**: Manuals + examples + templates
- **Multi-Component Apps**: Core + plugins + resources

## 💡 Tips

1. **Organize by Section**: Group related files into logical sections
2. **Use Folders for Organization**: Keep related files in subfolders
3. **Mix Content Types**: Combine individual files with folder structures
4. **Preview Script**: Always check the generated NSIS script
5. **Test Installers**: Verify folder structure is preserved

---

**Your professional installer builder with complete folder structure support! 🎉**
