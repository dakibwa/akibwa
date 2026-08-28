#!/usr/bin/env python3
"""Build data/trek-days.json and public/trek/index.html from life-map GPS.

Country assignment is point-in-polygon of each day's last GPS point against
the walked-country polygons already on /life-map/. Titles and dates come from
the GPS records. Rest days keep the last walked coordinate; the page fans
them in screen space so the net can be read. Nothing here is a heatmap.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "public/life-map/index.html"
TEMPLATE = Path(__file__).with_name("trek-page-template.html")
COVERS = ROOT / "data/trek-covers.json"
OUT_JSON = ROOT / "data/trek-days.json"
OUT_HTML = ROOT / "public/trek/index.html"

WALKED = ["France", "Germany", "Austria", "Slovenia", "Croatia", "Serbia", "Bulgaria"]
WALKQ = 20
COLORS = {
    "France": "#2EA3DC",
    "Germany": "#24709F",
    "Austria": "#7D6BB0",
    "Slovenia": "#12A19A",
    "Croatia": "#1FA45A",
    "Serbia": "#EFC319",
    "Bulgaria": "#E97E18",
}


def extract_array(src: str, key: str):
    idx = src.find(f'"{key}":[')
    if idx < 0:
        raise SystemExit(f"missing {key}")
    i = idx + len(f'"{key}":')
    depth = 0
    for j in range(i, len(src)):
        if src[j] == "[":
            depth += 1
        elif src[j] == "]":
            depth -= 1
            if depth == 0:
                return json.loads(src[i : j + 1])
    raise SystemExit(f"unclosed {key}")


def decode(d: str):
    out = []
    x = y = 0
    for m in re.finditer(r"([MlZz])(-?\d+)? ?(-?\d+)?", d):
        cmd = m.group(1)
        if cmd == "M":
            x, y = int(m.group(2)), int(m.group(3))
            out.append((x, y))
        elif cmd == "l":
            x += int(m.group(2))
            y += int(m.group(3))
            out.append((x, y))
        elif cmd in "Zz" and out:
            out.append(out[0])
    return out


def rings(d: str):
    parts = re.split(r"(?=M)", d)
    return [decode(p) for p in parts if p.startswith("M") and len(decode(p)) >= 3]


def pip(pt, poly):
    x, y = pt
    inside = False
    n = len(poly)
    j = n - 1
    for i in range(n):
        xi, yi = poly[i]
        xj, yj = poly[j]
        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi + 1e-12) + xi):
            inside = not inside
        j = i
    return inside


def daynums(n: str):
    out = []
    m = re.search(r"Day\s+([\d\s&]+)", n or "")
    if not m:
        return out
    for p in re.split(r"[&,]", m.group(1)):
        digits = re.sub(r"\D", "", p)
        if digits:
            out.append(int(digits))
    return out


def title_of(n: str):
    t = re.sub(r"^Day\s+[\d\s&()a-z]*\s*[-–—]\s*", "", n or "", flags=re.I).strip()
    return t.strip("'")


def rdp(pts, eps):
    if len(pts) < 3:
        return list(pts)
    ax, ay = pts[0]
    bx, by = pts[-1]
    dx, dy = bx - ax, by - ay
    denom = dx * dx + dy * dy or 1.0
    maxd = -1.0
    idx = 0
    for i in range(1, len(pts) - 1):
        px, py = pts[i]
        t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / denom))
        qx, qy = ax + t * dx, ay + t * dy
        d = (px - qx) ** 2 + (py - qy) ** 2
        if d > maxd:
            maxd = d
            idx = i
    if maxd > eps * eps:
        return rdp(pts[: idx + 1], eps)[:-1] + rdp(pts[idx:], eps)
    return [pts[0], pts[-1]]


def sample(pts, cap):
    if len(pts) <= cap:
        return list(pts)
    step = len(pts) / cap
    out = [pts[int(i * step)] for i in range(cap - 1)]
    out.append(pts[-1])
    return out


def main():
    src = SRC.read_text()
    walkm = extract_array(src, "walkm")

    m = re.search(r'"region":\{"q":(\d+),"paths":(\[)', src)
    q = int(m.group(1))
    i = m.start(2)
    depth = 0
    paths = None
    for j in range(i, len(src)):
        if src[j] == "[":
            depth += 1
        elif src[j] == "]":
            depth -= 1
            if depth == 0:
                paths = json.loads(src[i : j + 1])
                break
    if paths is None:
        raise SystemExit("missing region paths")

    country_polys = {name: [] for name in WALKED}
    for name, _walked_flag, d in paths:
        if name in WALKED:
            for ring in rings(d):
                country_polys[name].append([(x * q, y * q) for x, y in ring])

    def assign(mx, my):
        for name in WALKED:
            for poly in country_polys[name]:
                if pip((mx, my), poly):
                    return name
        return None

    by_num = {}
    tracks = []
    for d in walkm:
        pts = decode(d["p"])
        if not pts:
            continue
        merc = [(p[0] * WALKQ, p[1] * WALKQ) for p in pts]
        slim = rdp(sample(merc, 80), 6000)
        if len(slim) >= 2:
            tracks.append([[round(x), round(y)] for x, y in slim])
        nums = daynums(d["n"])
        country = assign(merc[-1][0], merc[-1][1])
        if len(nums) == 1:
            n = nums[0]
            by_num[n] = {
                "n": n,
                "date": d["d"],
                "title": title_of(d["n"]),
                "raw": d["n"],
                "x": merc[-1][0],
                "y": merc[-1][1],
                "walked": True,
                "country": country,
            }
        elif len(nums) >= 2:
            for i_n, n in enumerate(nums):
                t = i_n / (len(nums) - 1)
                idx = round(t * (len(merc) - 1))
                p = merc[idx]
                by_num[n] = {
                    "n": n,
                    "date": d["d"],
                    "title": title_of(d["n"]),
                    "raw": d["n"],
                    "x": p[0],
                    "y": p[1],
                    "walked": True,
                    "country": assign(p[0], p[1]) or country,
                }

    last = None
    days = []
    for n in range(1, 68):
        if n in by_num:
            last = by_num[n]
            days.append(dict(last))
            continue
        if last is None:
            raise SystemExit(f"rest day {n} before any walked day")
        days.append(
            {
                "n": n,
                "date": None,
                "title": None,
                "raw": None,
                "x": last["x"],
                "y": last["y"],
                "walked": False,
                "country": last["country"],
            }
        )

    covers = {}
    if COVERS.exists():
        payload_c = json.loads(COVERS.read_text())
        covers = {int(k): v for k, v in payload_c.get("days", {}).items()}
        for d in days:
            rec = covers.get(d["n"])
            if rec and rec.get("matched") and rec.get("src"):
                d["cover"] = rec["src"]
                d["coverArtist"] = rec.get("artist")
                d["coverAlbum"] = rec.get("album")
                if rec.get("song"):
                    d["coverSong"] = rec["song"]
                if rec.get("kind"):
                    d["coverKind"] = rec["kind"]

    xs = [d["x"] for d in days]
    ys = [d["y"] for d in days]
    for poly in tracks:
        for x, y in poly:
            xs.append(x)
            ys.append(y)
    minx, maxx = min(xs), max(xs)
    miny, maxy = min(ys), max(ys)
    pad = 80000
    bbox = (minx - pad, miny - pad, maxx + pad, maxy + pad)

    def overlaps(ring):
        rx = [p[0] for p in ring]
        ry = [p[1] for p in ring]
        return not (max(rx) < bbox[0] or min(rx) > bbox[2] or max(ry) < bbox[1] or min(ry) > bbox[3])

    country_rings = []
    for name in WALKED:
        slim = []
        for ring in country_polys[name]:
            if len(ring) < 4 or not overlaps(ring):
                continue
            pts = rdp(sample(ring, 120), 18000)
            if len(pts) >= 4:
                slim.append([[round(x), round(y)] for x, y in pts])
        if slim:
            country_rings.append({"name": name, "color": COLORS[name], "rings": slim})

    walked_n = sum(1 for d in days if d["walked"])
    rest_n = sum(1 for d in days if not d["walked"])
    countries = {
        c: sum(1 for d in days if d["walked"] and d["country"] == c) for c in WALKED
    }
    covered = sum(1 for d in days if d.get("cover"))
    print(f"nodes {len(days)} walked {walked_n} rest {rest_n} covers {covered}")
    print("countries", countries)
    print(f"track segs {len(tracks)} pts {sum(len(t) for t in tracks)}")
    print(f"country rings {sum(len(c['rings']) for c in country_rings)}")
    assert len(days) == 67, len(days)
    assert walked_n == 52, walked_n
    assert all(d["country"] in WALKED for d in days)
    assert days[0]["country"] == "France"
    assert days[-1]["country"] == "Bulgaria"
    last_walked = next(d for d in reversed(days) if d["walked"])
    assert last_walked["title"] == "Allelujah! Don't Bend! Ascend!", last_walked["title"]
    assert all(not d.get("cover") for d in days if not d["walked"])
    assert 1982 // 52 == 38

    payload = {
        "facts": {
            "km": 1982,
            "walked": 52,
            "numbered": 67,
            "countries": 7,
            "kmPerWalkedDay": 38,
            "from": "Paris",
            "to": "Sofia",
            "start": "2019-09-24",
            "end": "2019-11-28",
            "alone": True,
            "tauern": "~2,500 m",
            "after": "He got the coach from Sofia to Istanbul. He was done.",
        },
        "countries": [{"name": n, "color": COLORS[n]} for n in WALKED],
        "countryRings": country_rings,
        "tracks": tracks,
        "days": days,
    }

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(payload, indent=2) + "\n")
    print("wrote", OUT_JSON.relative_to(ROOT), OUT_JSON.stat().st_size)

    template = TEMPLATE.read_text()
    if "__TREK_DATA__" not in template:
        raise SystemExit("template missing __TREK_DATA__")
    html = template.replace("__TREK_DATA__", json.dumps(payload, separators=(",", ":")))
    OUT_HTML.parent.mkdir(parents=True, exist_ok=True)
    OUT_HTML.write_text(html)
    print("wrote", OUT_HTML.relative_to(ROOT), OUT_HTML.stat().st_size)


if __name__ == "__main__":
    main()
