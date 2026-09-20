// AirDrop Local File Drop - Client Application
let networkUrl = window.location.origin;
let filesData = [];

// DOM Elements
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  fetchServerInfo();
  loadFiles();
  setupEventListeners();
  
  // Auto-refresh file list every 5 seconds to sync between devices
  setInterval(loadFiles, 5000);
});

// Setup Listeners
function setupEventListeners() {
  // Theme Toggle
  themeBtn.addEventListener('click', toggleTheme);

  // Drop Zone Clicks & Drags
  dropZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', handleFileSelection);

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

  dropZone.addEventListener('drop', (e) => {
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
    filesCounter.textContent = filesData.length;
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
        <p>Drop files into the zone above to share with any connected device.</p>
      </div>
    `;
    return;
  }

  filesList.innerHTML = files.map(file => {
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
    fileInput.value = ''; // Reset
  }
}

function uploadFiles(fileList) {
  uploadQueue.classList.remove('hidden');

  Array.from(fileList).forEach(file => {
    const queueId = 'queue-' + Math.random().toString(36).substr(2, 9);
    addQueueItem(queueId, file.name);

    const xhr = new XMLHttpRequest();
    const url = `/api/upload?filename=${encodeURIComponent(file.name)}`;

    xhr.open('POST', url, true);
    xhr.setRequestHeader('X-File-Name', encodeURIComponent(file.name));

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        updateQueueProgress(queueId, percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        removeQueueItem(queueId);
        showToast(`Uploaded: ${file.name}`);
        loadFiles();
      } else {
        markQueueError(queueId, 'Upload failed');
        showToast(`Failed to upload ${file.name}`);
      }
    };

    xhr.onerror = () => {
      markQueueError(queueId, 'Network error');
      showToast(`Error uploading ${file.name}`);
    };

    xhr.send(file);
  });
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
  const saved = localStorage.getItem('airdrop_theme') || 'dark';
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
  localStorage.setItem('airdrop_theme', theme);
}
