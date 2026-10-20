#!/usr/bin/env python3
"""Fetch URLs with curl; regex-extract h1-h3/p/li/button/a text into raw/<md5>.json. Keeps raw html too."""
import json, re, subprocess, sys, html, hashlib, os
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "raw")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36"
def clean(s):
    s = re.sub(r"<(script|style|svg)[^>]*>.*?</\1>", " ", s, flags=re.S)
    s = re.sub(r"<[^>]+>", " ", s)
    return re.sub(r"\s+", " ", html.unescape(s)).strip()
def extract(h):
    h2 = h.replace("\\u003C", "<").replace("\\u003E", ">").replace('\\"', '"').replace("\\n", "\n")
    items, seen = [], set()
    for src in (h, h2):
        for m in re.finditer(r"<(h1|h2|h3|h4|p|li|button|blockquote|summary|dt|dd)\b[^>]*>(.*?)</\1>", src, flags=re.S | re.I):
            t, x = m.group(1).lower(), clean(m.group(2))
            if x and (t, x) not in seen:
                seen.add((t, x)); items.append((t, x))
    for m in re.finditer(r"<a\b[^>]*class=\"[^\"]*(btn|button|cta)[^\"]*\"[^>]*>(.*?)</a>", h, flags=re.S | re.I):
        x = clean(m.group(2))
        if x and ("a-btn", x) not in seen: seen.add(("a-btn", x)); items.append(("a-btn", x))
    return items
def run(url):
    h = subprocess.run(["curl", "-sL", "-m", "30", "-A", UA, url], capture_output=True).stdout.decode("utf-8", "replace")
    name = hashlib.md5(url.encode()).hexdigest()[:10]
    open(f"{OUT}/{name}.html", "w").write(h)
    meta = dict((m.group(1), html.unescape(m.group(2))) for m in re.finditer(r'<meta[^>]+(?:property|name)="(og:title|og:description|description)"[^>]+content="([^"]*)"', h))
    items = extract(h)
    json.dump({"url": url, "bytes": len(h), "meta": meta, "items": items}, open(f"{OUT}/{name}.json", "w"), ensure_ascii=False, indent=0)
    np = sum(1 for t, x in items if t == "p" and len(x) > 60)
    print(f"{name} {len(h):>8}B p60={np:>3} {url[:110]}")
if __name__ == "__main__":
    for u in sys.argv[1:]: run(u)
