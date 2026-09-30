"""Local server for rendering the cinematic tour to video.

Serves the repository root (so index.html loads from http://127.0.0.1:8765/) and
accepts the frames and soundtrack posted by window.__v8.capture:

    POST /frame/<n>        JPEG data URL  -> frames/f<n:05d>.jpg
    POST /audio/<name>     WAV data URL   -> <name>

    python tools/video/capserver.py
"""
import base64
import http.server
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FRAMES = ROOT / "frames"


def decode(body: bytes) -> bytes:
    return base64.b64decode(body.split(b",", 1)[1]) if body.startswith(b"data:") else body


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, *args):
        pass

    def do_POST(self):
        body = self.rfile.read(int(self.headers.get("Content-Length", 0)))
        name = self.path.rsplit("/", 1)[-1]
        if self.path.startswith("/frame/"):
            FRAMES.mkdir(exist_ok=True)
            (FRAMES / f"f{int(name):05d}.jpg").write_bytes(decode(body))
        elif self.path.startswith("/audio/"):
            (ROOT / Path(name).name).write_bytes(decode(body))
        else:
            self.send_error(404)
            return
        self.send_response(200)
        self.send_header("Content-Length", "2")
        self.end_headers()
        self.wfile.write(b"ok")


if __name__ == "__main__":
    print("serving", ROOT, "on http://127.0.0.1:8765/")
    http.server.ThreadingHTTPServer(("127.0.0.1", 8765), Handler).serve_forever()
