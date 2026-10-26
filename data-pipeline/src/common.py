"""Shared helpers: paths, HTTP client and provenance records."""

import json
from datetime import datetime, timezone
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "raw"
SAMPLES = ROOT / "samples"

# INMET rejects clients without a browser-like User-Agent.
USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36"


def client() -> httpx.Client:
    return httpx.Client(headers={"User-Agent": USER_AGENT}, timeout=120, follow_redirects=True)


def download(url: str, dest: Path) -> Path:
    """Stream a file to disk unless it already exists."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        return dest
    with client().stream("GET", url) as r:
        r.raise_for_status()
        with dest.open("wb") as f:
            for chunk in r.iter_bytes():
                f.write(chunk)
    return dest


def write_meta(name: str, meta: dict) -> Path:
    """Write a provenance record next to the samples."""
    SAMPLES.mkdir(parents=True, exist_ok=True)
    meta = {"retrieved_at": datetime.now(timezone.utc).isoformat(timespec="seconds"), **meta}
    path = SAMPLES / f"{name}.meta.json"
    path.write_text(json.dumps(meta, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return path
