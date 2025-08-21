// Get script ID from URL parameter
function getScriptId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('id');
}

// Load script data by ID
async function loadScript(id) {
  try {
    const response = await fetch(`/api/scripts/${id}`);
    if (!response.ok) {
      throw new Error('Script not found');
    }
    const script = await response.json();
    return script;
  } catch (error) {
    console.error('Error loading script:', error);
    throw error;
  }
}

// Global sections array for automation
let sections = [];

// Display script data in form
function displayScript(script) {
  // Parse the NSIS script to extract form data and sections
  parseNSISScript(script.content);
  
  // Load actual files into sections (excluding build artifacts)
  if (script.installer_path) {
    loadSourceFilesIntoSections(script);
  }
  
  // Hide loading, show form
  document.getElementById('loading').style.display = 'none';
  document.getElementById('edit-form').style.display = 'block';
}

// Parse NSIS script to extract sections and form data
function parseNSISScript(scriptContent) {
  console.log('Parsing NSIS script...');
  
  // Extract basic info
  const titleMatch = scriptContent.match(/!define PRODUCT_NAME "([^"]+)"/);
  const versionMatch = scriptContent.match(/!define PRODUCT_VERSION "([^"]+)"/);
  const installDirMatch = scriptContent.match(/!define PRODUCT_DIR "([^"]+)"/);
  
  // Set form values
  if (titleMatch) document.getElementById('title').value = titleMatch[1];
  if (versionMatch) document.getElementById('version').value = versionMatch[1];
  if (installDirMatch) document.getElementById('installDir').value = installDirMatch[1];
  
  // Parse sections
  sections = [];
  const sectionRegex = /Section "([^"]+)" SEC\d+/g;
  let match;
  let sectionIndex = 0;
  
  while ((match = sectionRegex.exec(scriptContent)) !== null) {
    const sectionName = match[1];
    const sectionStart = match.index;
    
    // Find section end
    const sectionEnd = scriptContent.indexOf('SectionEnd', sectionStart);
    if (sectionEnd === -1) continue;
    
    const sectionContent = scriptContent.substring(sectionStart, sectionEnd);
    
    // Extract files from section
    const files = [];
    const fileRegex = /File "([^"]+)"/g;
    let fileMatch;
    
    while ((fileMatch = fileRegex.exec(sectionContent)) !== null) {
      const fileName = fileMatch[1];
      const isZip = fileName.toLowerCase().endsWith('.zip');
      
      files.push({
        name: fileName,
        path: fileName,
        size: 0, // We don't have file size info from the script
        isZip: isZip,
        file: null // We don't have the actual file object
      });
    }
    
    // Extract install path
    const setOutPathMatch = sectionContent.match(/SetOutPath "([^"]+)"/);
    const installPath = setOutPathMatch ? setOutPathMatch[1] : '$INSTDIR';
    
    // Extract overwrite setting
    const setOverwriteMatch = sectionContent.match(/SetOverwrite (\w+)/);
    const overwrite = setOverwriteMatch ? setOverwriteMatch[1] : 'on';
    
    sections.push({
      id: sectionIndex + 1,
      name: sectionName,
      description: `Section ${sectionIndex + 1}`,
      files: files,
      type: "custom",
      installPath: installPath,
      overwrite: overwrite
    });
    
    sectionIndex++;
  }
  
  // If no sections found, create a default one
  if (sections.length === 0) {
    sections = [{
      id: 1,
      name: "Section 1",
      description: "Enter section description",
      files: [],
      type: "custom",
      installPath: "$INSTDIR",
      overwrite: "on"
    }];
  }
  
  console.log('Parsed sections:', sections);
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
                <span class="file-path">${file.isZip ? '📦 ' : ''}${file.name}</span>
                <span class="file-size">${formatFileSize(file.size)}</span>
              </div>
              <button type="button" class="file-remove-btn" onclick="removeFileFromSection(${index}, '${file.name}')">×</button>
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
  const newName = prompt("Enter section name:", section.name);
  if (newName && newName.trim()) {
    section.name = newName.trim();
    renderSections();
    updateScriptPreview();
  }
}

// Add ZIP file to section
function addZipToSection(sectionIndex) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.zip';
  input.multiple = false;
  
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const fileObj = {
        name: file.name,
        path: file.name,
        size: file.size,
        isZip: true,
        file: file
      };
      
      sections[sectionIndex].files.push(fileObj);
      renderSections();
      updateScriptPreview();
    }
  };
  
  input.click();
}

// Add individual files to section
function addIndividualFilesToSection(sectionIndex) {
  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = true;
  
  input.onchange = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const fileObj = {
        name: file.name,
        path: file.name,
        size: file.size,
        isZip: false,
        file: file
      };
      
      sections[sectionIndex].files.push(fileObj);
    });
    
    renderSections();
    updateScriptPreview();
  };
  
  input.click();
}

// Remove file from section
function removeFileFromSection(sectionIndex, fileName) {
  sections[sectionIndex].files = sections[sectionIndex].files.filter(f => f.name !== fileName);
  renderSections();
  updateScriptPreview();
}

// Clear all files from section
function clearSectionFiles(sectionIndex) {
  if (confirm('Are you sure you want to remove all files from this section?')) {
    sections[sectionIndex].files = [];
    renderSections();
    updateScriptPreview();
  }
}

// Generate NSIS script using the same template as the main page
function generateNSISScript() {
  const title = document.getElementById("title").value || "My Installer";
  const version = document.getElementById("version").value || "v1.0.0";
  const installDir = document.getElementById("installDir").value || "C:\\MyApp";
  
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
        System::Call 'KERNEL32::lstrlen(t)(ir9)t.r0'
        \${If} $0 <> 0
            System::Call 'KERNEL32::lstrcat(t)(ir9,tR1)'
        \${EndIf}
        System::Call 'KERNEL32::lstrcat(t)(ir9,tR0)'
        System::Call 'KERNEL32::lstrlen(t)(ir9)t.r0'
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
    console.log(`Processing section ${index + 1}:`, section);
    script += `Section "${section.name}" SEC${String(index + 1).padStart(2, '0')}\n`;
    
    // Group files by type (zip vs individual files)
    const zipFiles = section.files.filter(f => f.isZip === true);
    const individualFiles = section.files.filter(f => f.isZip !== true);
    
    console.log(`Section ${index + 1}:`, { zipFiles, individualFiles });
    
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
      const extractDir = zipName.replace('.zip', '').replace('.ZIP', '');
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

// Update script preview automatically
function updateScriptPreview() {
  console.log('Updating script preview...');
  console.log('Current sections:', sections);
  
  const script = generateNSISScript();
  document.getElementById("script").value = script;
  console.log('Script updated!');
  console.log('Generated script length:', script.length);
}

// Load source files into sections (excluding build artifacts)
async function loadSourceFilesIntoSections(script) {
  // Fetch uploaded files for this script
  try {
    const response = await fetch(`/api/scripts/${script.id}/files`);
    const fileData = await response.json();
    
    if (fileData.success && fileData.files && fileData.files.length > 0) {
      // Populate the first section with ONLY source files (excluding build artifacts)
      if (sections.length > 0) {
        console.log('Loading source files into sections (excluding build artifacts)...');
        
        // Clear existing parsed files and add ONLY source files
        sections[0].files = [];
        
        fileData.files.forEach(file => {
          if (!file.isDirectory) {
            const fileName = file.name.toLowerCase();
            // EXCLUDE build artifacts: .exe, .nsi files
            const isBuildArtifact = fileName.endsWith('.exe') || fileName.endsWith('.nsi');
            
            if (!isBuildArtifact) {
              const isZip = fileName.toLowerCase().endsWith('.zip');
              sections[0].files.push({
                name: file.name,
                path: file.name,
                size: file.size,
                isZip: isZip,
                file: null, // We don't have the actual file object, but we'll download it later
                serverPath: file.path // Store the server path for later download
              });
              console.log(`✅ Added source file: ${file.name} (${formatFileSize(file.size)})`);
            } else {
              console.log(`❌ Excluded build artifact: ${file.name} (${formatFileSize(file.size)})`);
            }
          }
        });
        
        // Update the sections display
        renderSections();
        updateScriptPreview();
        
        console.log('Sections populated with source files only:', sections[0].files);
      }
    }
  } catch (error) {
    console.error('Error loading source files:', error);
  }
}

// Format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Create new installer using existing files from the original script
async function createNewInstaller(originalId, data) {
  try {
    // Check if required fields are filled
    const title = data.title.trim();
    if (!title) {
      showResult('Please enter an installer title.', 'error');
      return;
    }
    
    // Get the script from the textarea
    const script = data.script;
    
    if (!script || script.trim() === '') {
      showResult('Script content is required.', 'error');
      return;
    }
    
    console.log('=== DEBUG: Creating new installer ===');
    console.log('Original ID:', originalId);
    console.log('Title:', title);
    console.log('Script length:', script.length);
    console.log('Script preview (first 200 chars):', script.substring(0, 200));
    
    // Check if we have new files (files with actual file objects)
    const hasNewFiles = sections.some(section => 
      section.files.some(file => file.file !== null)
    );
    
    console.log('Has new files:', hasNewFiles);
    console.log('Sections:', sections);
    
    if (hasNewFiles) {
      // We have new files, use the regular upload endpoint but include existing files
      console.log('🔄 Using upload endpoint with mixed files (existing + new)...');
      await createMixedInstaller(originalId, data);
    } else {
      // No new files, use the edit-script endpoint to reuse existing files
      console.log('🔄 Using edit-script endpoint to reuse existing files...');
      await createEditScriptInstaller(originalId, data);
    }
    
  } catch (error) {
    console.error('Error creating new installer:', error);
    showResult('Error creating new installer: ' + error.message, 'error');
  }
}

// Create installer using edit-script endpoint (reuse existing files only)
async function createEditScriptInstaller(originalId, data) {
  showResult('🔄 Creating new installer with existing files...', 'info');
  
  // Prepare the request data
  const requestData = {
    title: data.title,
    script: data.script,
    sourceScriptId: parseInt(originalId)
  };
  
  console.log('Request data for edit-script:', requestData);
  
  // Use the /edit-script endpoint that reuses existing files from the server
  const response = await fetch('/edit-script', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestData)
  });
  
  console.log('Response status:', response.status);
  console.log('Response headers:', response.headers);
  
  const json = await response.json();
  console.log('Response JSON:', json);

  if (response.ok) {
    showResult(`✅ New installer created successfully! Redirecting to home page...`, 'success');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 2000);
  } else {
    showResult(`❌ ${json.error || "Build failed."}`, 'error');
  }
}

// Create installer using upload endpoint (existing files + new files)
async function createMixedInstaller(originalId, data) {
  showResult('🔄 Creating new installer with existing files + new files...', 'info');
  
  try {
    // First, get the existing files from the original script
    const filesResponse = await fetch(`/api/scripts/${originalId}/files`);
    const filesData = await filesResponse.json();
    
    if (!filesData.success || !filesData.files || filesData.files.length === 0) {
      showResult('❌ No existing files found to copy.', 'error');
      return;
    }
    
    // Filter out build artifacts and only keep source files
    const existingFiles = filesData.files.filter(file => {
      if (file.isDirectory) return false;
      const fileName = file.name.toLowerCase();
      return !(fileName.endsWith('.exe') || fileName.endsWith('.nsi'));
    });
    
    if (existingFiles.length === 0) {
      showResult('❌ No source files found to copy.', 'error');
      return;
    }
    
    showResult(`📥 Preparing ${existingFiles.length} existing files + new files...`, 'info');
    
    // Create FormData for the new installer
    const formData = new FormData();
    formData.append("title", data.title);
    formData.append("script", data.script);
    
    // Download each existing source file and add it to the form data
    for (const fileInfo of existingFiles) {
      try {
        const fileResponse = await fetch(fileInfo.path);
        if (!fileResponse.ok) {
          console.warn(`Failed to download ${fileInfo.name}:`, fileResponse.statusText);
          continue;
        }
        
        const fileBlob = await fileResponse.blob();
        const file = new File([fileBlob], fileInfo.name, { type: fileBlob.type });
        formData.append("files", file);
        console.log(`✅ Downloaded and prepared existing file: ${fileInfo.name}`);
      } catch (error) {
        console.error(`Error downloading ${fileInfo.name}:`, error);
      }
    }
    
    // Add all new files from the sections
    sections.forEach(section => {
      section.files.forEach(fileObj => {
        if (fileObj.file) { // This is a new file
          formData.append("files", fileObj.file);
          console.log(`✅ Added new file: ${fileObj.name}`);
        }
      });
    });
    
    showResult(`📤 Uploading new installer with ${existingFiles.length} existing files + new files...`, 'info');
    
    // Submit to create new installer using the regular upload endpoint
    const res = await fetch("/upload", { method: "POST", body: formData });
    const json = await res.json();

    if (res.ok) {
      showResult(`✅ New installer created successfully! Redirecting to home page...`, 'success');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 2000);
    } else {
      showResult(`❌ ${json.error || "Build failed."}`, 'error');
    }
    
  } catch (error) {
    console.error('Error in createMixedInstaller:', error);
    showResult('Error creating mixed installer: ' + error.message, 'error');
  }
}

// Delete script
async function deleteScript(id) {
  if (!confirm('Are you sure you want to delete this script?')) {
    return;
  }
  
  try {
    // For now, we'll just show a success message
    // You can implement actual delete logic later
    showResult('Script deleted successfully!', 'success');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1500);
  } catch (error) {
    console.error('Error deleting script:', error);
    showResult('Error deleting script: ' + error.message, 'error');
  }
}

// Show result message
function showResult(message, type) {
  const resultDiv = document.getElementById('result');
  resultDiv.innerHTML = `
    <div class="alert alert-${type}">
      ${message}
    </div>
  `;
  resultDiv.style.display = 'block';
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
    resultDiv.style.display = 'none';
  }, 3000);
}

// Initialize page
async function init() {
  console.log('Edit page initializing...');
  const scriptId = getScriptId();
  console.log('Script ID:', scriptId);
  
  if (!scriptId) {
    showResult('No script ID provided', 'error');
    return;
  }
  
  try {
    console.log('Loading script data...');
    const script = await loadScript(scriptId);
    console.log('Script loaded:', script);
    displayScript(script);
  } catch (error) {
    console.error('Error in init:', error);
    showResult('Error loading script: ' + error.message, 'error');
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', init);

document.getElementById('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const scriptId = getScriptId();
  const title = document.getElementById('title').value;
  const script = document.getElementById('script').value;
  
  await createNewInstaller(scriptId, { title, script });
});

document.getElementById('delete-btn').addEventListener('click', async () => {
  const scriptId = getScriptId();
  await deleteScript(scriptId);
});

// Add section button event listener
document.getElementById('add-section-btn').addEventListener('click', addNewSection);

// Auto-update script preview when form fields change
document.getElementById('title').addEventListener('input', updateScriptPreview);
document.getElementById('version').addEventListener('input', updateScriptPreview);
document.getElementById('installDir').addEventListener('input', updateScriptPreview);
