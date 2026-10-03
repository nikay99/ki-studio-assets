#!/usr/bin/env python3
"""100 Years Evolution: spec.json -> Shotstack edit.json (9:16, 1080x1920).
Usage: python3 build_century.py spec.json edit.json
Exit 0 = audit green, 1 = audit red (do not render)."""
import json, sys

FONT_ANTON = "https://fonts.gstatic.com/s/anton/v27/1Ptgg87LROyAm0K08i4gS7lu.ttf"
FONT_MONT = "https://fonts.gstatic.com/s/montserrat/v31/JTUSjIg1_i6t8kCHKm45xW5rygbi49c.ttf"
ANTON, MONT = "1Ptgg87LROyAm0K08i4gS7lu", "JTUSjIg1_i6t8kCHKm45xW5rygbi49c"
SFX = "https://raw.githubusercontent.com/nikay99/ki-studio-assets/main/sfx/"

def r(x): return round(x, 3)

def build(spec):
    T = spec.get("timing", {})
    first, mid, last = T.get("first", 2.2), T.get("mid", 1.3), T.get("last", 3.5)
    xf = T.get("crossfade", 0.4)
    zoom = T.get("zoom_per_s", 0.004)
    eras = spec["eras"]
    n = len(eras)
    starts = [0.0]
    for i in range(1, n):
        starts.append(r(starts[-1] + (first if i == 1 else mid)))
    L = spec.get("layout", {})          # vertical offsets (fraction of frame, + = up from center)
    year_y, label_y, hook_y = L.get("year_y", 0.02), L.get("label_y", -0.055), L.get("hook_y", 0.2)
    split = T.get("split", 0)              # seconds of 1925|2025 split-screen after the last era
    last_end = r(starts[-1] + last)
    total = r(last_end + split)
    sc = lambda t: r(1.0 + zoom * t)

    img_tracks, text_tracks = [], []
    for i, e in enumerate(eras):
        s = starts[i] if i == 0 else r(starts[i] - xf / 2)
        end = total if i == n - 1 else r(starts[i + 1] + xf / 2)
        clip = {"asset": {"type": "image", "src": e["image"]}, "start": s, "length": r(end - s),
                "fit": "crop",
                "scale": [{"from": sc(s), "to": sc(end), "start": 0, "length": r(end - s), "interpolation": "linear"}]}
        if i > 0:
            clip["opacity"] = [{"from": 0, "to": 1, "start": 0, "length": xf, "interpolation": "bezier", "easing": "easeInOut"}]
        img_tracks.insert(0, {"clips": [clip]})   # later eras on top

    # year counter + model label (switch exactly at each cut)
    years, labels = [], []
    for i, e in enumerate(eras):
        s = starts[i]; end = last_end if i == n - 1 else starts[i + 1]
        years.append({"asset": {"type": "rich-text", "text": str(e["year"]),
            "font": {"family": ANTON, "size": 190, "color": "#FFFFFF"},
            "stroke": {"width": 6, "color": "#000000"},
            "shadow": {"offsetX": 0, "offsetY": 6, "blur": 20, "color": "#000000", "opacity": 0.6},
            "align": {"horizontal": "center", "vertical": "middle"},
            "animation": {"preset": "ascend", "direction": "up", "duration": 0.2}},
            "start": s, "length": r(end - s - 0.001), "width": 1000, "height": 240, "position": "center", "offset": {"x": 0, "y": year_y}})
        labels.append({"asset": {"type": "rich-text", "text": e["label"],
            "font": {"family": MONT, "size": 46, "weight": "800", "color": "#FFC72C"},
            "stroke": {"width": 3, "color": "#000000"},
            "shadow": {"offsetX": 0, "offsetY": 3, "blur": 10, "color": "#000000", "opacity": 0.7},
            "style": {"textTransform": "uppercase", "letterSpacing": 2},
            "align": {"horizontal": "center", "vertical": "middle"}},
            "start": s, "length": r(end - s - 0.001), "width": 1000, "height": 90, "position": "center", "offset": {"x": 0, "y": label_y}})
    text_tracks += [{"clips": years}, {"clips": labels}]

    hook = spec["hook"]
    hook_clip = {"asset": {"type": "rich-text", "text": hook["text"],
        "font": {"family": ANTON, "size": 92, "color": "#FFFFFF"},
        "stroke": {"width": 5, "color": "#000000"},
        "style": {"textTransform": "uppercase", "lineHeight": 1.05},
        "background": {"color": "#000000", "opacity": 0.55, "borderRadius": 18},
        "align": {"horizontal": "center", "vertical": "middle"},
        "animation": {"preset": "shift", "style": "word", "direction": "up", "duration": 0.33}},
        "start": 0, "length": r(starts[1] - 0.15), "width": 940, "height": 260, "position": "center", "offset": {"x": 0, "y": hook_y},
        "transition": {"out": "fadeFast"}}
    cta = spec["cta"]
    cta_start = r(last_end if split else starts[-1] + 1.0)
    cta_clip = {"asset": {"type": "rich-text", "text": cta,
        "font": {"family": ANTON, "size": 80, "color": "#FFC72C"},
        "stroke": {"width": 5, "color": "#000000"},
        "style": {"textTransform": "uppercase", "lineHeight": 1.05},
        "background": {"color": "#000000", "opacity": 0.55, "borderRadius": 18},
        "align": {"horizontal": "center", "vertical": "middle"},
        "animation": {"preset": "ascend", "direction": "up", "duration": 0.33}},
        "start": cta_start, "length": r(total - cta_start), "width": 940, "height": 240, "position": "center", "offset": {"x": 0, "y": 0.0 if split else 0.06}}
    text_tracks += [{"clips": [hook_clip]}, {"clips": [cta_clip]}]
    split_tracks = []
    if split:
        a, b = eras[0], eras[-1]
        # 1925 image shifted up by half a screen -> its lower half (taxi) fills the top half;
        # the 2025 era clip keeps running underneath, its lower half (taxi) fills the bottom half
        split_tracks.append({"clips": [{"asset": {"type": "image", "src": a["image"]}, "start": last_end, "length": split,
            "fit": "crop", "offset": {"x": [{"from": -1, "to": 0, "start": 0, "length": 0.33, "interpolation": "bezier", "easing": "easeOutCubic"}], "y": 0.5}}]})
        split_tracks.insert(0, {"clips": [{"asset": {"type": "svg", "src": '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="10"><rect width="1080" height="10" fill="#FFC72C"/></svg>'},
            "start": r(last_end + 0.2), "length": r(split - 0.2), "width": 1080, "height": 10, "position": "center"}]})
        for e, pos in ((a, "top"), (b, "bottom")):
            split_tracks.insert(0, {"clips": [{"asset": {"type": "rich-text", "text": str(e["year"]),
                "font": {"family": ANTON, "size": 120, "color": "#FFFFFF"}, "stroke": {"width": 5, "color": "#000000"},
                "align": {"horizontal": "center", "vertical": "middle"}},
                "start": r(last_end + 0.2), "length": r(split - 0.2), "width": 600, "height": 150,
                # centered right above/below the CTA box: phone UI covers the corners and top/bottom edges
                "position": "center", "offset": {"x": 0, "y": 0.13 if pos == "top" else -0.13}}]})

    # progress bar 1925 -> 2025 (reaches full width at the last cut)
    bar = {"asset": {"type": "svg", "src": '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="14"><rect width="1080" height="14" fill="#FFC72C"/></svg>'},
           "start": 0, "length": total, "width": 1080, "height": 14, "position": "bottom", "offset": {"x": [
               {"from": -1, "to": 0, "start": 0, "length": starts[-1], "interpolation": "linear"}], "y": 0}}
    # camera flash at each cut
    flashes = [{"asset": {"type": "svg", "src": '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920"><rect width="1080" height="1920" fill="#FFFFFF"/></svg>'},
                "start": r(c - 0.04), "length": 0.16,
                "opacity": [{"from": 0.35, "to": 0, "start": 0, "length": 0.16, "interpolation": "linear"}]} for c in starts[1:] + ([last_end] if split else [])]
    fx_tracks = [{"clips": [bar]}, {"clips": flashes}]

    # audio
    shutter, svol = spec["sound"]["shutter"], spec["sound"].get("shutter_vol", 0.9)
    shut = [{"asset": {"type": "audio", "src": shutter, "volume": svol}, "start": max(0, r(c - 0.03)), "length": 0.6} for c in starts]
    hit = [{"asset": {"type": "audio", "src": SFX + spec["sound"].get("final_hit", "impact_box.wav"), "volume": 0.8},
            "start": r(starts[-1] - 0.02), "length": 1.0}]
    music = [{"asset": {"type": "audio", "src": spec["music"], "volume": spec.get("music_vol", 0.8), "effect": "fadeOut"},
              "start": 0, "length": total}]
    era_sfx = [{"asset": {"type": "audio", "src": e["sfx"], "volume": e.get("sfx_vol", 0.55)},
                "start": r(starts[i] + 0.05), "length": e.get("sfx_len", 1.0)} for i, e in enumerate(eras) if e.get("sfx")]
    if split:
        shut.append({"asset": {"type": "audio", "src": shutter, "volume": svol}, "start": r(last_end - 0.03), "length": 0.6})
    audio_tracks = [{"clips": shut}, {"clips": hit}] + ([{"clips": era_sfx}] if era_sfx else []) + [{"clips": music}]

    edit = {"timeline": {"background": "#000000", "fonts": [{"src": FONT_ANTON}, {"src": FONT_MONT}],
                         "tracks": text_tracks + split_tracks + fx_tracks + img_tracks + audio_tracks},
            "output": {"format": "mp4", "size": {"width": 1080, "height": 1920}, "fps": 30}}
    meta = {"total": total, "cuts": starts[1:], "n": n, "split_at": last_end if split else None}
    return edit, meta

def audit(edit, meta, spec):
    errs = []
    if not 12 <= meta["total"] <= 25: errs.append(f"length {meta['total']}s outside 12-25s")
    years = [e["year"] for e in spec["eras"]]
    if years != sorted(years): errs.append("years not ascending")
    for tr in edit["timeline"]["tracks"]:  # strict: Shotstack rejects even float-rounding overlaps
        cl = sorted(tr["clips"], key=lambda c: c["start"])
        for a, b in zip(cl, cl[1:]):
            if a["start"] + a["length"] > b["start"]: errs.append(f"overlap on track at {b['start']}")
    for e in spec["eras"]:
        if len(e["label"]) > 32: errs.append(f"label too long: {e['label']}")
        if not e["image"].startswith("https://"): errs.append(f"image not public: {e['year']}")
    return errs

if __name__ == "__main__":
    spec = json.load(open(sys.argv[1]))
    edit, meta = build(spec)
    json.dump(edit, open(sys.argv[2], "w"), indent=1)
    errs = audit(edit, meta, spec)
    print(json.dumps(meta), "AUDIT:", "GREEN" if not errs else "RED " + "; ".join(errs))
    sys.exit(1 if errs else 0)
