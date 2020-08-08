import collections
import html
import os
import platform
import uuid
from flask import Flask, Response, abort, request
from pathlib import Path
from typing import List

WELCOME_REDIRECT = "https://www.youtube.com/embed/1Gl2kVUsy2M?start=26&end=39&autoplay=1"
SECRET = os.environ["FLAG"].encode("ascii")
MAX_DATA_SIZE = 1024 * 1024
CACHE_FOLDER = "./appsecstorage"
CACHE_SIZE = 256

class LRU:
    def __init__(self, folder: str, max_size: int) -> None:
        self.folder = Path(folder)
        self.max_size = max_size
        self.queue: List[str, ]  = collections.OrderedDict()

    def write(self, key: str, value: bytes) -> None:
        if self.max_size <= len(self.queue):
            retired_key, _ = self.queue.popitem(last=False)
            (self.folder / retired_key).unlink()
        self.queue[key] = None
        (self.folder / key).write_bytes(value)

    def read(self, key: str) -> bytes:
        self.queue.pop(key)
        self.queue[key] = None
        return (self.folder / key).read_bytes()

app = Flask(__name__)
lru = LRU(CACHE_FOLDER, CACHE_SIZE)

@app.after_request
def report_platform(response: Response) -> Response:
    response.headers["X-Platform"] = platform.node()
    return response

@app.route("/")
def welcome() -> str:
    return """<html xmlns="http://www.w3.org/1999/xhtml">
    <head>
        <meta http-equiv="refresh" content="0;URL='{}'" />
    </head>
</html>
""".format(html.escape(WELCOME_REDIRECT))

@app.route("/cache", methods=["PUT"])
def put() -> str:
    data = request.data     #
    if MAX_DATA_SIZE < len(data):
        abort(403)
    id = uuid.uuid4()   #
    lru.write(id.hex, data + SECRET)
    return str(id)

@app.route("/cache/<key>", methods=["GET"])
def get(key: str) -> bytes:
    id = uuid.UUID(key)         # converts a string to a UUID
    try:
        blob = lru.read(id.hex) # Tries to read the "hex" value of the UUID
    except KeyError:
        abort(404)
    data = blob[: -len(SECRET)] # Data = "hex value of UUID" - the "secret" length
    if data + SECRET != blob:
        abort(500)
    return data

if __name__ == "__main__":
    app.run()
