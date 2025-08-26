const express = require("express");
const multer = require("multer");
const fs = require("fs");
const { exec } = require("child_process");
const path = require("path");
const mysql = require("mysql2");

const app = express();
const port = process.env.PORT || 3000;

// Create necessary directories
const uploadsDir = path.join(__dirname, "uploads");
const buildsDir = path.join(__dirname, "builds");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("✅ Created uploads directory");
}

if (!fs.existsSync(buildsDir)) {
  fs.mkdirSync(buildsDir, { recursive: true });
  console.log("✅ Created builds directory");
}

// Inisialisasi DB
const db = mysql.createPool({
  host: "localhost",
  user: "jeremy",
  password: "Qazwsx@123",
  database: "installer_tool",
});

// Test database connection and create table if needed
db.getConnection((err, connection) => {
  if (err) {
    console.error("Database connection failed:", err);
  } else {
    console.log("✅ Database connected successfully");
    
    // Create table if it doesn't exist
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS scripts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title TEXT NOT NULL,
        content LONGTEXT NOT NULL,
        installer_path TEXT,
        total_size BIGINT DEFAULT 0,
        file_count INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    connection.query(createTableQuery, (err) => {
      if (err) {
        console.error("Table creation error:", err);
      } else {
        console.log("✅ Scripts table ready");
        
        // Try to add installer_path column if it doesn't exist
        connection.query(
          `SHOW COLUMNS FROM scripts LIKE 'installer_path'`,
          (err, results) => {
            if (err) {
              console.error("Error checking installer_path column:", err.message);
            } else if (results.length === 0) {
              // Column doesn't exist, add it
              connection.query(
                `ALTER TABLE scripts ADD COLUMN installer_path TEXT`,
                (err) => {
                  if (err) {
                    console.error("Error adding installer_path column:", err.message);
                  } else {
                    console.log("✅ installer_path column added");
                  }
                }
              );
            } else {
              console.log("✅ installer_path column already exists");
            }
          }
        );
      }
    });
    
    connection.release();
  }
});

// Upload setup with better file handling
const upload = multer({ 
  dest: "uploads/",
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1GB per file
    files: 1000 // Allow up to 1000 files
  }
}).array("files");

// Custom error handling for multer
const handleUpload = (req, res, next) => {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      console.error('Multer error:', err);
      return res.status(400).json({
        success: false,
        error: "File upload error: " + err.message
      });
    } else if (err) {
      console.error('Unknown upload error:', err);
      return res.status(500).json({
        success: false,
        error: "Upload failed: " + err.message
      });
    }
    next();
  });
};

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));
app.use(express.static("public"));
app.use("/download", express.static("builds"));

// Simpan + generate installer
app.post("/upload", handleUpload, (req, res) => {
  console.log('=== UPLOAD REQUEST RECEIVED ===');
  console.log('Files received:', req.files ? req.files.length : 0);
  console.log('Body received:', req.body ? Object.keys(req.body) : 'No body');
  
  // Add error handling for multer
  if (req.fileValidationError) {
    console.error('File validation error:', req.fileValidationError);
    return res.status(400).json({
      success: false,
      error: "File validation error: " + req.fileValidationError
    });
  }
  
  try {
    const folder = path.join("builds", Date.now().toString());
    fs.mkdirSync(folder, { recursive: true });

    // Simpan file dengan struktur folder
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        // Handle ZIP files and individual files
        let destPath = file.originalname;
        
        // For ZIP files, just copy them as-is (they'll be unzipped by NSIS)
        if (destPath.toLowerCase().endsWith('.zip')) {
          const dest = path.join(folder, file.originalname);
          fs.renameSync(file.path, dest);
        } else if (destPath.includes('/') || destPath.includes('\\')) {
          // Handle nested folder structure (for individual files)
          destPath = destPath.replace(/\\/g, '/');
          const fullDestPath = path.join(folder, destPath);
          const destDir = path.dirname(fullDestPath);
          
          if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
          }
          
          fs.renameSync(file.path, fullDestPath);
        } else {
          // Single file, no folder structure
          const dest = path.join(folder, file.originalname);
          fs.renameSync(file.path, dest);
        }
      });
    }

    const script = req.body.script;
    if (!script) {
      return res.status(400).json({
        success: false,
        error: "Script is required.",
      });
    }
    
    // Normalize line endings for validation
    const normalizedScript = script.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    console.log('=== SCRIPT VALIDATION ===');
    console.log('Script contains OutFile:', normalizedScript.includes("OutFile"));
    console.log('Script contains File directive:', /File\s+"[^"]+"/.test(normalizedScript));
    console.log('Script preview (first 500 chars):', normalizedScript.substring(0, 500));
    
    if (!normalizedScript.includes("OutFile") || !/File\s+"[^"]+"/.test(normalizedScript)) {
      return res.status(400).json({
        success: false,
        error: "Script NSIS wajib mengandung OutFile dan File.",
      });
    }

    const outFileMatch = normalizedScript.match(/OutFile\s+"([^"]+)"/i);
    const outFileName = outFileMatch ? outFileMatch[1] : "output.exe";
    const nsiFileName = "installer.nsi";
    const nsiPath = path.join(folder, nsiFileName);
    
    // Write normalized script
    fs.writeFileSync(nsiPath, normalizedScript, 'utf8');

    // Copy NSIS plugins to build directory for compilation
    const pluginsSourceDir = path.join(__dirname, 'nsis-plugins');
    const pluginsDestDir = path.join(folder, 'nsis-plugins');
    
    if (fs.existsSync(pluginsSourceDir)) {
      try {
        // Copy the entire nsis-plugins directory to the build folder
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
        console.log('✅ NSIS plugins copied to build directory');
      } catch (error) {
        console.error('❌ Error copying NSIS plugins:', error.message);
        return res.status(500).json({
          success: false,
          error: "Failed to copy NSIS plugins: " + error.message,
        });
      }
    } else {
      console.error('❌ NSIS plugins directory not found:', pluginsSourceDir);
      return res.status(500).json({
        success: false,
        error: "NSIS plugins directory not found. Please ensure nsis-plugins/ folder exists.",
      });
    }

    // NSIS unzip plugin is now properly installed in system directories
    console.log('=== NSIS Plugin Status ===');
    console.log('✅ nsisunz.dll available in: ./nsis-plugins/Plugins/');
    console.log('✅ nsisunz.nsh available in: ./nsis-plugins/Include/');
    console.log('✅ Using local NSIS plugins - no system installation required');
    console.log('✅ New users can just npm install and run!');

    // Compile with explicit plugin directory
          exec(
        `makensis -DPLUGINSDIR="nsis-plugins/Plugins" "${nsiFileName}"`,
        { cwd: folder },
      (err, stdout, stderr) => {
        if (err) {
          console.error("Build error:", err, stderr);
          return res.status(500).json({
            success: false,
            error: "Build failed: " + stderr,
          });
        }

        // Simpan ke DB
        const downloadPath = `/download/${path.basename(
          folder
        )}/${outFileName}`;
        const title = req.body.title || outFileName;
        
        // Calculate total size and file count
        const totalSize = req.files ? req.files.reduce((sum, file) => sum + file.size, 0) : 0;
        const fileCount = req.files ? req.files.length : 0;
        
        db.query(
          "INSERT INTO scripts (title, content, installer_path, total_size, file_count) VALUES (?, ?, ?, ?, ?)",
          [title, script, downloadPath, totalSize, fileCount],
          function (err, result) {
            if (err) {
              console.error("Database error:", err);
              return res.status(500).json({
                success: false,
                error: "Database error: " + err.message,
              });
            }

            return res.json({
              success: true,
              downloadUrl: downloadPath,
              id: result.insertId,
              totalSize: totalSize,
              fileCount: fileCount
            });
          }
        );
      }
    );
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({
      success: false,
      error: "Upload failed: " + error.message,
    });
  }
});

// New endpoint for editing scripts - reuse existing files from a previous build
app.post("/edit-script", handleUpload, (req, res) => {
  console.log('=== EDIT SCRIPT REQUEST RECEIVED ===');
  console.log('Body received:', req.body ? Object.keys(req.body) : 'No body');
  console.log('Files received:', req.files ? req.files.length : 0);
  console.log('Full request body:', JSON.stringify(req.body, null, 2));
  
  try {
    const { script, title, sourceScriptId } = req.body;
    
    console.log('=== PARSED DATA ===');
    console.log('Script:', script ? `Length: ${script.length}` : 'undefined');
    console.log('Title:', title);
    console.log('Source Script ID:', sourceScriptId, 'Type:', typeof sourceScriptId);
    
    if (!script) {
      console.log('❌ Script is missing');
      return res.status(400).json({
        success: false,
        error: "Script is required.",
      });
    }
    
    if (!sourceScriptId) {
      console.log('❌ Source script ID is missing');
      return res.status(400).json({
        success: false,
        error: "Source script ID is required to copy files.",
      });
    }
    
    // Normalize line endings for validation
    const normalizedScript = script.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    console.log('=== SCRIPT VALIDATION ===');
    console.log('Script contains OutFile:', normalizedScript.includes("OutFile"));
    console.log('Script contains File directive:', /File\s+"[^"]+"/.test(normalizedScript));
    
    if (!normalizedScript.includes("OutFile") || !/File\s+"[^"]+"/.test(normalizedScript)) {
      console.log('❌ Script validation failed');
      return res.status(400).json({
        success: false,
        error: "Script NSIS wajib mengandung OutFile dan File.",
      });
    }

    console.log('✅ Script validation passed, proceeding with database query...');

    // Get the source script to find its build directory
    db.query("SELECT installer_path FROM scripts WHERE id = ?", [sourceScriptId], (err, rows) => {
      if (err) {
        console.error("❌ Database error:", err);
        return res.status(500).json({
          success: false,
          error: "Database error: " + err.message,
        });
      }
      
      console.log('Database query result:', rows);
      
      if (rows.length === 0) {
        console.log('❌ Source script not found in database');
        return res.status(404).json({
          success: false,
          error: "Source script not found.",
        });
      }
      
      const sourceScript = rows[0];
      const installerPath = sourceScript.installer_path;
      
      console.log('Source script installer path:', installerPath);
      
      // Extract the build directory from installer path
      // Path format: /download/1755700480982/test_installer.exe
      const pathParts = installerPath.split('/');
      if (pathParts.length < 3) {
        console.log('❌ Invalid installer path format:', installerPath);
        return res.status(400).json({ 
          success: false, 
          error: "Invalid installer path format" 
        });
      }
      
      const buildDir = pathParts[2]; // 1755700480982
      const sourceBuildPath = path.join(__dirname, 'builds', buildDir);
      
      console.log('Build directory:', buildDir);
      console.log('Source build path:', sourceBuildPath);
      
      // Check if source build directory exists
      if (!fs.existsSync(sourceBuildPath)) {
        console.log('❌ Source build directory not found:', sourceBuildPath);
        return res.status(404).json({ 
          success: false, 
          error: "Source build directory not found" 
        });
      }
      
      console.log('✅ Source build directory found, creating new build directory...');
      
      // Create new build directory
      const newFolder = path.join("builds", Date.now().toString());
      fs.mkdirSync(newFolder, { recursive: true });
      
      console.log('New build directory created:', newFolder);
      
      // Copy all source files (excluding build artifacts)
      const sourceFiles = fs.readdirSync(sourceBuildPath);
      let totalSize = 0;
      let fileCount = 0;
      
      console.log('Source files found:', sourceFiles);
      
      sourceFiles.forEach(fileName => {
        // Skip build artifacts
        if (fileName.toLowerCase().endsWith('.exe') || fileName.toLowerCase().endsWith('.nsi')) {
          console.log(`⏭️ Skipping build artifact: ${fileName}`);
          return;
        }
        
        const sourcePath = path.join(sourceBuildPath, fileName);
        const destPath = path.join(newFolder, fileName);
        
        try {
          fs.copyFileSync(sourcePath, destPath);
          const stats = fs.statSync(sourcePath);
          totalSize += stats.size;
          fileCount++;
          console.log(`✅ Copied source file: ${fileName} (${stats.size} bytes)`);
        } catch (error) {
          console.error(`❌ Failed to copy ${fileName}:`, error);
        }
      });
      
      // Handle any new files uploaded by the user
      if (req.files && req.files.length > 0) {
        console.log(`📁 Processing ${req.files.length} new uploaded files...`);
        
        req.files.forEach((file) => {
          const destPath = path.join(newFolder, file.originalname);
          
          try {
            fs.renameSync(file.path, destPath);
            const stats = fs.statSync(destPath);
            totalSize += stats.size;
            fileCount++;
            console.log(`✅ Added new uploaded file: ${file.originalname} (${stats.size} bytes)`);
          } catch (error) {
            console.error(`❌ Failed to add uploaded file ${file.originalname}:`, error);
          }
        });
      }
      
      if (fileCount === 0) {
        console.log('❌ No source files found to copy');
        return res.status(400).json({
          success: false,
          error: "No source files found to copy.",
        });
      }
      
      console.log(`✅ Total: ${fileCount} files, total size: ${totalSize} bytes`);
      
      // Write the new script
      const outFileMatch = normalizedScript.match(/OutFile\s+"([^"]+)"/i);
      const outFileName = outFileMatch ? outFileMatch[1] : "output.exe";
      const nsiFileName = "installer.nsi";
      const nsiPath = path.join(newFolder, nsiFileName);
      
      console.log('Writing NSIS script:', nsiPath);
      fs.writeFileSync(nsiPath, normalizedScript, 'utf8');
      
      // Copy NSIS plugins to build directory for compilation
      const pluginsSourceDir = path.join(__dirname, 'nsis-plugins');
      const pluginsDestDir = path.join(newFolder, 'nsis-plugins');
      
      if (fs.existsSync(pluginsSourceDir)) {
        try {
          // Copy the entire nsis-plugins directory to the build folder
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
          console.log('✅ NSIS plugins copied to build directory');
        } catch (error) {
          console.error('❌ Error copying NSIS plugins:', error.message);
          return res.status(500).json({
            success: false,
            error: "Failed to copy NSIS plugins: " + error.message,
          });
        }
      } else {
        console.error('❌ NSIS plugins directory not found:', pluginsSourceDir);
        return res.status(500).json({
          success: false,
          error: "NSIS plugins directory not found. Please ensure nsis-plugins/ folder exists.",
        });
      }
      
      console.log('✅ NSIS script written, compiling...');
      
      // Compile with NSIS
      exec(
        `makensis -DPLUGINSDIR="nsis-plugins/Plugins" "${nsiFileName}"`,
        { cwd: newFolder },
        (err, stdout, stderr) => {
          if (err) {
            console.error("❌ Build error:", err, stderr);
            return res.status(500).json({
              success: false,
              error: "Build failed: " + stderr,
            });
          }

          console.log('✅ NSIS compilation successful');
          console.log('NSIS stdout:', stdout);
          console.log('NSIS stderr:', stderr);

          // Save to DB
          const downloadPath = `/download/${path.basename(newFolder)}/${outFileName}`;
          const finalTitle = title || outFileName;
          
          console.log('Saving to database...');
          console.log('Download path:', downloadPath);
          console.log('Final title:', finalTitle);
          
          db.query(
            "INSERT INTO scripts (title, content, installer_path, total_size, file_count) VALUES (?, ?, ?, ?, ?)",
            [finalTitle, script, downloadPath, totalSize, fileCount],
            function (err, result) {
              if (err) {
                console.error("❌ Database error:", err);
                return res.status(500).json({
                  success: false,
                  error: "Database error: " + err.message,
                });
              }

              console.log('✅ Database insert successful, ID:', result.insertId);
              
              return res.json({
                success: true,
                downloadUrl: downloadPath,
                id: result.insertId,
                totalSize: totalSize,
                fileCount: fileCount
              });
            }
          );
        }
      );
    });
    
  } catch (error) {
    console.error("❌ Edit script error:", error);
    console.error("Error stack:", error.stack);
    return res.status(500).json({
      success: false,
      error: "Edit script failed: " + error.message,
    });
  }
});

// API: List semua script
app.get("/api/scripts", (req, res) => {
  db.query("SELECT * FROM scripts ORDER BY created_at DESC", (err, rows) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({
        success: false,
        error: "Database error: " + err.message,
      });
    }
    
    // Ensure we always return an array
    const scripts = rows || [];
    res.json(scripts);
  });
});

// API: Get script by ID
app.get("/api/scripts/:id", (req, res) => {
  const id = req.params.id;
  db.query("SELECT * FROM scripts WHERE id = ?", [id], (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (rows.length === 0) return res.status(404).json({ success: false, error: "Not found" });
    res.json(rows[0]);
  });
});

// API: Get files for a script ID
app.get("/api/scripts/:id/files", (req, res) => {
  const id = req.params.id;
  
  // First get the script to find the build directory
  db.query("SELECT * FROM scripts WHERE id = ?", [id], (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (rows.length === 0) return res.status(404).json({ success: false, error: "Script not found" });
    
    const script = rows[0];
    const installerPath = script.installer_path;
    
    // Extract the build directory from installer path
    // Path format: /download/1755700480982/test_installer.exe
    const pathParts = installerPath.split('/');
    if (pathParts.length < 3) {
      return res.status(400).json({ success: false, error: "Invalid installer path" });
    }
    
    const buildDir = pathParts[2]; // 1755700480982
    const buildPath = path.join(__dirname, 'builds', buildDir);
    
    // Check if build directory exists
    if (!fs.existsSync(buildPath)) {
      return res.json({ success: true, files: [], buildDir: buildDir });
    }
    
    try {
      const files = [];
      const items = fs.readdirSync(buildPath);
      
      items.forEach(item => {
        const itemPath = path.join(buildPath, item);
        const stats = fs.statSync(itemPath);
        
        files.push({
          name: item,
          size: stats.size,
          isDirectory: stats.isDirectory(),
          path: `/download/${buildDir}/${item}`,
          modified: stats.mtime
        });
      });
      
      res.json({ 
        success: true, 
        files: files,
        buildDir: buildDir,
        totalFiles: files.length
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
});

// API: Delete script by ID
app.delete("/api/scripts/:id", (req, res) => {
  const id = req.params.id;
  
  // First get the script to find the build directory
  db.query("SELECT * FROM scripts WHERE id = ?", [id], (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (rows.length === 0) return res.status(404).json({ success: false, error: "Script not found" });
    
    const script = rows[0];
    const installerPath = script.installer_path;
    
    // Extract the build directory from installer path
    // Path format: /download/1755700480982/test_installer.exe
    const pathParts = installerPath.split('/');
    if (pathParts.length >= 3) {
      const buildDir = pathParts[2]; // 1755700480982
      const buildPath = path.join(__dirname, 'builds', buildDir);
      
      // Delete the build directory if it exists
      if (fs.existsSync(buildPath)) {
        try {
          // Remove all files in the build directory
          const items = fs.readdirSync(buildPath);
          items.forEach(item => {
            const itemPath = path.join(buildPath, item);
            const stats = fs.statSync(itemPath);
            if (stats.isDirectory()) {
              fs.rmSync(itemPath, { recursive: true, force: true });
            } else {
              fs.unlinkSync(itemPath);
            }
          });
          
          // Remove the empty build directory
          fs.rmdirSync(buildPath);
          console.log(`✅ Build directory deleted: ${buildPath}`);
        } catch (error) {
          console.error(`❌ Error deleting build directory: ${error.message}`);
          // Continue with script deletion even if build directory deletion fails
        }
      }
    }
    
    // Delete the script from database
    db.query("DELETE FROM scripts WHERE id = ?", [id], (err, result) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      
      console.log(`✅ Script deleted from database: ID ${id}`);
      res.json({ success: true, message: "Script deleted successfully" });
    });
  });
});

// API: Get all registered routes (for debugging)
app.get("/api/routes", (req, res) => {
  // Since Express.js doesn't expose routes in a reliable way,
  // we'll manually list all the routes we've defined
  const routes = [
    { path: '/upload', methods: ['POST'], description: 'Upload files and generate installer' },
    { path: '/edit-script', methods: ['POST'], description: 'Edit script and reuse existing files from previous build' },
    { path: '/api/scripts', methods: ['GET'], description: 'List all scripts' },
    { path: '/api/scripts/:id', methods: ['GET'], description: 'Get script by ID' },
    { path: '/api/scripts/:id/files', methods: ['GET'], description: 'Get files for a specific script' },
    { path: '/api/scripts/:id', methods: ['DELETE'], description: 'Delete script by ID' },
    { path: '/api/routes', methods: ['GET'], description: 'List all registered routes' },
    { path: '/download/*', methods: ['GET'], description: 'Static file serving for builds' },
    { path: '/public/*', methods: ['GET'], description: 'Static file serving for public assets' },
    { path: '/*', methods: ['GET'], description: 'Catch-all route for undefined routes' }
  ];
  
  res.json({
    success: true,
    routes: routes,
    total: routes.length,
    detectionMethod: 'manual',
    note: 'Express.js routes are manually listed since automatic detection is unreliable'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error: " + err.message,
  });
});

// Catch-all route for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
  });
});

// Function to log all registered routes
const logRoutes = () => {
  console.log("=== Registered Routes ===");
  
  const routes = [
    { path: '/upload', methods: ['POST'], description: 'Upload files and generate installer' },
    { path: '/edit-script', methods: ['POST'], description: 'Edit script and reuse existing files from previous build' },
    { path: '/api/scripts', methods: ['GET'], description: 'List all scripts' },
    { path: '/api/scripts/:id', methods: ['GET'], description: 'Get script by ID' },
    { path: '/api/scripts/:id/files', methods: ['GET'], description: 'Get files for a specific script' },
    { path: '/api/scripts/:id', methods: ['DELETE'], description: 'Delete script by ID' },
    { path: '/api/routes', methods: ['GET'], description: 'List all registered routes' },
    { path: '/download/*', methods: ['GET'], description: 'Static file serving for builds' },
    { path: '/public/*', methods: ['GET'], description: 'Static file serving for public assets' },
    { path: '/*', methods: ['GET'], description: 'Catch-all route for undefined routes' }
  ];
  
  routes.forEach(route => {
    const methods = route.methods.join(", ");
    console.log(`${methods} ${route.path} - ${route.description}`);
  });
  
  console.log(`Total: ${routes.length} routes`);
};

app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Server running at http://localhost:${port}`);
  console.log(`✅ Server also accessible at http://0.0.0.0:${port}`);
  
  // Log routes after a short delay to ensure they're registered
  setTimeout(logRoutes, 100);
});
