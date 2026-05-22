from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
MEDIA_DIR = BASE_DIR / "media"
ORIGINALS_DIR = MEDIA_DIR / "originals"
THUMBS_DIR = MEDIA_DIR / "thumbs"
REFS_DIR = MEDIA_DIR / "refs"
DB_PATH = BASE_DIR / "prompt_gallery.db"

# Ensure directories exist
for d in [MEDIA_DIR, ORIGINALS_DIR, THUMBS_DIR, REFS_DIR]:
    d.mkdir(parents=True, exist_ok=True)
