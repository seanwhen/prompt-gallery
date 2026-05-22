import mimetypes
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse, StreamingResponse

from backend.database import get_db

router = APIRouter(tags=["media"])

BASE = Path(__file__).resolve().parent.parent.parent


def _get_item_path(item_id: str, file_type: str) -> Path:
    conn = get_db()
    row = conn.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(404, "Item not found")

    col_map = {
        "thumb": "thumbnail_path",
        "original": "original_path",
        "ref": "reference_image_path",
    }
    col = col_map.get(file_type)
    if not col:
        raise HTTPException(400, "Invalid file type")

    rel = row[col]
    if not rel:
        raise HTTPException(404, "File not found")

    return BASE / rel


def _range_response(path: Path, request: Request, media_type: str):
    file_size = path.stat().st_size
    range_header = request.headers.get("range")

    if range_header:
        # Parse Range: bytes=start-end
        range_spec = range_header.replace("bytes=", "")
        parts = range_spec.split("-")
        start = int(parts[0]) if parts[0] else 0
        end = int(parts[1]) if parts[1] else file_size - 1
        end = min(end, file_size - 1)
        length = end - start + 1

        def iter_file():
            with open(path, "rb") as f:
                f.seek(start)
                remaining = length
                while remaining > 0:
                    chunk = f.read(min(65536, remaining))
                    if not chunk:
                        break
                    remaining -= len(chunk)
                    yield chunk

        return StreamingResponse(
            iter_file(),
            status_code=206,
            media_type=media_type,
            headers={
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(length),
            },
        )

    return FileResponse(
        path,
        media_type=media_type,
        headers={"Accept-Ranges": "bytes"},
    )


@router.get("/media/{item_id}/thumb")
def get_thumb(item_id: str):
    path = _get_item_path(item_id, "thumb")
    mime = mimetypes.guess_type(str(path))[0] or "image/webp"
    return FileResponse(path, media_type=mime)


@router.get("/media/{item_id}/original")
def get_original(item_id: str, request: Request):
    path = _get_item_path(item_id, "original")
    mime = mimetypes.guess_type(str(path))[0] or "application/octet-stream"
    return _range_response(path, request, mime)


@router.get("/media/{item_id}/ref")
def get_ref(item_id: str):
    path = _get_item_path(item_id, "ref")
    mime = mimetypes.guess_type(str(path))[0] or "image/png"
    return FileResponse(path, media_type=mime)
