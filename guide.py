"""Offline HTML pages served by the backend. No JavaScript, no fonts, no CDN: they work on a ship with no internet.
  /guide  the crew medical guide (everything in precautions.json)
  /help   the API reference (replaces FastAPI's /docs, which loads its code from a CDN)"""
import html

STYLE = """<style>
:root{--bg:#f4f6f9;--card:#fff;--tx:#14202b;--mut:#5b6b7a;--bd:#dbe2ea}
@media (prefers-color-scheme:dark){:root{--bg:#0e141b;--card:#18212b;--tx:#e8eef4;--mut:#93a3b3;--bd:#2a3744}}
body{margin:0;background:var(--bg);color:var(--tx);font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:720px;margin:0 auto;padding:16px}h1{font-size:1.4rem;margin:.2em 0}h2{font-size:1.1rem;margin:1.2em 0 .3em}
.card{background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:12px 14px;margin:10px 0}
details{background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:10px 14px;margin:10px 0}
summary{font-weight:700;cursor:pointer}ul,ol{margin:.3em 0 .6em;padding-left:1.3em}.mut{color:var(--mut);font-size:.9rem}
.l{display:inline-block;padding:1px 9px;border-radius:99px;color:#14202b;font-weight:700;font-size:.8rem;margin-top:.6em}
.l1{background:#F2C200}.l2{background:#F28C28}.l3{background:#D62828;color:#fff}
.sos{border-left:6px solid #D62828}code{font-size:.9em}a{color:inherit}
</style>"""
LEVELS = [("slightly_abnormal", "Slightly abnormal", "l1"), ("needs_checkup", "Needs check-up", "l2"), ("critical", "Critical", "l3")]


def _e(t):
    return html.escape(str(t))


def _ul(items, tag="ul"):
    return f"<{tag}>" + "".join(f"<li>{_e(i)}</li>" for i in items) + f"</{tag}>"


def _page(title, body):
    return (f'<!doctype html><html lang="en"><head><meta charset="utf-8">'
            f'<meta name="viewport" content="width=device-width, initial-scale=1"><title>{_e(title)}</title>{STYLE}'
            f"</head><body><main>{body}</main></body></html>")


def render_guide(lib: dict) -> str:
    b = ['<h1>Crew medical guide</h1>',
         f'<p class="mut">{_e(lib["disclaimer"])}</p>',
         '<div class="card"><b>Before you act on a reading</b>' + _ul(lib["check_first"]) + "</div>",
         '<div class="card sos"><b>Treat as an emergency at any level if there is</b>' + _ul(lib["emergency_signs"]) + "</div>",
         "<h2>What to do at each level (any condition)</h2>"]
    for key, label, cls in LEVELS:
        g = lib["general"][key]
        b.append(f'<div class="card"><span class="l {cls}">{_e(label)}</span> <b>{_e(g["title"].split(": ", 1)[-1])}</b>'
                 + _ul(g["steps"], "ol") + "</div>")
    b.append("<h2>By condition</h2>")
    for c in lib["conditions"].values():
        parts = [f'<details><summary>{_e(c["name"])}</summary><p class="mut">{_e(c["indicates"])}</p>']
        for key, label, cls in LEVELS:
            parts.append(f'<span class="l {cls}">{_e(label)}</span>' + _ul(c[key], "ol"))
        parts.append("<b>Get urgent help if</b>" + _ul(c["seek_urgent_help_if"]) + "</details>")
        b.append("".join(parts))
    return _page("Crew medical guide", "".join(b))


def render_help(openapi: dict) -> str:
    rows = {}
    for path, ops in openapi.get("paths", {}).items():
        for method, op in ops.items():
            rows.setdefault((op.get("tags") or ["other"])[0], []).append((method.upper(), path, op.get("summary", "")))
    b = [f'<h1>{_e(openapi.get("info", {}).get("title", "API"))}: reference</h1>',
         '<p class="mut">Works offline. Machine-readable schema: <a href="/openapi.json">/openapi.json</a>. '
         'Crew medical guide: <a href="/guide">/guide</a>. Camera monitor: <a href="/camera">/camera</a>.</p>']
    for tag, items in sorted(rows.items()):
        b.append(f"<h2>{_e(tag)}</h2><div class=\"card\"><ul>" + "".join(
            f"<li><code>{_e(m)} {_e(p)}</code><br><span class=\"mut\">{_e(s)}</span></li>" for m, p, s in sorted(items, key=lambda x: x[1])) + "</ul></div>")
    return _page("API reference", "".join(b))
