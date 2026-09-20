import os
import sys
import json
import socket
import urllib.parse
import mimetypes
import webbrowser
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn
from datetime import datetime

PORT = 5050
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
STATIC_DIR = os.path.join(BASE_DIR, "static")

os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(STATIC_DIR, exist_ok=True)

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
        elif path == "/api/files":
            files = []
            for fname in os.listdir(UPLOADS_DIR):
                fpath = os.path.join(UPLOADS_DIR, fname)
                if os.path.isfile(fpath):
                    stat = os.stat(fpath)
                    mime, _ = mimetypes.guess_type(fname)
                    files.append({
                        "name": fname,
                        "size": stat.st_size,
                        "formatted_size": format_size(stat.st_size),
                        "modified": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S"),
                        "mime": mime or "application/octet-stream"
                    })
            files.sort(key=lambda x: x["modified"], reverse=True)
            self.send_json({"files": files})
        elif path.startswith("/download/"):
            filename = os.path.basename(urllib.parse.unquote(path[len("/download/"):]))
            safe_path = os.path.abspath(os.path.join(UPLOADS_DIR, filename))
            if os.path.commonpath([safe_path, UPLOADS_DIR]) == UPLOADS_DIR and os.path.isfile(safe_path):
                mime, _ = mimetypes.guess_type(safe_path)
                file_size = os.path.getsize(safe_path)
                self.send_response(200)
                self.send_header("Content-Type", mime or "application/octet-stream")
                self.send_header("Content-Length", str(file_size))
                self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                with open(safe_path, "rb") as f:
                    while chunk := f.read(64 * 1024):
                        self.wfile.write(chunk)
            else:
                self.send_error(404, "File Not Found")
        elif path.startswith("/view/"):
            filename = os.path.basename(urllib.parse.unquote(path[len("/view/"):]))
            safe_path = os.path.abspath(os.path.join(UPLOADS_DIR, filename))
            if os.path.commonpath([safe_path, UPLOADS_DIR]) == UPLOADS_DIR and os.path.isfile(safe_path):
                mime, _ = mimetypes.guess_type(safe_path)
                file_size = os.path.getsize(safe_path)
                self.send_response(200)
                self.send_header("Content-Type", mime or "application/octet-stream")
                self.send_header("Content-Length", str(file_size))
                self.send_header("Content-Disposition", f'inline; filename="{filename}"')
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

            # Get filename from query param or header
            if "filename" in query:
                filename = query["filename"][0]
            elif "X-File-Name" in self.headers:
                filename = urllib.parse.unquote(self.headers["X-File-Name"])

            if not filename:
                filename = f"upload_{int(datetime.now().timestamp())}.bin"

            # Clean filename to avoid path traversal
            filename = os.path.basename(filename).replace("/", "_").replace("\\", "_")
            target_path = os.path.join(UPLOADS_DIR, filename)

            # Avoid accidental overwrites by appending suffix if already exists
            base_name, ext = os.path.splitext(filename)
            counter = 1
            while os.path.exists(target_path):
                target_path = os.path.join(UPLOADS_DIR, f"{base_name}_{counter}{ext}")
                counter += 1

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

                final_name = os.path.basename(target_path)
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
        else:
            self.send_error(404, "Endpoint not found")

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path.startswith("/api/files/"):
            filename = os.path.basename(urllib.parse.unquote(path[len("/api/files/"):]))
            safe_path = os.path.abspath(os.path.join(UPLOADS_DIR, filename))
            if os.path.commonpath([safe_path, UPLOADS_DIR]) == UPLOADS_DIR and os.path.isfile(safe_path):
                try:
                    os.remove(safe_path)
                    self.send_json({"success": True, "message": f"Deleted {filename}"})
                except Exception as e:
                    self.send_json({"success": False, "error": str(e)}, status=500)
            else:
                self.send_error(404, "File not found")
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
