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

// Display script data in form
function displayScript(script) {
  document.getElementById('title').value = script.title || '';
  document.getElementById('script').value = script.content || '';
  
  // Show builds section if there are files
  if (script.installer_path) {
    showBuildsSection(script);
  }
  
  // Hide loading, show form
  document.getElementById('loading').style.display = 'none';
  document.getElementById('edit-form').style.display = 'block';
}

// Show builds section with file information
async function showBuildsSection(script) {
  const buildsSection = document.getElementById('builds-section');
  const buildsList = document.getElementById('builds-list');
  
  // Extract build info from installer path
  const installerPath = script.installer_path;
  const fileName = installerPath.split('/').pop(); // test_installer.exe
  
  // Fetch uploaded files for this script
  try {
    const response = await fetch(`/api/scripts/${script.id}/files`);
    const fileData = await response.json();
    
    if (fileData.success) {
      let filesHtml = '';
      
      if (fileData.files && fileData.files.length > 0) {
        filesHtml = `
          <div class="uploaded-files">
            <h4>📁 Uploaded Files:</h4>
            <div class="file-list">
              ${fileData.files.map(file => `
                <div class="file-item">
                  <div class="file-info">
                    <span class="file-name">${file.isDirectory ? '📁 ' : '📄 '}${file.name}</span>
                    <span class="file-size">${formatFileSize(file.size)}</span>
                  </div>
                  <div class="file-actions">
                    <a href="${file.path}" class="btn-small" target="_blank">⬇️ Download</a>
                    <span class="file-date">${new Date(file.modified).toLocaleDateString()}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }
      
      buildsList.innerHTML = `
        <div class="build-info">
          <p><strong>Installer:</strong> <a href="${installerPath}" target="_blank">Download</a></p>
          <p><strong>File Size:</strong> ${formatFileSize(script.total_size || 0)}</p>
          <p><strong>Files Count:</strong> ${script.file_count || 0}</p>
          <p><strong>Created:</strong> ${new Date(script.created_at).toLocaleString()}</p>
          <p><strong>Build Directory:</strong> <code>${fileData.buildDir}</code></p>
        </div>
        ${filesHtml}
      `;
    } else {
      buildsList.innerHTML = `
        <div class="build-info">
          <p><strong>Installer:</strong> <a href="${installerPath}" target="_blank">Download</a></p>
          <p><strong>File Size:</strong> ${formatFileSize(script.total_size || 0)}</p>
          <p><strong>Files Count:</strong> ${script.file_count || 0}</p>
          <p><strong>Created:</strong> ${new Date(script.created_at).toLocaleString()}</p>
        </div>
        <div class="alert alert-error">Failed to load uploaded files</div>
      `;
    }
  } catch (error) {
    console.error('Error fetching files:', error);
    buildsList.innerHTML = `
      <div class="build-info">
        <p><strong>Installer:</strong> <a href="${installerPath}" target="_blank">Download</a></p>
        <p><strong>File Size:</strong> ${formatFileSize(script.total_size || 0)}</p>
        <p><strong>Files Count:</strong> ${script.file_count || 0}</p>
        <p><strong>Created:</strong> ${new Date(script.created_at).toLocaleString()}</p>
      </div>
      <div class="alert alert-error">Error loading uploaded files</div>
    `;
  }
  
  buildsSection.style.display = 'block';
}

// Format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Update script
async function updateScript(id, data) {
  try {
    // For now, we'll just show a success message
    // You can implement actual update logic later
    showResult('Script updated successfully!', 'success');
  } catch (error) {
    console.error('Error updating script:', error);
    showResult('Error updating script: ' + error.message, 'error');
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
  
  await updateScript(scriptId, { title, script });
});

document.getElementById('delete-btn').addEventListener('click', async () => {
  const scriptId = getScriptId();
  await deleteScript(scriptId);
});
