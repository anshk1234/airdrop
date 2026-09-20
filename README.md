<div align="center">

# 📡 AirDrop - Local Network File Drop

**A blazing-fast, zero-dependency, private local network file sharing web app.**  
Transfer photos, 4K videos, documents, and archives directly between your PC, Mac, iPhone, and Android over local Wi-Fi.

[![Python 3.8+](https://img.shields.io/badge/python-3.8+-3776AB.svg?style=flat&logo=python&logoColor=white)](https://www.python.org)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-zero-brightgreen.svg?style=flat)](https://docs.python.org/3/library/)
[![Cross Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux%20%7C%20iOS%20%7C%20Android-blue.svg?style=flat)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat)](LICENSE)

```
        ┌─────────────────────────────────────────────────────┐
        │                 Your Wi-Fi Router                   │
        └──────────────┬───────────────────────┬──────────────┘
                       │                       │
         ┌─────────────▼─────────────┐   ┌─────▼─────────────────────┐
         │     Host PC / Laptop      │   │   Phone / Tablet / Mac    │
         │   (Runs Python Server)    │   │  (Opens Browser via QR)   │
         │  http://localhost:5050    │   │ http://192.168.x.x:5050   │
         └───────────────────────────┘   └───────────────────────────┘
```

</div>

---

## 💡 Why AirDrop Local?

Sending a file from your PC to your phone (or vice versa) shouldn't require:
- ❌ Uploading to Google Drive or OneDrive just to download it 1 minute later.
- ❌ Sending compressed images/videos over WhatsApp or Telegram.
- ❌ Installing proprietary apps and creating accounts on every device.
- ❌ Being locked into a single ecosystem (like Apple AirDrop).

**AirDrop Local** solves this by turning any computer into a local Wi-Fi file hub in seconds. Open the page on any phone, tablet, or computer on the same network and transfer at full local router speeds (no internet data consumed!).

---

## ✨ Key Features

- **⚡ Zero External Dependencies**: Built with 100% pure Python standard library (`http.server`, `socket`). No `pip install`, no virtual environments, no bloat.
- **📱 Instant QR Code Pairing**: Click "Scan to Connect" on your PC, point your phone's camera at the QR code, and you're instantly ready to transfer.
- **🚀 Multi-Threaded Transfers**: Concurrent uploads and downloads without freezing or blocking other connected devices.
- **📂 Drag & Drop Simplicity**: Drop single files or batches directly into the browser drop zone.
- **📊 Real-Time Progress**: Accurate upload progress bar, upload speed, and transfer size indicators.
- **👁️ In-Browser Previews**: Preview images, videos, audio, and documents inline before downloading.
- **🔄 Live Auto-Sync**: The file list automatically updates every 5 seconds across all connected devices.
- **🌓 Dark & Light Modes**: Modern glassmorphism UI with automatic theme persistence.
- **🛡️ 100% Private & Offline**: Transfers happen strictly on your local network. No external servers or internet connection required.

---

## 🚀 Quick Start Guide

### 1. Clone the Repository
```bash
git clone https://github.com/anshk1234/airdrop.git
cd airdrop
```

### 2. Run the App

#### 🪟 Windows:
Double-click **`run.bat`**, or run:
```powershell
python app.py
```

#### 🍎 macOS / 🐧 Linux:
Run the shell script or start with Python:
```bash
chmod +x run.sh
./run.sh
# or:
python3 app.py
```

The server will start and automatically launch **`http://localhost:5050`** in your default browser.

---

## 📱 How to Connect Your Phone or Tablet

1. Ensure your phone/tablet is connected to the **same Wi-Fi network** as your host computer.
2. On your computer screen, click the **"Scan to Connect"** button in the top-right corner.
3. Scan the QR code with your phone's camera (or open the network URL shown on screen, e.g. `http://192.168.1.5:5050`).
4. **Send from Phone to PC**: Tap the drop zone to pick photos, videos, or documents from your phone.
5. **Download from PC to Phone**: Tap the download icon next to any file shared from your PC.

---

## 📁 Project Structure

```text
airdrop/
├── app.py              # Pure Python multi-threaded HTTP server & REST API
├── run.bat             # One-click Windows launcher
├── run.sh              # One-click macOS / Linux launcher
├── README.md           # Project documentation
├── LICENSE             # MIT License
├── .gitignore          # Excludes temporary files and user uploads
├── static/
│   ├── index.html      # Responsive web UI & QR modal
│   ├── style.css       # Modern CSS with dark/light theme
│   └── app.js          # File transfer logic, progress tracking & live sync
└── uploads/            # Local directory where transferred files are saved
    └── .gitkeep
```

---

## ⚙️ Configuration

You can customize the port by modifying the `PORT` variable near the top of [`app.py`](app.py):

```python
PORT = 5050  # Change to 8080, 3000, or any free port
```

---

## ❓ Troubleshooting & FAQ

<details>
<summary><b>1. My phone cannot open the page (Connection timed out)</b></summary>

- **Same Network**: Verify both your phone and PC are connected to the exact same Wi-Fi network (and not one on cellular data or guest Wi-Fi).
- **Windows Firewall**: When running Python for the first time, Windows Defender may ask for network permissions. Ensure you allow Python on **Private Networks**.
- **Router AP Isolation**: Some public or university Wi-Fi networks enable "Client Isolation", which prevents devices from talking to each other. On home routers, this is disabled by default.
</details>

<details>
<summary><b>2. Where are the uploaded files saved?</b></summary>

All files are permanently saved to the [`uploads/`](uploads/) folder inside the project directory. You can open and manage them directly through your operating system's file manager anytime.
</details>

<details>
<summary><b>3. Is there any file size limit?</b></summary>

No! Because transfers are handled via chunked binary streams over your local network, you can transfer files of any size (even 10GB+ video files) at the maximum speed your Wi-Fi router supports.
</details>

---

## 🤝 Contributing

Contributions, feature suggestions, and bug reports are welcome!  
Feel free to open an [issue](https://github.com/anshk1234/airdrop/issues) or submit a pull request.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
