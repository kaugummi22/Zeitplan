"""Baut index.html aus src/cloud.js und src/zeitplan.html.
Aufruf im Projektordner: python3 build.py
config.js bleibt eine eigene Datei (Client-ID der Microsoft-Anmeldung)."""
import pathlib
R = pathlib.Path(__file__).resolve().parent
cj = (R / "src/cloud.js").read_text(encoding="utf-8")
z = (R / "src/zeitplan.html").read_text(encoding="utf-8")
out = '''<!doctype html>
<html lang="de" spellcheck="false" writingsuggestions="false">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer">
<link rel="icon" href="favicon.ico">
<link rel="manifest" href="manifest.webmanifest">
<meta name="theme-color" content="#f5f0e8">
<meta name="apple-mobile-web-app-title" content="Semper">
<meta name="application-name" content="Semper">
<script src="config.js"></script>
<script>
''' + cj + '''
try { if (navigator.serviceWorker) navigator.serviceWorker.register("sw.js").catch(function () {}); } catch (e) {}
</script>
''' + z + '\n</html>\n'
(R / "index.html").write_text(out, encoding="utf-8")
print("index.html gebaut:", len(out), "Zeichen")
