// AirDrop Local File Drop - Client Application
let networkUrl = window.location.origin;
let filesData = [];

// DOM Elements
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const folderInput = document.getElementById('folder-input');
const browseFilesBtn = document.getElementById('browse-files-btn');
const browseFolderBtn = document.getElementById('browse-folder-btn');
const uploadQueue = document.getElementById('upload-queue');
const queueList = document.getElementById('queue-list');
const filesList = document.getElementById('files-list');
const filesCounter = document.getElementById('files-counter');
const searchInput = document.getElementById('search-input');
const refreshBtn = document.getElementById('refresh-btn');
const networkUrlEl = document.getElementById('network-url');
const copyUrlBtn = document.getElementById('copy-url-btn');
const deviceStatus = document.getElementById('device-status');
const themeBtn = document.getElementById('theme-btn');
const themeIcon = document.getElementById('theme-icon');
const qrBtn = document.getElementById('qr-btn');
const qrModal = document.getElementById('qr-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const qrcodeContainer = document.getElementById('qrcode-container');
const modalUrl = document.getElementById('modal-url');
const toastContainer = document.getElementById('toast-container');

// Tab & Clipboard DOM Elements
const tabFilesBtn = document.getElementById('tab-files-btn');
const tabNotesBtn = document.getElementById('tab-notes-btn');
const tabFilesContent = document.getElementById('tab-files-content');
const tabNotesContent = document.getElementById('tab-notes-content');
const tabFilesCounter = document.getElementById('tab-files-counter');
const tabNotesCounter = document.getElementById('tab-notes-counter');
const noteInput = document.getElementById('note-input');
const sendNoteBtn = document.getElementById('send-note-btn');
const clearInputBtn = document.getElementById('clear-input-btn');
const notesList = document.getElementById('notes-list');
const notesCounter = document.getElementById('notes-counter');
const clearAllNotesBtn = document.getElementById('clear-all-notes-btn');

let notesData = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initTabs();
  fetchServerInfo();
  loadFiles();
  loadNotes();
  setupEventListeners();
  
  // Auto-refresh file and note lists every 5 seconds to sync between devices
  setInterval(() => {
    loadFiles();
    loadNotes();
  }, 5000);
});

// Setup Listeners
function setupEventListeners() {
  // Theme Toggle
  themeBtn.addEventListener('click', toggleTheme);

  // Browse links
  if (browseFilesBtn) {
    browseFilesBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });
  }
  if (browseFolderBtn) {
    browseFolderBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      folderInput.click();
    });
  }

  // Drop Zone Clicks & Drags
  dropZone.addEventListener('click', (e) => {
    if (e.target !== browseFilesBtn && e.target !== browseFolderBtn) {
      fileInput.click();
    }
  });
  fileInput.addEventListener('change', handleFileSelection);
  if (folderInput) {
    folderInput.addEventListener('change', handleFolderSelection);
  }

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('dragover');
    });
  });

  dropZone.addEventListener('drop', async (e) => {
    const items = e.dataTransfer.items;
    if (items && items.length > 0) {
      const entriesToProcess = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.webkitGetAsEntry) {
          const entry = item.webkitGetAsEntry();
          if (entry) entriesToProcess.push(entry);
        }
      }

      if (entriesToProcess.length > 0) {
        showToast('Scanning files and folders...');
        const allItems = [];
        for (const entry of entriesToProcess) {
          await traverseEntry(entry, '', allItems);
        }
        if (allItems.length > 0) {
          uploadItemList(allItems);
          return;
        }
      }
    }

    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length > 0) {
      uploadFiles(dt.files);
    }
  });

  // Global window drop prevention
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => e.preventDefault());

  // Copy URL
  copyUrlBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(networkUrl).then(() => {
      showToast('Network URL copied to clipboard!');
    }).catch(() => {
      showToast('Failed to copy URL');
    });
  });

  // QR Code Modal
  qrBtn.addEventListener('click', openQRModal);
  closeModalBtn.addEventListener('click', closeQRModal);
  qrModal.addEventListener('click', (e) => {
    if (e.target === qrModal) closeQRModal();
  });

  // Refresh & Filter
  refreshBtn.addEventListener('click', () => {
    loadFiles();
    showToast('File list refreshed');
  });

  searchInput.addEventListener('input', () => {
    renderFiles(filterFiles(searchInput.value));
  });

  // Tab switching
  if (tabFilesBtn) tabFilesBtn.addEventListener('click', () => switchTab('files'));
  if (tabNotesBtn) tabNotesBtn.addEventListener('click', () => switchTab('notes'));

  // Clipboard actions
  if (sendNoteBtn) sendNoteBtn.addEventListener('click', sendNote);
  if (clearInputBtn) clearInputBtn.addEventListener('click', () => {
    noteInput.value = '';
    noteInput.focus();
  });
  if (clearAllNotesBtn) clearAllNotesBtn.addEventListener('click', clearAllNotes);
  if (noteInput) {
    noteInput.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        sendNote();
      }
    });
  }
}

// Fetch Server Network Information
async function fetchServerInfo() {
  try {
    const res = await fetch('/api/info');
    if (!res.ok) throw new Error();
    const data = await res.json();
    
    // Prefer network IP if accessed from localhost
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      networkUrl = data.network_url;
    } else {
      networkUrl = window.location.origin;
    }

    networkUrlEl.textContent = networkUrl;
    deviceStatus.textContent = `Online • Host: ${data.hostname} (${data.local_ip})`;
    modalUrl.textContent = networkUrl;
    generateQRCode(networkUrl);
  } catch (err) {
    networkUrlEl.textContent = window.location.origin;
    deviceStatus.textContent = 'Online • Local Server';
    modalUrl.textContent = window.location.origin;
    generateQRCode(window.location.origin);
  }
}

// QR Code Generation
function generateQRCode(url) {
  qrcodeContainer.innerHTML = '';
  if (typeof QRCode !== 'undefined') {
    new QRCode(qrcodeContainer, {
      text: url,
      width: 180,
      height: 180,
      colorDark: '#0f172a',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
  } else {
    // Fallback if CDN is unreachable
    qrcodeContainer.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}" alt="QR Code" />`;
  }
}

function openQRModal() {
  qrModal.classList.remove('hidden');
}

function closeQRModal() {
  qrModal.classList.add('hidden');
}

// Load Files from Server
async function loadFiles() {
  try {
    const res = await fetch('/api/files');
    if (!res.ok) return;
    const data = await res.json();
    filesData = data.files || [];
    if (filesCounter) filesCounter.textContent = filesData.length;
    if (tabFilesCounter) tabFilesCounter.textContent = filesData.length;
    renderFiles(filterFiles(searchInput.value));
  } catch (err) {
    console.error('Failed to load files:', err);
  }
}

// Filter Files
function filterFiles(query) {
  if (!query) return filesData;
  const q = query.toLowerCase();
  return filesData.filter(f => f.name.toLowerCase().includes(q));
}

// Render Files Grid
function renderFiles(files) {
  if (files.length === 0) {
    filesList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📂</div>
        <h3>No files found</h3>
        <p>Drop files or folders into the zone above to share with any connected device.</p>
      </div>
    `;
    return;
  }

  filesList.innerHTML = files.map(file => {
    if (file.type === 'folder') {
      const folderId = 'folder-' + Math.random().toString(36).substr(2, 9);
      const innerListHtml = (file.inner_files || []).map(inner => `
        <div class="inner-file-row">
          <span class="inner-file-name" title="${escapeHtml(inner.rel_path)}">📄 ${escapeHtml(inner.rel_path)}</span>
          <span class="inner-file-size">${inner.formatted_size}</span>
          <div class="inner-file-actions">
            <a href="/view/${encodeURIComponent(inner.full_path)}" target="_blank" class="btn-action" title="Preview / Open inline">
              👁️
            </a>
            <a href="/download/${encodeURIComponent(inner.full_path)}" download class="btn-action download" title="Download file">
              ⬇️
            </a>
          </div>
        </div>
      `).join('');

      return `
        <div class="file-card folder-card">
          <div class="file-info-group">
            <div class="file-type-icon">📁</div>
            <div class="file-meta">
              <div class="file-name" title="${escapeHtml(file.name)}">
                ${escapeHtml(file.name)}
                <span class="badge folder-badge">${file.file_count} files</span>
              </div>
              <div class="file-details">
                <span>${file.formatted_size}</span> • <span>${file.modified}</span>
              </div>
            </div>
          </div>
          <div class="file-actions">
            <button onclick="toggleFolderDetails('${folderId}')" class="btn-action" title="View files inside folder">
              👁️ View (${file.file_count})
            </button>
            <a href="/download-zip/${encodeURIComponent(file.name)}" class="btn-action download" title="Download entire folder as ZIP">
              📦 Download ZIP
            </a>
            <button onclick="deleteFile('${encodeURIComponent(file.name)}')" class="btn-action delete" title="Delete folder">
              🗑️
            </button>
          </div>
        </div>
        <div id="${folderId}" class="folder-details hidden">
          ${innerListHtml || '<div class="inner-file-empty" style="color: var(--text-subtle); font-size: 0.8rem;">Folder is empty</div>'}
        </div>
      `;
    }

    const icon = getFileIcon(file.name, file.mime);
    return `
      <div class="file-card">
        <div class="file-info-group">
          <div class="file-type-icon">${icon}</div>
          <div class="file-meta">
            <div class="file-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</div>
            <div class="file-details">
              <span>${file.formatted_size}</span> • <span>${file.modified}</span>
            </div>
          </div>
        </div>
        <div class="file-actions">
          <a href="/view/${encodeURIComponent(file.name)}" target="_blank" class="btn-action" title="Preview / Open inline">
            👁️ Preview
          </a>
          <a href="/download/${encodeURIComponent(file.name)}" download class="btn-action download" title="Download">
            ⬇️ Download
          </a>
          <button onclick="copyFileLink('${encodeURIComponent(file.name)}')" class="btn-action" title="Copy Link">
            📋
          </button>
          <button onclick="deleteFile('${encodeURIComponent(file.name)}')" class="btn-action delete" title="Delete">
            🗑️
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Upload Handling
function handleFileSelection(e) {
  if (e.target.files && e.target.files.length > 0) {
    uploadFiles(e.target.files);
    fileInput.value = '';
  }
}

function handleFolderSelection(e) {
  if (e.target.files && e.target.files.length > 0) {
    const items = Array.from(e.target.files).map(file => ({
      file,
      relPath: file.webkitRelativePath || file.name
    }));
    uploadItemList(items);
    folderInput.value = '';
  }
}

// Recursive directory entries traversal
async function traverseEntry(entry, currentPath, fileList) {
  if (entry.isFile) {
    const file = await new Promise((resolve) => entry.file(resolve));
    fileList.push({
      file,
      relPath: currentPath ? `${currentPath}/${file.name}` : file.name
    });
  } else if (entry.isDirectory) {
    const dirReader = entry.createReader();
    const newPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
    const entries = await readAllDirectoryEntries(dirReader);
    for (const child of entries) {
      await traverseEntry(child, newPath, fileList);
    }
  }
}

async function readAllDirectoryEntries(dirReader) {
  const entries = [];
  const readBatch = () => new Promise((resolve) => dirReader.readEntries(resolve));
  let batch = await readBatch();
  while (batch && batch.length > 0) {
    entries.push(...batch);
    batch = await readBatch();
  }
  return entries;
}

function uploadFiles(fileList) {
  const items = Array.from(fileList).map(file => ({
    file,
    relPath: file.name
  }));
  uploadItemList(items);
}

async function uploadItemList(items) {
  uploadQueue.classList.remove('hidden');

  // Separate loose files from folders
  const looseFiles = [];
  const foldersMap = {};

  items.forEach(item => {
    const parts = item.relPath.replace(/\\/g, '/').split('/');
    if (parts.length > 1) {
      const folderName = parts[0];
      const innerPath = parts.slice(1).join('/');
      if (!foldersMap[folderName]) {
        foldersMap[folderName] = [];
      }
      foldersMap[folderName].push({ file: item.file, innerPath });
    } else {
      looseFiles.push(item.file);
    }
  });

  // 1. Process and auto-zip any folders
  for (const [folderName, folderFiles] of Object.entries(foldersMap)) {
    if (typeof JSZip !== 'undefined') {
      const queueId = 'queue-' + Math.random().toString(36).substr(2, 9);
      addQueueItem(queueId, `📦 Zipping '${folderName}' (${folderFiles.length} files)...`);

      try {
        const zip = new JSZip();
        for (const item of folderFiles) {
          zip.file(item.innerPath, item.file);
        }

        const zipBlob = await zip.generateAsync({
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 }
        }, (metadata) => {
          updateQueueProgress(queueId, Math.round(metadata.percent));
        });

        const zipFileName = `${folderName}.zip`;
        const zipFile = new File([zipBlob], zipFileName, { type: 'application/zip' });

        // Update queue item label to uploading
        const itemEl = document.getElementById(queueId);
        if (itemEl) {
          itemEl.querySelector('.queue-filename').textContent = `Uploading ${zipFileName}...`;
        }

        uploadSingleFile(zipFile, zipFileName, queueId);
      } catch (err) {
        console.error('Failed to auto-zip folder:', err);
        showToast(`Failed to zip ${folderName}, uploading individually...`);
        folderFiles.forEach(f => uploadSingleFile(f.file, f.file.name));
      }
    } else {
      // Fallback if JSZip is unavailable
      folderFiles.forEach(f => uploadSingleFile(f.file, f.file.name));
    }
  }

  // 2. Upload loose files individually
  looseFiles.forEach(file => {
    uploadSingleFile(file, file.name);
  });
}

function uploadSingleFile(file, fileName, existingQueueId = null) {
  const queueId = existingQueueId || ('queue-' + Math.random().toString(36).substr(2, 9));
  if (!existingQueueId) {
    addQueueItem(queueId, fileName);
  }

  const xhr = new XMLHttpRequest();
  const url = `/api/upload?filename=${encodeURIComponent(fileName)}`;

  xhr.open('POST', url, true);
  xhr.setRequestHeader('X-File-Name', encodeURIComponent(fileName));

  xhr.upload.onprogress = (e) => {
    if (e.lengthComputable) {
      const percent = Math.round((e.loaded / e.total) * 100);
      updateQueueProgress(queueId, percent);
    }
  };

  xhr.onload = () => {
    if (xhr.status >= 200 && xhr.status < 300) {
      removeQueueItem(queueId);
      showToast(`Uploaded: ${fileName}`);
      loadFiles();
    } else {
      markQueueError(queueId, 'Upload failed');
      showToast(`Failed to upload ${fileName}`);
    }
  };

  xhr.onerror = () => {
    markQueueError(queueId, 'Network error');
    showToast(`Error uploading ${fileName}`);
  };

  xhr.send(file);
}

function addQueueItem(id, filename) {
  const item = document.createElement('div');
  item.id = id;
  item.className = 'queue-item';
  item.innerHTML = `
    <div class="queue-header">
      <span class="queue-filename">${escapeHtml(filename)}</span>
      <span class="queue-percent">0%</span>
    </div>
    <div class="progress-bar-bg">
      <div class="progress-bar-fill"></div>
    </div>
  `;
  queueList.appendChild(item);
}

function updateQueueProgress(id, percent) {
  const item = document.getElementById(id);
  if (!item) return;
  item.querySelector('.queue-percent').textContent = `${percent}%`;
  item.querySelector('.progress-bar-fill').style.width = `${percent}%`;
}

function removeQueueItem(id) {
  const item = document.getElementById(id);
  if (item) {
    setTimeout(() => {
      item.remove();
      if (queueList.children.length === 0) {
        uploadQueue.classList.add('hidden');
      }
    }, 500);
  }
}

function markQueueError(id, msg) {
  const item = document.getElementById(id);
  if (!item) return;
  item.querySelector('.queue-percent').textContent = msg;
  item.querySelector('.progress-bar-fill').style.backgroundColor = 'var(--accent-red)';
}

// Delete File
window.deleteFile = async function(encodedFilename) {
  const filename = decodeURIComponent(encodedFilename);
  if (!confirm(`Are you sure you want to delete "${filename}"?`)) return;

  try {
    const res = await fetch(`/api/files/${encodedFilename}`, { method: 'DELETE' });
    if (res.ok) {
      showToast(`Deleted ${filename}`);
      loadFiles();
    } else {
      showToast(`Failed to delete ${filename}`);
    }
  } catch (err) {
    showToast(`Error deleting ${filename}`);
  }
};

// Copy Link
window.copyFileLink = function(encodedFilename) {
  const downloadUrl = `${networkUrl}/download/${encodedFilename}`;
  navigator.clipboard.writeText(downloadUrl).then(() => {
    showToast('Download link copied!');
  }).catch(() => {
    showToast('Failed to copy link');
  });
};

// Helpers
function getFileIcon(filename, mime) {
  const ext = filename.split('.').pop().toLowerCase();
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp'].includes(ext)) return '🖼️';
  if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) return '🎥';
  if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext)) return '🎵';
  if (['pdf'].includes(ext)) return '📕';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return '📦';
  if (['txt', 'md', 'json', 'js', 'py', 'html', 'css', 'ts', 'cs'].includes(ext)) return '📄';
  if (['doc', 'docx'].includes(ext)) return '📝';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return '📊';
  return '📁';
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>⚡</span><span>${escapeHtml(message)}</span>`;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Theme
function initTheme() {
  const saved = localStorage.getItem('airdrop_theme_mode') || 'light';
  applyTheme(saved);
}

function toggleTheme() {
  const isDark = document.body.classList.contains('dark-theme');
  applyTheme(isDark ? 'light' : 'dark');
}

function applyTheme(theme) {
  if (theme === 'dark') {
    document.body.classList.add('dark-theme');
    document.body.classList.remove('light-theme');
    themeIcon.textContent = '🌙';
  } else {
    document.body.classList.remove('dark-theme');
    document.body.classList.add('light-theme');
    themeIcon.textContent = '☀️';
  }
  localStorage.setItem('airdrop_theme_mode', theme);
}

// Toggle folder accordion
window.toggleFolderDetails = function(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.toggle('hidden');
  }
};

// Tabs Management
function initTabs() {
  const activeTab = localStorage.getItem('airdrop_active_tab') || 'files';
  switchTab(activeTab);
}

function switchTab(tabName) {
  if (tabName === 'files') {
    if (tabFilesBtn) tabFilesBtn.classList.add('active');
    if (tabNotesBtn) tabNotesBtn.classList.remove('active');
    if (tabFilesContent) tabFilesContent.classList.remove('hidden');
    if (tabNotesContent) tabNotesContent.classList.add('hidden');
  } else {
    if (tabNotesBtn) tabNotesBtn.classList.add('active');
    if (tabFilesBtn) tabFilesBtn.classList.remove('active');
    if (tabNotesContent) tabNotesContent.classList.remove('hidden');
    if (tabFilesContent) tabFilesContent.classList.add('hidden');
  }
  localStorage.setItem('airdrop_active_tab', tabName);
}

// Shared Notes / Clipboard Management
async function loadNotes() {
  try {
    const res = await fetch('/api/notes');
    if (!res.ok) return;
    const data = await res.json();
    notesData = data.notes || [];
    if (notesCounter) notesCounter.textContent = notesData.length;
    if (tabNotesCounter) tabNotesCounter.textContent = notesData.length;
    renderNotes(notesData);
  } catch (err) {
    console.error('Failed to load notes:', err);
  }
}

function renderNotes(notes) {
  if (!notesList) return;

  if (notes.length === 0) {
    if (clearAllNotesBtn) clearAllNotesBtn.style.display = 'none';
    notesList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📝</div>
        <h3>No shared text yet</h3>
        <p>Type or paste any link, note, or snippet above to sync it instantly with nearby devices.</p>
      </div>
    `;
    return;
  }

  if (clearAllNotesBtn) clearAllNotesBtn.style.display = 'inline-flex';

  notesList.innerHTML = notes.map(note => {
    let contentHtml = '';
    if (note.is_url) {
      contentHtml = `
        <a href="${escapeHtml(note.text)}" target="_blank" rel="noopener noreferrer" class="note-link" title="Open link in new tab">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
          </svg>
          <span>${escapeHtml(note.text)}</span>
        </a>
      `;
    } else {
      contentHtml = `<div class="note-content">${escapeHtml(note.text)}</div>`;
    }

    const safeTextJson = JSON.stringify(note.text).replace(/"/g, '&quot;');

    return `
      <div class="note-card">
        ${contentHtml}
        <div class="note-footer">
          <span class="note-time">${escapeHtml(note.timestamp)}</span>
          <div class="note-actions">
            <button onclick="copyNoteText(${safeTextJson})" class="btn-action" title="Copy text to clipboard">
              📋 Copy
            </button>
            <button onclick="deleteNote('${note.id}')" class="btn-action delete" title="Delete note">
              🗑️
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function sendNote() {
  if (!noteInput) return;
  const text = noteInput.value.trim();
  if (!text) {
    showToast('Please enter text or a link to share');
    return;
  }

  if (sendNoteBtn) sendNoteBtn.disabled = true;
  try {
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    if (res.ok) {
      noteInput.value = '';
      showToast('Text shared successfully!');
      loadNotes();
    } else {
      showToast('Failed to share text');
    }
  } catch (err) {
    showToast('Error sharing text');
  } finally {
    if (sendNoteBtn) sendNoteBtn.disabled = false;
  }
}

window.copyNoteText = function(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Copied to clipboard!');
  }).catch(() => {
    showToast('Failed to copy');
  });
};

window.deleteNote = async function(id) {
  try {
    const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Note deleted');
      loadNotes();
    } else {
      showToast('Failed to delete note');
    }
  } catch (err) {
    showToast('Error deleting note');
  }
};

window.clearAllNotes = async function() {
  if (!confirm('Are you sure you want to delete all shared notes?')) return;
  try {
    const res = await fetch('/api/notes', { method: 'DELETE' });
    if (res.ok) {
      showToast('All notes cleared');
      loadNotes();
    } else {
      showToast('Failed to clear notes');
    }
  } catch (err) {
    showToast('Error clearing notes');
  }
};


