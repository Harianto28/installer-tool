// Version: 2.0.0 - Multi-section installer builder
let sections = [];

// Initialize the first section
function initializeSections() {
  // Start with just one clean section
  sections = [
    {
      id: 1,
      name: "Section 1",
      description: "Enter section description",
      files: [],
      type: "custom",
      installPath: "$INSTDIR",
      overwrite: "on"
    }
  ];
  
  renderSections();
  updateScriptPreview();
}

// Render all sections
function renderSections() {
  const sectionsList = document.getElementById("sections-list");
  sectionsList.innerHTML = "";
  
  sections.forEach((section, index) => {
    const sectionDiv = document.createElement("div");
    sectionDiv.className = "section-item";
    sectionDiv.innerHTML = `
      <div class="section-header">
        <h4>Section ${index + 1}: ${section.name}</h4>
        <div class="section-controls">
          <button type="button" class="btn-small" onclick="editSection(${index})">✏️ Edit</button>
          <button type="button" class="btn-small btn-danger" onclick="removeSection(${index})">🗑️ Remove</button>
        </div>
      </div>
      <div class="section-content">
        <p><strong>Description:</strong> ${section.description}</p>
        <p><strong>Install Path:</strong> ${section.installPath}</p>
        <p><strong>Files:</strong> ${section.files.length} file(s)</p>
        <div class="section-files">
          ${section.files.map(file => `
            <div class="file-item">
              <div class="file-info">
                <span class="file-path">${file.isZip ? '📦 ' : ''}${file.path}</span>
                <span class="file-size">${formatFileSize(file.size)}</span>
              </div>
              <button type="button" class="file-remove-btn" onclick="removeFileFromSection(${index}, '${file.path}')">×</button>
            </div>
          `).join('')}
        </div>
        <div class="section-actions">
          <button type="button" class="btn-secondary" onclick="addZipToSection(${index})">
            📦 Select ZIP File (with nested files)
          </button>
          <button type="button" class="btn-secondary" onclick="addIndividualFilesToSection(${index})" style="margin-left: 10px;">
            📄 Add Individual Files
          </button>
          ${section.files.length > 0 ? `
            <button type="button" class="btn-secondary" onclick="clearSectionFiles(${index})" style="margin-left: 10px;">
              🗑️ Clear All Files
            </button>
          ` : ''}
        </div>
      </div>
    `;
    sectionsList.appendChild(sectionDiv);
  });
}

// Add new section
function addNewSection() {
  const newSection = {
    id: Date.now(),
    name: `Section ${sections.length + 1}`,
    description: "Enter section description",
    files: [],
    type: "custom",
    installPath: "$INSTDIR",
    overwrite: "on"
  };
  
  sections.push(newSection);
  renderSections();
  updateScriptPreview();
}

// Remove section
function removeSection(index) {
  if (sections.length <= 1) {
    alert("You must have at least one section!");
    return;
  }
  
  if (confirm(`Are you sure you want to remove "${sections[index].name}"?`)) {
    sections.splice(index, 1);
    renderSections();
    updateScriptPreview();
  }
}

// Edit section
function editSection(index) {
  const section = sections[index];
  
  // Edit section name
  const newName = prompt("Enter section name:", section.name);
  if (newName && newName.trim()) {
    section.name = newName.trim();
  } else if (newName !== null) {
    // User clicked Cancel
    return;
  }
  
  // Edit section description
  const newDesc = prompt("Enter section description:", section.description);
  if (newDesc !== null) {
    section.description = newDesc.trim();
  }
  
  // Edit install path
  const newPath = prompt("Enter install path:", section.installPath);
  if (newPath && newPath.trim()) {
    section.installPath = newPath.trim();
  }
  
  renderSections();
  updateScriptPreview();
}

// Add zip file to a specific section
function addZipToSection(sectionIndex) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.zip';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (file && (file.type === 'application/zip' || file.name.toLowerCase().endsWith('.zip'))) {
      // Create a zip file object
      const zipObj = {
        name: file.name,
        path: file.name, // For zip files, path is just the filename
        size: file.size,
        type: 'application/zip',
        file: file, // Keep reference to actual file
        isZip: true // Mark as zip file
      };
      
      // Check if zip already exists (by name)
      if (!sections[sectionIndex].files.find(f => f.name === zipObj.name)) {
        sections[sectionIndex].files.push(zipObj);
        console.log('ZIP file added:', zipObj); // Debug log
      }
    } else {
      alert('Please select a valid ZIP file.');
    }
    renderSections();
    updateScriptPreview();
  };
  input.click();
}

// Add individual files to a specific section
function addIndividualFilesToSection(sectionIndex) {
  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = true;
  input.onchange = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      // Create a file object with relative path information
      const fileObj = {
        name: file.name,
        path: file.name, // For individual files, path is just the name
        size: file.size,
        type: file.type,
        file: file // Keep reference to actual file
      };
      
      // Check if file already exists (by path)
      if (!sections[sectionIndex].files.find(f => f.path === fileObj.path)) {
        sections[sectionIndex].files.push(fileObj);
      }
    });
    renderSections();
    updateScriptPreview();
  };
  input.click();
}

// Remove file from section
function removeFileFromSection(sectionIndex, filePath) {
  const section = sections[sectionIndex];
  section.files = section.files.filter(f => f.path !== filePath);
  console.log('File removed, updating script...'); // Debug log
  renderSections();
  updateScriptPreview();
}

// Clear all files from a section
function clearSectionFiles(sectionIndex) {
  if (confirm(`Are you sure you want to remove all files from "${sections[sectionIndex].name}"?`)) {
    sections[sectionIndex].files = [];
    console.log('All files cleared, updating script...'); // Debug log
    renderSections();
    updateScriptPreview();
  }
}

// Format file size for display
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Generate NSIS script using your example as template
function generateNSISScript() {
  const title = document.getElementById("title").value || "My Installer";
  const version = document.getElementById("version").value || "v1.0.0";
  const installDir = document.getElementById("installDir").value || "C:\MyApp";
  
  let script = `; Script generated by the HM NIS Edit Script Wizard.
 !define PRODUCT_NAME "${title}"
 !define PRODUCT_VERSION "${version}"
 !define PRODUCT_DIR "${installDir}"
 
   OutFile "${title.replace(/[^a-zA-Z0-9]/g, '')}_Installer-${version.replace(/[^0-9]/g, '')}.exe"
  InstallDir "${installDir}"
 Caption "${title} ${version}"
 ShowInstDetails show
 RequestExecutionLevel admin
 
 Page directory ; This adds the page where the user can select the install directory
 Page instfiles ; This page actually performs the installation process
 
   ; Include NSIS plugins and libraries
  !addplugindir "/usr/share/nsis/Plugins"
  !include LogicLib.nsh
  !include WinCore.nsh
  !include "/usr/share/nsis/Include/nsisunz.nsh" ; Include the unzip plugin
  
  ; Function to clean up temporary files (defined before use)
  Function CleanupTempFiles
    ; Clean up any remaining ZIP files
    ${sections.map(section => 
      section.files.filter(f => f.isZip).map(zipFile => 
        `  Delete "$INSTDIR\\${zipFile.name}"\n  DetailPrint "Cleaned up ${zipFile.name}"`
      ).join('\n')
    ).join('\n')}
  FunctionEnd
  
  ; Define constants
  !ifndef NSIS_CHAR_SIZE
    !define NSIS_CHAR_SIZE 1
  !endif
  !ifndef HKEY_LOCAL_MACHINE
    !error HKEY_LOCAL_MACHINE
  !endif

Function RegAppendString
System::Store S
Pop $R0 ; append
Pop $R1 ; separator
Pop $R2 ; reg value
Pop $R3 ; reg path
Pop $R4 ; reg hkey
System::Call 'ADVAPI32::RegCreateKey(i$R4,tR3,*i.r1)i.r0'
\${If} $0 = 0
    System::Call 'ADVAPI32::RegQueryValueEx(ir1,tR2,i0,*i.r2,i0,*i0r3)i.r0'
    \${If} $0 <> 0
        StrCpy $2 \${REG_SZ}
        StrCpy $3 0
    \${EndIf}
    StrLen $4 $R0
    StrLen $5 $R1
    IntOp $4 $4 + $5
    IntOp $4 $4 + 1 ; For \\0
    !if \${NSIS_CHAR_SIZE} > 1
        IntOp $4 $4 * \${NSIS_CHAR_SIZE}
    !endif
    IntOp $4 $4 + $3
    System::Alloc $4
    System::Call 'ADVAPI32::RegQueryValueEx(ir1,tR2,i0,i0,isr9,*ir4r4)i.r0'
    \${If} $0 = 0
    \${OrIf} $0 = \${ERROR_FILE_NOT_FOUND}
        System::Call 'KERNEL32::lstrlen(t)(ir9)i.r0'
        \${If} $0 <> 0
            System::Call 'KERNEL32::lstrcat(t)(ir9,tR1)'
        \${EndIf}
        System::Call 'KERNEL32::lstrcat(t)(ir9,tR0)'
        System::Call 'KERNEL32::lstrlen(t)(ir9,tR0)'
        IntOp $0 $0 + 1
        !if \${NSIS_CHAR_SIZE} > 1
            IntOp $0 $0 * \${NSIS_CHAR_SIZE}
        !endif
        System::Call 'ADVAPI32::RegSetValueEx(ir1,tR2,i0,ir2,ir9,ir0)i.r0'
    \${EndIf}
    System::Free $9
    System::Call 'ADVAPI32::RegCloseKey(ir1)'
\${EndIf}
Push $0
System::Store L
FunctionEnd

`;

  // Generate sections
  sections.forEach((section, index) => {
    console.log(`Processing section ${index + 1}:`, section); // Debug log
    script += `Section "${section.name}" SEC${String(index + 1).padStart(2, '0')}\n`;
    
    // Group files by type (zip vs individual files)
    const zipFiles = section.files.filter(f => f.isZip === true);
    const individualFiles = section.files.filter(f => f.isZip !== true);
    
    console.log(`Section ${index + 1}:`, { zipFiles, individualFiles }); // Debug log
    
    // Handle individual files first
    if (individualFiles.length > 0) {
      script += `  SetOutPath "${section.installPath}"\n`;
      script += `  SetOverwrite ${section.overwrite}\n`;
      individualFiles.forEach(file => {
        script += `  File "${file.name}"\n`;
      });
    }
    
         // Handle ZIP files with automatic unzipping
     zipFiles.forEach(zipFile => {
       const zipName = zipFile.name;
       const extractDir = zipName.replace('.zip', '').replace('.ZIP', ''); // Remove .zip extension
       const fullExtractPath = section.installPath === "$INSTDIR" ? 
         `$INSTDIR\\${extractDir}` : 
         `${section.installPath}\\${extractDir}`;
       
       // First, copy the ZIP file to install directory
       script += `  SetOutPath "${section.installPath}"\n`;
       script += `  SetOverwrite ${section.overwrite}\n`;
       script += `  File "${zipName}"\n`;
       
       // Then unzip it to the target directory
       script += `  SetOutPath "${fullExtractPath}"\n`;
       script += `  SetOverwrite ${section.overwrite}\n`;
       script += `  nsisunz::UnzipToLog "${section.installPath}\\${zipName}" "${fullExtractPath}"\n`;
       script += `  Pop $0\n`;
       script += `  \${If} $0 != "OK"\n`;
       script += `    DetailPrint "Failed to unzip ${zipName}: $0"\n`;
       script += `    ; ZIP file kept for debugging since unzip failed\n`;
       script += `  \${Else}\n`;
       script += `    DetailPrint "Successfully unzipped ${zipName} to ${fullExtractPath}"\n`;
       script += `    ; Clean up the ZIP file after successful extraction\n`;
       script += `    DetailPrint "Attempting to delete ${zipName} from ${section.installPath}"\n`;
       script += `    Delete "${section.installPath}\\${zipName}"\n`;
               script += `    DetailPrint "Successfully cleaned up ${zipName}"\n`;
       script += `  \${EndIf}\n`;
     });
     
     // Call cleanup function at the end of this section if it has ZIP files
     if (zipFiles.length > 0) {
       script += `  Call CleanupTempFiles\n`;
     }
     
     script += `SectionEnd\n\n`;
  });
  
  // Add final function
  script += `Function .onGUIEnd
    ExecShell "open" "$INSTDIR"
FunctionEnd`;

  return script;
}

// Update script preview
function updateScriptPreview() {
  console.log('Updating script preview...'); // Debug log
  console.log('Current sections:', sections); // Debug log
  console.log('Sections with files:', sections.map(s => ({ name: s.name, fileCount: s.files.length, files: s.files }))); // Debug log
  
  const script = generateNSISScript();
  document.getElementById("script").value = script;
  console.log('Script updated!'); // Debug log
  console.log('Generated script length:', script.length); // Debug log
}

// Form submission
document.getElementById("form").onsubmit = async (e) => {
  e.preventDefault();
  
  // Check if any section has files
  const hasFiles = sections.some(section => section.files.length > 0);
  if (!hasFiles) {
    alert("Please add files to at least one section before generating the installer.");
    return;
  }
  
  // Check if required fields are filled
  const title = document.getElementById("title").value.trim();
  if (!title) {
    alert("Please enter an installer title.");
    return;
  }
  
  // Get the script from the textarea (allows manual editing)
  const script = document.getElementById("script").value;
  
  // Create FormData with all files from all sections
  const formData = new FormData();
  formData.append("title", title);
  formData.append("script", script);
  
  sections.forEach(section => {
    section.files.forEach(fileObj => {
      formData.append("files", fileObj.file); // Use the actual file object
    });
  });
  
  const result = document.getElementById("result");
  result.innerHTML = '<div class="result-message result-info">🔄 Building installer...</div>';

  try {
    const res = await fetch("/upload", { method: "POST", body: formData });
    const json = await res.json();

    if (res.ok) {
      result.innerHTML = '<div class="result-message result-success">✅ Installer generated successfully!</div>';
      loadScriptList();
    } else {
      result.innerHTML = `<div class="result-message result-error">❌ ${json.error || "Build failed."}</div>`;
    }
  } catch (error) {
    console.error("Upload error:", error);
    result.innerHTML = '<div class="result-message result-error">❌ Upload failed: ' + error.message + '</div>';
  }
};

// Event listeners
document.getElementById("add-section-btn").addEventListener("click", addNewSection);

// Auto-update script preview when form fields change
document.getElementById("title").addEventListener("input", updateScriptPreview);
document.getElementById("version").addEventListener("input", updateScriptPreview);
document.getElementById("installDir").addEventListener("input", updateScriptPreview);

// Load script history
async function loadScriptList() {
  const container = document.getElementById("scriptList");
  try {
    const res = await fetch("/api/scripts");
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    const scripts = await res.json();
    container.innerHTML = "";

    if (scripts.length === 0) {
      container.innerHTML = "<p>No scripts found.</p>";
      return;
    }

    // Create table
    const table = document.createElement("table");
    table.className = "script-table";
    table.innerHTML = `
            <thead>
              <tr>
                <th>No.</th>
                <th>Title</th>
                <th>Installer</th>
                <th>Files</th>
                <th>Size</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody></tbody>
          `;

    const tbody = table.querySelector("tbody");
    scripts.forEach((s, index) => {
      const row = document.createElement("tr");
      const createdDate = new Date(s.created_at).toLocaleDateString();
      const fileCount = s.file_count || 0;
      const totalSize = s.total_size ? formatFileSize(s.total_size) : 'N/A';
      
      row.innerHTML = `
              <td>${index + 1}</td>
              <td><span class="script-title" onclick="showScriptDetails(${s.id})">${s.title}</span></td>
              <td><a href="${s.installer_path}" target="_blank" class="download-link">⬇️ ${s.title}.exe</a></td>
              <td>${fileCount} file(s)</td>
              <td>${totalSize}</td>
              <td>${createdDate}</td>
            `;
      tbody.appendChild(row);

      // Add details div after the table
      const detailsDiv = document.createElement("div");
      detailsDiv.id = `details-${s.id}`;
      detailsDiv.className = "script-details";
      detailsDiv.innerHTML = `
              <button class="script-details-close" onclick="closeScriptDetails(${s.id})" title="Close">×</button>
              <h4>Script Details: ${s.title}</h4>
              <pre style="white-space: pre-wrap; background: white; padding: 10px; border-radius: 3px;">${s.content}</pre>
            `;
      container.appendChild(detailsDiv);
    });

    container.appendChild(table);
  } catch (error) {
    console.error("Failed to load script list:", error);
    container.innerHTML = "<p>Error loading script history</p>";
  }
}

function showScriptDetails(id) {
  const detailsDiv = document.getElementById(`details-${id}`);
  if (detailsDiv) {
    // Hide all details first
    document.querySelectorAll(".script-details").forEach((div) => {
      div.classList.remove("show");
    });
    // Show the clicked details
    detailsDiv.classList.add("show");
  }
}

function closeScriptDetails(id) {
  const detailsDiv = document.getElementById(`details-${id}`);
  if (detailsDiv) {
    detailsDiv.classList.remove("show");
  }
}

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
  initializeSections();
  loadScriptList();
});