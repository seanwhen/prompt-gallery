import json
import uuid
import shutil
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Body, File, Form, UploadFile, HTTPException

from backend.config import ORIGINALS_DIR, THUMBS_DIR, REFS_DIR
from backend.database import get_db
from backend.models import ItemResponse, ItemUpdate
from backend.services.thumbnail import generate_thumbnail
from backend.services.video import get_video_metadata, extract_first_frame, extract_first_frame_full

router = APIRouter(tags=["items"])

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}
VIDEO_EXTS = {".mp4", ".webm", ".mov", ".avi", ".mkv"}
AUDIO_EXTS = {".mp3", ".wav", ".ogg", ".flac", ".aac", ".m4a", ".wma"}


def _detect_type(file_name: str) -> str:
    ext = Path(file_name).suffix.lower()
    if ext in IMAGE_EXTS:
        return "image"
    if ext in VIDEO_EXTS:
        return "video"
    if ext in AUDIO_EXTS:
        return "audio"
    return "image"


def _row_to_dict(row) -> dict:
    d = dict(row)
    d["tags"] = json.loads(d.get("tags") or "[]")
    return d


@router.get("/items", response_model=list[ItemResponse])
def list_items():
    conn = get_db()
    rows = conn.execute("SELECT * FROM items ORDER BY created_at DESC").fetchall()
    conn.close()
    return [_row_to_dict(r) for r in rows]


@router.post("/items", response_model=ItemResponse, status_code=201)
async def create_item(
    file: UploadFile = File(None),
    prompt: str = Form(""),
    tags: str = Form("[]"),
    workflow_name: str = Form(None),
    item_type: str = Form("image"),
    reference_image: UploadFile = File(None),
):
    item_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    orig_rel = None
    thumb_rel = None
    ref_path = None
    width = height = 0
    duration = 0.0
    has_audio = False
    file_name = None

    if file:
        file_name = file.filename or "unknown"
        ext = Path(file_name).suffix.lower()
        if item_type == "image":
            item_type = _detect_type(file_name)

        # Save original
        orig_dest = ORIGINALS_DIR / f"{item_id}{ext}"
        with open(orig_dest, "wb") as f:
            shutil.copyfileobj(file.file, f)
        orig_rel = str(orig_dest.relative_to(THUMBS_DIR.parent.parent))

        # Generate thumbnail and extract metadata
        thumb_dest = THUMBS_DIR / f"{item_id}.webp"
        if item_type == "image":
            generate_thumbnail(orig_dest, thumb_dest)
            try:
                from PIL import Image
                with Image.open(orig_dest) as img:
                    width, height = img.size
            except Exception:
                pass
        elif item_type == "video":
            meta = get_video_metadata(orig_dest)
            width = meta.get("width", 0)
            height = meta.get("height", 0)
            duration = meta.get("duration", 0.0)
            has_audio = meta.get("has_audio", False)
            extract_first_frame(orig_dest, thumb_dest)

        if thumb_dest.exists():
            thumb_rel = str(thumb_dest.relative_to(THUMBS_DIR.parent.parent))

    # Save reference image if provided, or use first frame for videos
    if reference_image:
        ref_ext = Path(reference_image.filename or "ref.png").suffix.lower() or ".png"
        ref_dest = REFS_DIR / f"{item_id}{ref_ext}"
        with open(ref_dest, "wb") as f:
            shutil.copyfileobj(reference_image.file, f)
        ref_path = str(ref_dest.relative_to(THUMBS_DIR.parent.parent))
    elif item_type == "video" and orig_rel:
        ref_dest = REFS_DIR / f"{item_id}_ref.jpg"
        extract_first_frame_full(orig_dest, ref_dest)
        if ref_dest.exists():
            ref_path = str(ref_dest.relative_to(THUMBS_DIR.parent.parent))

    conn = get_db()
    conn.execute(
        """INSERT INTO items
           (id, type, file_name, prompt, tags, workflow_name,
            thumbnail_path, original_path, reference_image_path,
            width, height, duration, has_audio, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (item_id, item_type, file_name, prompt, tags,
         workflow_name, thumb_rel, orig_rel, ref_path,
         width, height, duration, has_audio, now),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
    conn.close()
    return _row_to_dict(row)


@router.put("/items/{item_id}", response_model=ItemResponse)
def update_item(item_id: str, body: ItemUpdate):
    conn = get_db()
    row = conn.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "Item not found")

    updates = []
    params = []
    if body.prompt is not None:
        updates.append("prompt = ?")
        params.append(body.prompt)
    if body.tags is not None:
        updates.append("tags = ?")
        params.append(json.dumps(body.tags))
    if body.workflow_name is not None:
        updates.append("workflow_name = ?")
        params.append(body.workflow_name)

    if updates:
        params.append(item_id)
        conn.execute(f"UPDATE items SET {', '.join(updates)} WHERE id = ?", params)
        conn.commit()

    row = conn.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
    conn.close()
    return _row_to_dict(row)


@router.put("/items/{item_id}/ref", response_model=ItemResponse)
async def upload_ref_image(item_id: str, reference_image: UploadFile = File(...)):
    conn = get_db()
    row = conn.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "Item not found")

    # Delete old ref if exists
    base = Path(__file__).resolve().parent.parent.parent
    old_ref = row["reference_image_path"]
    if old_ref:
        old_path = base / old_ref
        if old_path.exists():
            old_path.unlink()

    # Save new ref
    ref_ext = Path(reference_image.filename or "ref.png").suffix.lower() or ".png"
    ref_dest = REFS_DIR / f"{item_id}{ref_ext}"
    with open(ref_dest, "wb") as f:
        shutil.copyfileobj(reference_image.file, f)
    ref_path = str(ref_dest.relative_to(THUMBS_DIR.parent.parent))

    conn.execute("UPDATE items SET reference_image_path = ? WHERE id = ?", (ref_path, item_id))
    conn.commit()
    row = conn.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
    conn.close()
    return _row_to_dict(row)


@router.delete("/items/{item_id}/ref", response_model=ItemResponse)
def delete_ref_image(item_id: str):
    conn = get_db()
    row = conn.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "Item not found")

    # Delete ref file if exists
    base = Path(__file__).resolve().parent.parent.parent
    old_ref = row["reference_image_path"]
    if old_ref:
        old_path = base / old_ref
        if old_path.exists():
            old_path.unlink()

    conn.execute("UPDATE items SET reference_image_path = NULL WHERE id = ?", (item_id,))
    conn.commit()
    row = conn.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
    conn.close()
    return _row_to_dict(row)


@router.delete("/items/{item_id}")
def delete_item(item_id: str):
    conn = get_db()
    row = conn.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "Item not found")

    # Delete files
    base = Path(__file__).resolve().parent.parent.parent
    for key in ("original_path", "thumbnail_path", "reference_image_path"):
        p = row[key]
        if p:
            fp = base / p
            if fp.exists():
                fp.unlink()

    conn.execute("DELETE FROM items WHERE id = ?", (item_id,))
    conn.commit()
    conn.close()
    return {"ok": True}


@router.post("/items/batch-delete")
def batch_delete(item_ids: list[str] = Body(...)):
    conn = get_db()
    base = Path(__file__).resolve().parent.parent.parent
    for item_id in item_ids:
        row = conn.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
        if row:
            for key in ("original_path", "thumbnail_path", "reference_image_path"):
                p = row[key]
                if p:
                    fp = base / p
                    if fp.exists():
                        fp.unlink()
            conn.execute("DELETE FROM items WHERE id = ?", (item_id,))
    conn.commit()
    conn.close()
    return {"ok": True, "deleted": len(item_ids)}


@router.post("/items/migrate-refs")
def migrate_video_refs():
    """Generate full-resolution first frame for videos without reference_image_path."""
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM items WHERE type = 'video' AND (reference_image_path IS NULL OR reference_image_path = '')"
    ).fetchall()
    conn.close()

    base = Path(__file__).resolve().parent.parent.parent
    migrated = 0
    failed = 0

    for row in rows:
        item_id = row["id"]
        orig_rel = row["original_path"]
        if not orig_rel:
            failed += 1
            continue

        orig_path = base / orig_rel
        if not orig_path.exists():
            failed += 1
            continue

        ref_dest = REFS_DIR / f"{item_id}_ref.jpg"
        try:
            extract_first_frame_full(orig_path, ref_dest)
            if ref_dest.exists():
                ref_path = str(ref_dest.relative_to(THUMBS_DIR.parent.parent))
                conn = get_db()
                conn.execute(
                    "UPDATE items SET reference_image_path = ? WHERE id = ?",
                    (ref_path, item_id)
                )
                conn.commit()
                conn.close()
                migrated += 1
            else:
                failed += 1
        except Exception:
            failed += 1

    return {"ok": True, "migrated": migrated, "failed": failed}
