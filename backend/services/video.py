import json
import subprocess
from pathlib import Path


def get_video_metadata(source: Path) -> dict:
    """Extract video metadata using ffprobe."""
    cmd = [
        "ffprobe", "-v", "quiet", "-print_format", "json",
        "-show_format", "-show_streams", str(source)
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    if result.returncode != 0:
        return {}
    data = json.loads(result.stdout)

    meta = {"width": 0, "height": 0, "duration": 0.0, "has_audio": False}

    for stream in data.get("streams", []):
        if stream.get("codec_type") == "video" and not meta["width"]:
            meta["width"] = int(stream.get("width", 0))
            meta["height"] = int(stream.get("height", 0))
        elif stream.get("codec_type") == "audio":
            meta["has_audio"] = True

    fmt = data.get("format", {})
    meta["duration"] = float(fmt.get("duration", 0))

    return meta


def extract_first_frame(source: Path, dest: Path) -> None:
    """Extract the first frame of a video as a WebP thumbnail."""
    cmd = [
        "ffmpeg", "-y", "-i", str(source),
        "-vframes", "1", "-vf", "scale=256:-1",
        str(dest)
    ]
    subprocess.run(cmd, capture_output=True, timeout=30)


def extract_first_frame_full(source: Path, dest: Path) -> None:
    """Extract the first frame of a video at full resolution."""
    cmd = [
        "ffmpeg", "-y", "-i", str(source),
        "-vframes", "1",
        str(dest)
    ]
    subprocess.run(cmd, capture_output=True, timeout=30)
