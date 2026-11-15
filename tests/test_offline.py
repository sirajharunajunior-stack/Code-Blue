"""Offline / spaceflight checks. No FastAPI needed.   Run: python tests/test_offline.py"""
import glob
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

import advice  # noqa: E402
import guide  # noqa: E402

read = lambda *p: open(os.path.join(ROOT, *p), encoding="utf-8").read()


def test_guide_is_complete_offline_and_safe_html():
    lib = advice.library()
    h = guide.render_guide(lib)
    assert lib["disclaimer"].split(".")[0] in h
    for c in lib["conditions"].values():
        assert c["name"] in h
        for lvl in ("slightly_abnormal", "needs_checkup", "critical"):
            assert c[lvl][0].replace("&", "&amp;")[:30] in h.replace("&#x27;", "'").replace("&quot;", '"') or c[lvl][0][:30] in h
    assert "<script" not in h and "http://" not in h and "https://" not in h
    assert "<script>" not in guide.render_guide({**lib, "disclaimer": "<script>x</script>"})      # escaped


def test_help_page_lists_endpoints_offline():
    spec = {"info": {"title": "T"}, "paths": {"/api/readings": {"post": {"tags": ["vitals"], "summary": "Store <readings>"}}}}
    h = guide.render_help(spec)
    assert "POST /api/readings" in h and "Store &lt;readings&gt;" in h and "https://" not in h and "<script" not in h


def test_served_page_and_guide_load_nothing_from_the_internet():
    cam = read("static", "camera.html")
    assert not re.search(r"https?://", cam)
    assert not re.search(r"<link[^>]+href|<script[^>]+src|@import|url\(", cam)


def test_server_code_makes_no_network_calls():
    bad = re.compile(r"^\s*(import|from)\s+(requests|urllib|httpx|aiohttp|socket|http\.client|ftplib|smtplib|websockets)\b", re.M)
    for f in glob.glob(os.path.join(ROOT, "*.py")):
        assert not bad.search(open(f, encoding="utf-8").read()), f


def test_cdn_based_docs_are_disabled():
    src = read("main.py")
    assert "docs_url=None" in src and "redoc_url=None" in src         # /docs and /redoc fetch their code from a CDN


def test_precautions_fit_spaceflight():
    s = read("precautions.json").lower()
    for phrase in ("emergency services", "on earth", "driving", "lie down", "sit upright", "legs raised",
                   "lay the person flat", "hospital", "ambulance", "feet flat"):
        assert phrase not in s, phrase
    lib = json.loads(s)
    first = json.load(open(os.path.join(ROOT, "precautions.json")))["general"]["critical"]["steps"][0]
    assert "crew medical officer" in first and "do not wait for a reply" in first    # works through comms delays
    assert "microgravity" in s


def test_no_function_shadows_an_imported_module():
    """Regression: an endpoint named `advice` once shadowed `import advice`, which would have crashed /guide."""
    import ast
    for f in ("main.py", "service.py"):
        tree = ast.parse(read(f))
        imported = {(a.asname or a.name).split(".")[0] for n in tree.body if isinstance(n, (ast.Import, ast.ImportFrom))
                    for a in n.names}
        defined = {n.name for n in tree.body if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef))}
        assert not (imported & defined), (f, imported & defined)


def test_offline_install_scripts_exist():
    for f in ("make_wheelhouse.sh", "install_offline.sh"):
        assert os.access(os.path.join(ROOT, f), os.X_OK), f
    assert "--no-index" in read("install_offline.sh")


if __name__ == "__main__":
    fails = 0
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            try:
                fn(); print("PASS", name)
            except Exception as e:  # noqa: BLE001
                fails += 1; print("FAIL", name, type(e).__name__, e)
    sys.exit(1 if fails else 0)
