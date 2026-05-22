from pathlib import Path
from PIL import Image


def generate_thumbnail(source: Path, dest: Path, max_dim: int = 256) -> None:
    """Generate a WebP thumbnail from an image file."""
    with Image.open(source) as img:
        img.thumbnail((max_dim, max_dim), Image.LANCZOS)
        img.save(dest, "WEBP", quality=80)
