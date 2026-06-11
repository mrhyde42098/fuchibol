import re
from pathlib import Path

t = Path(__file__).resolve().parents[1] / "test-xhd.html"
html = t.read_text(encoding="utf-8", errors="ignore")
print("len", len(html))
print("m3u8", re.findall(r"https?://[^\s\"'<>]+\.m3u8[^\s\"'<>]*", html)[:5])
print("iframe", re.findall(r'<iframe[^>]+src=["\']([^"\']+)["\']', html, re.I)[:5])
print("snippet", html[:1200])
for label, pat in [
    ("urls", r"https?://[^\s\"'<>]+"),
    ("m3u8", r"[^\s\"'<>]*\.m3u8[^\s\"'<>]*"),
    ("source", r"source:\s*[\"']([^\"']+)[\"']"),
]:
    hits = re.findall(pat, html, re.I)
    print(label, hits[:8])
