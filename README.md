<div align="center">

# 📡 AirDrop - Local Network File Drop

**A blazing-fast, zero-dependency, private local network file sharing web app.**  
Transfer photos, 4K videos, documents, and folders directly between your PC, Mac, iPhone, and Android over local Wi-Fi.

[![Python 3.8+](https://img.shields.io/badge/python-3.8+-3776AB.svg?style=flat&logo=python&logoColor=white)](https://www.python.org)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-zero-brightgreen.svg?style=flat)](https://docs.python.org/3/library/)
[![Cross Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux%20%7C%20Mobile-blue.svg?style=flat)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat)](LICENSE)

</div>

---

## 💡 Why AirDrop Local?

Sending a file from your PC to your phone (or vice versa) shouldn't require:
- ❌ Uploading to Google Drive / OneDrive just to download it 1 minute later.
- ❌ Sending compressed images/videos over WhatsApp or Telegram.
- ❌ Installing proprietary 3rd-party apps on every device.
- ❌ Being locked into a single ecosystem (like Apple AirDrop).

**AirDrop Local** solves this by turning any computer into a local Wi-Fi file hub in one second. Open the page on any phone or computer on the same network and start transferring at full local router speeds.

---

## ✨ Features

- **⚡ Zero External Dependencies**: Built with 100% pure Python standard library (`http.server`, `socket`). No `pip install`, no virtual environments, no node_modules.
- **📱 Instant QR Code Pairing**: Click "Scan to Connect" on your PC, scan the QR code with your phone's camera, and you're instantly ready to transfer.
- **🚀 Multi-Threaded Transfers**: Concurrent uploads and downloads without blocking other connected devices.
- **📂 Drag & Drop Simplicity**: Drop single files or batches directly into the browser drop zone.
- **📊 Real-Time Progress**: Accurate upload progress bar, upload speed, and transfer size indicators.
- **👁️ In-Browser Previews**: Preview images, videos, audio, and documents inline before downloading.
- **🔄 Live Auto-Sync**: The file list automatically syncs every 5 seconds across all connected devices.
- **🌓 Dark & Light Modes**: Beautiful modern interface with automatic theme persistence.
- **🛡️ 100% Private & Offline**: Transfers happen strictly on your local network. No external servers or internet connection required.

---

## 🚀 Quick Start

### 1. Prerequisites
- [Python 3.8+](https://www.python.org/downloads/) installed.

### 2. Run the App

#### On Windows:
Just double-click **`run.bat`**, or run:
```powershell
python app.py
```

#### On macOS / Linux:
```bash
python3 app.py
```

The app will start the server and automatically launch `http://localhost:5050` in your default browser.

---

## 📱 Connecting Mobile Devices (iOS & Android)

1. Make sure your phone/tablet is connected to the **same Wi-Fi network** as your host computer.
2. Click **"Scan to Connect"** in the top right of the web interface.
3. Point your phone camera at the QR code.
4. Tap the link to open the transfer portal—now you can:
   - **Upload to PC**: Tap the drop zone to choose photos, videos, or files from your phone.
   - **Download to Phone**: Tap the download icon next to any file shared from your PC.

---

## 📁 Project Structure

```text
browser/
├── app.py              # Pure Python multi-threaded HTTP server & REST API
├── run.bat             # One-click Windows launcher
├── README.md           # Project documentation
├── .gitignore          # Git ignore rules (protects your uploads)
├── static/
│   ├── index.html      # Responsive web UI & QR modal
│   ├── style.css       # Modern CSS with dark/light theme
│   └── app.js          # File transfer logic, progress tracking & live sync
└── uploads/            # Local directory where transferred files are saved
    └── .gitkeep
```

---

## ⚙️ Configuration

You can customize the port by modifying the `PORT` constant at the top of `app.py`:

```python
PORT = 5050  # Change to any port you prefer
```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!  
Feel free to check the [issues page](../../issues) if you want to contribute.

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
