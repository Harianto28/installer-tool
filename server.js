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

    // NSIS unzip plugin is now properly installed in system directories
    console.log('=== NSIS Plugin Status ===');
    console.log('✅ nsisunz.dll installed in: /usr/share/nsis/Plugins/amd64-unicode/');
    console.log('✅ nsisunz.nsh installed in: /usr/share/nsis/Include/');
    console.log('✅ Symbolic links created in /usr/share/nsis/Plugins/');
    console.log('No need to copy files - NSIS will find them automatically');

    // Compile with explicit plugin directory
    exec(
      `makensis -DPLUGINSDIR="/usr/share/nsis/Plugins" "${nsiFileName}"`,
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

// API: Get all registered routes (for debugging)
app.get("/api/routes", (req, res) => {
  const routes = [];
  
  // Method 1: Try to access the router stack
  if (app._router && app._router.stack) {
    app._router.stack
      .filter(layer => layer.route)
      .forEach(layer => {
        const methods = Object.keys(layer.route.methods)
          .map(m => m.toUpperCase());
        routes.push({
          path: layer.route.path,
          methods: methods
        });
      });
  }
  
  // Method 2: Try to access the app stack directly
  if (app.stack) {
    app.stack
      .filter(layer => layer.route)
      .forEach(layer => {
        const methods = Object.keys(layer.route.methods)
          .map(m => m.toUpperCase());
        routes.push({
          path: layer.route.path,
          methods: methods
        });
      });
  }
  
  // Method 3: Try to access the router through different paths
  if (app._router && app._router.stack) {
    app._router.stack.forEach(layer => {
      if (layer.name === 'router' && layer.handle && layer.handle.stack) {
        layer.handle.stack
          .filter(route => route.route)
          .forEach(route => {
            const methods = Object.keys(route.route.methods)
              .map(m => m.toUpperCase());
            routes.push({
              path: layer.regexp ? layer.regexp.toString() : 'unknown',
              methods: methods
            });
          });
      }
    });
  }
  
  // Method 4: Manual route listing as fallback
  if (routes.length === 0) {
    routes.push(
      { path: '/upload', methods: ['POST'] },
      { path: '/api/scripts', methods: ['GET'] },
      { path: '/api/routes', methods: ['GET'] },
      { path: '/download/*', methods: ['GET'] },
      { path: '/public/*', methods: ['GET'] },
      { path: '/*', methods: ['GET'] }
    );
  }
  
  // Remove duplicates
  const uniqueRoutes = routes.filter((route, index, self) => 
    index === self.findIndex(r => r.path === route.path)
  );
  
  res.json({
    success: true,
    routes: uniqueRoutes,
    total: uniqueRoutes.length,
    detectionMethod: routes.length === 0 ? 'manual' : 'automatic'
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
  
  // Try multiple methods to detect routes
  let routesFound = false;
  
  // Method 1: Try to access the router stack
  if (app._router && app._router.stack) {
    const routes = app._router.stack
      .filter(layer => layer.route)
      .map(layer => {
        const methods = Object.keys(layer.route.methods)
          .map(m => m.toUpperCase())
          .join(", ");
        return `${methods} ${layer.route.path}`;
      });
    
    if (routes.length > 0) {
      routes.forEach(route => console.log(route));
      routesFound = true;
    }
  }
  
  // Method 2: Try to access the app stack directly
  if (!routesFound && app.stack) {
    const routes = app.stack
      .filter(layer => layer.route)
      .map(layer => {
        const methods = Object.keys(layer.route.methods)
          .map(m => m.toUpperCase())
          .join(", ");
        return `${methods} ${layer.route.path}`;
      });
    
    if (routes.length > 0) {
      routes.forEach(route => console.log(route));
      routesFound = true;
    }
  }
  
  if (!routesFound) {
    console.log("⚠️ No routes detected - Express routes may not be fully registered yet");
  }
};

app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Server running at http://localhost:${port}`);
  console.log(`✅ Server also accessible at http://0.0.0.0:${port}`);
  
  // Log routes after a short delay to ensure they're registered
  setTimeout(logRoutes, 100);
});
