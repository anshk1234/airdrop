import os
import sys
import json
import socket
import urllib.parse
import mimetypes
import webbrowser
import shutil
import zipfile
import tempfile
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn
from datetime import datetime

PORT = 5050
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
STATIC_DIR = os.path.join(BASE_DIR, "static")
NOTES_FILE = os.path.join(BASE_DIR, "shared_notes.json")

os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(STATIC_DIR, exist_ok=True)

def load_notes():
    """Loads shared notes from JSON file."""
    if not os.path.exists(NOTES_FILE):
        return []
    try:
        with open(NOTES_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []

def save_notes(notes):
    """Saves shared notes to JSON file."""
    try:
        with open(NOTES_FILE, "w", encoding="utf-8") as f:
            json.dump(notes, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"[!] Error saving shared notes: {e}")

def get_local_ip():
    """Finds the local network IP address of the machine."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Doesn't need to be reachable, just triggers routing table lookup
        s.connect(('10.255.255.255', 1))
        ip = s.getsockname()[0]
    except Exception:
        try:
            ip = socket.gethostbyname(socket.gethostname())
        except Exception:
            ip = '127.0.0.1'
    finally:
        s.close()
    return ip

def format_size(bytes_size):
    """Converts bytes into human readable format."""
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if bytes_size < 1024.0:
            return f"{bytes_size:.1f} {unit}" if unit != 'B' else f"{int(bytes_size)} B"
        bytes_size /= 1024.0
    return f"{bytes_size:.1f} PB"

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    """Handle requests in separate threads for fast concurrent uploads/downloads."""
    daemon_threads = True

class FileDropHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Clean logging format
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {self.address_string()} - {format % args}")

    def send_json(self, data, status=200):
        response = json.dumps(data).encode('utf-8')
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(response)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(response)

    def do_OPTIONS(self):
        # Handle CORS preflight
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-File-Name")
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/" or path == "/index.html":
            self.serve_file(os.path.join(STATIC_DIR, "index.html"), "text/html; charset=utf-8")
        elif path.startswith("/static/"):
            rel_path = path[len("/static/"):]
            safe_path = os.path.normpath(os.path.join(STATIC_DIR, rel_path))
            if safe_path.startswith(STATIC_DIR) and os.path.isfile(safe_path):
                mime, _ = mimetypes.guess_type(safe_path)
                self.serve_file(safe_path, mime or "application/octet-stream")
            else:
                self.send_error(404, "File Not Found")
        elif path == "/api/info":
            local_ip = get_local_ip()
            files_count = len(os.listdir(UPLOADS_DIR))
            self.send_json({
                "hostname": socket.gethostname(),
                "local_ip": local_ip,
                "port": PORT,
                "network_url": f"http://{local_ip}:{PORT}",
                "local_url": f"http://localhost:{PORT}",
                "files_count": files_count
            })
        elif path == "/api/notes":
            self.send_json({"notes": load_notes()})
        elif path == "/api/files":
            files = []
            for item_name in os.listdir(UPLOADS_DIR):
                # Ignore hidden files (.gitkeep, .DS_Store), temp files, and system files
                if item_name.startswith('.') or item_name.startswith('~$') or item_name.lower() in ('thumbs.db', 'desktop.ini') or item_name.endswith('.tmp'):
                    continue

                item_path = os.path.join(UPLOADS_DIR, item_name)
                if os.path.isfile(item_path):
                    stat = os.stat(item_path)
                    mime, _ = mimetypes.guess_type(item_name)
                    files.append({
                        "name": item_name,
                        "type": "file",
                        "size": stat.st_size,
                        "formatted_size": format_size(stat.st_size),
                        "modified": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S"),
                        "mime": mime or "application/octet-stream"
                    })
                elif os.path.isdir(item_path):
                    total_size = 0
                    file_count = 0
                    inner_files = []
                    for root, dirs, fnames in os.walk(item_path):
                        for f in fnames:
                            if not f.startswith('.'):
                                fp = os.path.join(root, f)
                                if os.path.isfile(fp):
                                    fsize = os.path.getsize(fp)
                                    total_size += fsize
                                    file_count += 1
                                    rel = os.path.relpath(fp, item_path).replace("\\", "/")
                                    inner_files.append({
                                        "name": f,
                                        "rel_path": rel,
                                        "full_path": f"{item_name}/{rel}",
                                        "size": fsize,
                                        "formatted_size": format_size(fsize)
                                    })
                    stat = os.stat(item_path)
                    files.append({
                        "name": item_name,
                        "type": "folder",
                        "size": total_size,
                        "file_count": file_count,
                        "inner_files": inner_files,
                        "formatted_size": format_size(total_size),
                        "modified": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S"),
                        "mime": "application/zip"
                    })
            files.sort(key=lambda x: x["modified"], reverse=True)
            self.send_json({"files": files})
        elif path.startswith("/download/"):
            rel_path = urllib.parse.unquote(path[len("/download/"):])
            parts = [p for p in rel_path.replace("\\", "/").split("/") if p and p != "." and p != ".."]
            safe_path = os.path.abspath(os.path.join(UPLOADS_DIR, *parts))
            if os.path.commonpath([safe_path, UPLOADS_DIR]) == UPLOADS_DIR and os.path.isfile(safe_path):
                mime, _ = mimetypes.guess_type(safe_path)
                file_size = os.path.getsize(safe_path)
                download_name = os.path.basename(safe_path)
                self.send_response(200)
                self.send_header("Content-Type", mime or "application/octet-stream")
                self.send_header("Content-Length", str(file_size))
                self.send_header("Content-Disposition", f'attachment; filename="{download_name}"')
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                with open(safe_path, "rb") as f:
                    while chunk := f.read(64 * 1024):
                        self.wfile.write(chunk)
            else:
                self.send_error(404, "File Not Found")
        elif path.startswith("/download-zip/"):
            folder_name = os.path.basename(urllib.parse.unquote(path[len("/download-zip/"):]))
            safe_path = os.path.abspath(os.path.join(UPLOADS_DIR, folder_name))
            if os.path.commonpath([safe_path, UPLOADS_DIR]) == UPLOADS_DIR and os.path.isdir(safe_path):
                # Bundle the directory into a temporary zip archive
                with tempfile.NamedTemporaryFile(delete=False, suffix=".zip") as tmp:
                    tmp_name = tmp.name
                    with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zf:
                        for root, dirs, fnames in os.walk(safe_path):
                            for f in fnames:
                                if not f.startswith('.'):
                                    fp = os.path.join(root, f)
                                    rel = os.path.relpath(fp, safe_path)
                                    zf.write(fp, arcname=rel)

                file_size = os.path.getsize(tmp_name)
                self.send_response(200)
                self.send_header("Content-Type", "application/zip")
                self.send_header("Content-Length", str(file_size))
                self.send_header("Content-Disposition", f'attachment; filename="{folder_name}.zip"')
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                try:
                    with open(tmp_name, "rb") as f:
                        while chunk := f.read(64 * 1024):
                            self.wfile.write(chunk)
                finally:
                    try:
                        os.remove(tmp_name)
                    except Exception:
                        pass
            else:
                self.send_error(404, "Folder Not Found")
        elif path.startswith("/view/"):
            rel_path = urllib.parse.unquote(path[len("/view/"):])
            parts = [p for p in rel_path.replace("\\", "/").split("/") if p and p != "." and p != ".."]
            safe_path = os.path.abspath(os.path.join(UPLOADS_DIR, *parts))
            if os.path.commonpath([safe_path, UPLOADS_DIR]) == UPLOADS_DIR and os.path.isfile(safe_path):
                mime, _ = mimetypes.guess_type(safe_path)
                file_size = os.path.getsize(safe_path)
                view_name = os.path.basename(safe_path)
                self.send_response(200)
                self.send_header("Content-Type", mime or "application/octet-stream")
                self.send_header("Content-Length", str(file_size))
                self.send_header("Content-Disposition", f'inline; filename="{view_name}"')
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                with open(safe_path, "rb") as f:
                    while chunk := f.read(64 * 1024):
                        self.wfile.write(chunk)
            else:
                self.send_error(404, "File Not Found")
        else:
            self.send_error(404, "Not Found")

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/api/upload":
            query = urllib.parse.parse_qs(parsed.query)
            filename = None
            relpath = None

            if "filename" in query:
                filename = query["filename"][0]
            elif "X-File-Name" in self.headers:
                filename = urllib.parse.unquote(self.headers["X-File-Name"])

            if "relpath" in query:
                relpath = query["relpath"][0]
            elif "X-Relative-Path" in self.headers:
                relpath = urllib.parse.unquote(self.headers["X-Relative-Path"])

            if not filename and relpath:
                filename = os.path.basename(relpath)

            if not filename:
                filename = f"upload_{int(datetime.now().timestamp())}.bin"

            # Clean filename and relative path to avoid path traversal
            filename = os.path.basename(filename).replace("/", "_").replace("\\", "_")
            if filename.startswith('.'):
                filename = filename.lstrip('.')
            if not filename:
                filename = f"upload_{int(datetime.now().timestamp())}.bin"

            if relpath:
                # Sanitize relative directory path components
                raw_parts = [p for p in relpath.replace("\\", "/").split("/") if p and p != "." and p != ".."]
                parts = [p.lstrip('.') for p in raw_parts if not p.startswith('.')]
                if parts:
                    target_path = os.path.abspath(os.path.join(UPLOADS_DIR, *parts))
                else:
                    target_path = os.path.join(UPLOADS_DIR, filename)
            else:
                target_path = os.path.join(UPLOADS_DIR, filename)

            # Security check: target_path must strictly reside within UPLOADS_DIR
            if os.path.commonpath([target_path, UPLOADS_DIR]) != UPLOADS_DIR:
                self.send_error(403, "Invalid path")
                return

            # Avoid accidental overwrites for root files if already exists (for folders, preserve structure)
            if not relpath and os.path.exists(target_path):
                base_name, ext = os.path.splitext(filename)
                counter = 1
                while os.path.exists(target_path):
                    target_path = os.path.join(UPLOADS_DIR, f"{base_name}_{counter}{ext}")
                    counter += 1

            os.makedirs(os.path.dirname(target_path), exist_ok=True)

            try:
                content_length = int(self.headers.get("Content-Length", 0))
            except (TypeError, ValueError):
                content_length = 0

            bytes_read = 0
            chunk_size = 64 * 1024
            try:
                with open(target_path, "wb") as f:
                    while bytes_read < content_length:
                        to_read = min(chunk_size, content_length - bytes_read)
                        chunk = self.rfile.read(to_read)
                        if not chunk:
                            break
                        f.write(chunk)
                        bytes_read += len(chunk)

                final_name = os.path.relpath(target_path, UPLOADS_DIR)
                self.send_json({
                    "success": True,
                    "filename": final_name,
                    "size": bytes_read,
                    "formatted_size": format_size(bytes_read),
                    "message": f"Successfully received '{final_name}'"
                })
            except Exception as e:
                if os.path.exists(target_path):
                    try:
                        os.remove(target_path)
                    except Exception:
                        pass
                self.send_json({"success": False, "error": str(e)}, status=500)
        elif path == "/api/notes":
            try:
                content_length = int(self.headers.get("Content-Length", 0))
            except (TypeError, ValueError):
                content_length = 0

            body = self.rfile.read(content_length).decode('utf-8')
            try:
                data = json.loads(body)
                text = data.get("text", "").strip()
            except Exception:
                text = body.strip()

            if not text:
                self.send_json({"success": False, "error": "Text cannot be empty"}, status=400)
                return

            notes = load_notes()
            note_id = str(int(datetime.now().timestamp() * 1000))
            is_url = text.startswith("http://") or text.startswith("https://")

            new_note = {
                "id": note_id,
                "text": text,
                "is_url": is_url,
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
            notes.insert(0, new_note)
            notes = notes[:100]  # Keep most recent 100 notes
            save_notes(notes)

            self.send_json({"success": True, "note": new_note})
        else:
            self.send_error(404, "Endpoint not found")

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path.startswith("/api/files/"):
            filename = os.path.basename(urllib.parse.unquote(path[len("/api/files/"):]))
            if filename.startswith('.'):
                self.send_error(403, "Cannot delete system files")
                return
            safe_path = os.path.abspath(os.path.join(UPLOADS_DIR, filename))
            if os.path.commonpath([safe_path, UPLOADS_DIR]) == UPLOADS_DIR and (os.path.isfile(safe_path) or os.path.isdir(safe_path)):
                try:
                    if os.path.isdir(safe_path):
                        shutil.rmtree(safe_path)
                    else:
                        os.remove(safe_path)
                    self.send_json({"success": True, "message": f"Deleted {filename}"})
                except Exception as e:
                    self.send_json({"success": False, "error": str(e)}, status=500)
            else:
                self.send_error(404, "File or folder not found")
        elif path.startswith("/api/notes/"):
            note_id = urllib.parse.unquote(path[len("/api/notes/"):])
            notes = load_notes()
            notes = [n for n in notes if n.get("id") != note_id]
            save_notes(notes)
            self.send_json({"success": True, "message": "Note deleted"})
        elif path == "/api/notes":
            save_notes([])
            self.send_json({"success": True, "message": "All notes cleared"})
        else:
            self.send_error(404, "Endpoint not found")

    def serve_file(self, filepath, content_type):
        try:
            with open(filepath, "rb") as f:
                content = f.read()
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(content)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(content)
        except Exception:
            self.send_error(404, "File not found")

def run(port=PORT):
    local_ip = get_local_ip()
    server_address = ('0.0.0.0', port)
    
    try:
        httpd = ThreadedHTTPServer(server_address, FileDropHandler)
    except OSError as e:
        if "address already in use" in str(e).lower() or e.errno == 10048:
            print(f"[!] Port {port} is busy, trying {port + 1}...")
            run(port + 1)
            return
        raise e

    print("=" * 60)
    print("           AIRDROP LOCAL NETWORK FILE DROP          ")
    print("=" * 60)
    print(f"  * Local Access   : http://localhost:{port}")
    print(f"  * Network Access : http://{local_ip}:{port}")
    print(f"  * Uploads Folder : {UPLOADS_DIR}")
    print("=" * 60)
    print("Share the Network Access URL with phones, tablets, or other PCs")
    print("connected to the same Wi-Fi network!")
    print("Press Ctrl+C to stop the server.\n")

    # Automatically launch the web page locally
    try:
        webbrowser.open(f"http://localhost:{port}")
    except Exception:
        pass

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[*] Server stopping...")
        httpd.server_close()
        print("[*] Server stopped cleanly. Bye!")

if __name__ == "__main__":
    run()
