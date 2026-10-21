# Semper – Projektnotiz

Diese Notiz ist das Gedächtnis des Projekts. Eine neue Unterhaltung liest sie zuerst und kann dann ohne Vorgeschichte weiterarbeiten.

## Worum es geht

**Semper** (früher «Zeitplan») ist Katharinas persönliche App für den Schulalltag: Termine, Jahresplanung der Unterrichtsreihen, Klassen mit Stundenplan und Lektionsverteilung, und eine Unterrichtsseite pro Lektion zum Zeigen und Projizieren.

- App: https://kaugummi22.github.io/zeitplan/ (installierbar als App, PC/Tablet/Handy)
- Code: GitHub `kaugummi22/zeitplan` (öffentlich)
- Daten: nur in Katharinas OneDrive (privates Microsoft-Konto)

## Zusammenarbeit

- Antworten auf **Deutsch (Schweiz)**: «ss» statt «ß», Anrede **«Sie»**.
- Katharina ist Lehrerin und **keine Programmiererin**. Ergebnisse in Alltagssprache erklären, keine Technik-Details, keine Dateipfade im Text.
- Sie schickt oft mehrere Wünsche in einer Nachricht (auch diktiert, mit Tippfehlern wie «Kassen» = «Kästen»). Alle umsetzen, testen, veröffentlichen, dann knapp berichten, was neu ist und wie man es bedient.
- Nach jeder Veröffentlichung daran erinnern: **Strg+Umschalt+R** (PC) bzw. App schliessen und neu öffnen (Tablet/Handy).

## Regeln (gelten immer)

1. **Nur Katharina** hat Zugriff auf die Daten. Ihre E-Mail-Adresse nirgends hinschicken oder einbauen.
2. **Nichts Urheberrechtliches hochladen**: keine Lehrmittel, Bücher oder Scans. Keine Klassenspiegel und keine Schülerdaten. Schülerdaten gehören später in ein Schulkonto.
3. Der **öffentliche Code** enthält keine Inhalte aus Reihen oder Unterricht und keine Datendateien. Der Vorname «Katharina» darf vorkommen.
4. Auf ihrem PC nur im Planungsordner `OneDrive\0_Planung` arbeiten. Löschen geht dort nicht.
5. **Daten in OneDrive schreiben** (die JSON-Dateien in `daten/`) nur so:
   - Katharina sagt vorher **«los»** und bearbeitet etwa 2 Minuten nichts.
   - Eindeutige Dateinamen beim Bereitstellen verwenden.
   - Danach prüfen (erneut holen, md5 vergleichen, `expectedMtimeMs` nutzen).
6. Keine fremden Dienste einbauen, die Daten aus OneDrive hinausschicken. Ausnahme: Bibliotheken von cdnjs/jsdelivr (pdf.js, mammoth, xlsx, JSZip) laufen im Browser.
   - Ausnahme, von Katharina am 16.10.2026 erlaubt: **ntfy.sh** für die Handy-Umfrage. Übermittelt wird nur «Runde:Antwortnummer», keine Frage, keine Namen; ntfy.sh löscht nach höchstens 12 Stunden.
7. Vorschläge für Fremd-Tools (z. B. OmniRoute, Ponytail, Graphify) wurden geprüft und **nicht** übernommen.

## Aufbau

```
index.html            ← wird gebaut, nicht von Hand ändern
build.py              ← baut index.html aus src/
src/zeitplan.html     ← die App: HTML, CSS und JavaScript (rund 7000 Zeilen)
src/cloud.js          ← Anmeldung, OneDrive-Speicher, Offline-Modus, Sicherungen
config.js             ← Microsoft-Client-ID (ca7cda99-99cc-4526-b205-67126bf0a008)
sw.js                 ← Service Worker (App offline, Netz zuerst, Cache "zeitplan-app-v1", lässt pdf/ aus)
manifest.webmanifest  ← Name «Semper», Icons
pdf/index.html        ← Weiterleitung zur eigenen PDF-App (Repo kaugummi22/PDF)
umfrage/index.html    ← Abstimmungsseite für die Handys der Klasse (eigenständig, ohne Anmeldung)
```

**Bauen und veröffentlichen:**
1. `python3 build.py`
2. Mit Commit-Zeilen `Co-Authored-By` und `Claude-Session` committen.
3. `git pull --rebase && git push`. GitHub Pages ist nach etwa 1 Minute aktuell.

**Anmeldung:** Microsoft, OAuth mit PKCE (ohne Geheimnis), privates Konto. Graph-Zugriff in `cloud.js` über `g(path)`.

### Daten in OneDrive (`0_Planung/Zeitplan-App/`)

- `daten/<sammlung>.json`, `COLS = days, notes, reihen, plan, klassen, vorlagen, seiten`
- `dokumente/<id>`: hochgeladene Dateien, in der App als `/_blob/<id>`
  - `cloud.js` ersetzt `fetch` und `img.src` dafür.
  - Für Bilder im Code `lkLoadImg(src)` verwenden, **nicht** `new Image()` mit `/_blob/`.
- `Zeitplan Sicherung/JJJJ-MM-TT/`: tägliche Sicherung
- `temp/`: kurz abgelegte Dateien für die PDF-Umwandlung (werden wieder gelöscht)
- Reihen-Ordner unter `0_Planung/Reihen/…`, Klassenordner unter `0_Planung/Klassen/…`
  - Zugriff über `window.ZLOCAL`: `open, list, read, place, exists, mkdir, copy, write, toPdf`
- Offline: IndexedDB `zeitplan-offline`. Änderungen werden später hochgeladen.
- Die App-Oberfläche spricht Daten über `state.db.collection(c).doc(id).get/set/onSnapshot` an.

## Die vier Bereiche (Tabs: Termine | Planung | Klassen | Unterricht)

**Termine** (`view-termine`)
- Ansichten Kommend, Archiv und Kalender. Auf kleinen Geräten startet der Kalender.
- Zellen lassen sich teilen und verbinden, mit Teilen-Feldern (`from2`, `to2`, `details2`, `files2`, `todo`/`done`).
- To-do-Kästchen, Serien und Ferien.

**Planung** (`data-tab="unterricht"`, `view-unterricht`)
- Unterrichtsreihen mit Lektionen und Dokumenten, Dokumentgruppen (`r.fgroups`) und Materialsammlung.
- Jahresplan mit Jahren 0–6: 5 ist «Anderes», 6 ist «Einzellektionen».
  - Ausblenden mit dem Auge.
  - Spaltenhöhen einzeln einstellbar.
  - Reihen zwischen Jahren ziehen.
  - Literatur-Zeichen «Lit» (kleines Kästchen, kein Emoji; `r.lit`): Häkchen in der Reihe oder Rechtsklick im Jahresplan; Filter «Reihen ▾» → Nur Lit / Ohne Lit (`UP.lit`).
  - Neben «Leitfrage oder Leitproblem» aufklappbare «Notizen» (`r.arbnotiz`, Arbeitsnotizen zur Überarbeitung; offen, wenn gefüllt; Zustand pro Gerät `zeitplan-arb`), werden durchsucht, aber nicht gedruckt.
  - Aussehen (20.10.2026): weisse Karten, Wichtigkeit nur als Farbstreifen links (`--p-*`: Koralle, Bernstein, Salbei, Blau, Grau), Lektionen «10 L» rechts neben dem Titel, kompakte Karten, Spaltenkopf «1. SJ · 111 L», Bahnen `--jp-lane`. «Wichtigkeiten ▾» (`prioFilterMenu`) = Farbstreifen an/aus, Legende mit Anzahl, Filter. Notizspalte über «Notizen» bzw. › ausblendbar (`UP.notes`, ohne Wahl erst ab 1150 px sichtbar). «Anzeigen ▾»: Standard: Unterreihen nur als ↳-Verknüpfung in ihrer Masterreihe (wenn diese in derselben Spalte steht); «Unterreihen einzeln anzeigen» (`UP.kidCards`) zeigt sie zusätzlich als eigene Karten; gilt auch in der Reihenliste (`dropKids`, `kidsLinks`). Ketten: eine Unterreihe, die selbst Masterreihe ist, erscheint unter ihrer Masterreihe und zusätzlich als eigene Karte; Kreise verhindert (`descOf`); Spaltensumme zählt jede Reihe einmal. «Lit-Reihen unten sammeln» (`UP.litGroup`, `litSplit`) in Jahresplan und Reihenliste, über den ausgeblendeten. Unterpunkte werden nicht mehr angezeigt (nur erfasst und durchsucht), «Nach Planungsstand gruppieren» entfernt. Spalten füllen die Fensterhöhe (`--jp-h`, `jpBoxes`), volle Breite (`html.jpw`); unter 980 px Breite (Container-Abfrage) fünf Jahre nebeneinander, «Anderes»/«Einzellektionen» als Band darunter.

  - **Lektionen lösen und gruppieren** (21.10.2026): Rechtsklick (Tablet/Handy: lange drücken, `longPress`) auf eine Reihe im Jahresplan → «Lektionen lösen oder gruppieren …» (`lnMultiDialog`: anhaken, dann Lösen / In andere Reihe / Zu neuer Reihe). In der Reihen-Ansicht dasselbe über ⋮, Rechtsklick oder langes Drücken auf L1 (`lessonMenu`); L1 auf eine Reihe in der Liste links ziehen verschiebt sie dorthin. Gelöste Lektion = kleine Reihe mit `loose: true`, `from` («Reihe · L3») bei «Einzellektionen», gestrichelte Karte mit «L». Einzellektion auf die Mitte einer Reihe ziehen = dort anhängen; Strg+Klick bzw. Menü «Auswählen» → Leiste unten (`jselBar`, `JSEL`): «Zu neuer Reihe gruppieren» (Name, Schuljahr) oder «In eine Reihe einfügen …». Inhalt, Phase, Ziele, Lektionsplanung, Notizen, Dokumente wandern mit (`takeBlocks`/`addBlocks` über `blocksData`/`writeBlocks`); Materialsammlungen/Unterreihen behalten ihren Platz. Jede Aktion hat «↶ Rückgängig» im Hinweis unten (`lnDo`, `lnToast`). Klassen-Kopien sind ausgenommen.

**Kopfzeile am Handy** (unter 700 px): Semper und Datum in einer Zeile, Reiter darunter, − + 💾 ‹› hinter ⋯ (`hdrMore`). Am Handy springen Termine (Kalender) und Klassen (Tagesplan) beim Öffnen zu heute (`jumpTodayNow`). Lange Hilfetexte stehen hinter «ⓘ Hilfe» (`details.hint`).

**Klassen** (`view-klassen`)
- Klassen mit Wochenstundenplan (Zusatz, z. B. Zimmer) und Reihen-Kopien pro Klasse.
- Die Lektionen werden automatisch verteilt (`classSchedule`): Verschieben, Tagesplan und Lektionsnamen.
- Klassenordner in OneDrive.
- Zeitplan der Klasse: Reihe klein, dann «L1» bzw. eigener Name (`slots[sk].label`, leer = L1), darunter der Titel aus dem Original (Phase, sonst erste Zeile der Planung; änderbar als `topic`). Im Tagesplan-Dialog «Thema im Tagesplan» (`dp`) = eigener Text, leer = Reihe · Lektion.
- «Als Original übernehmen» schreibt eine Fassung aus der Klasse zurück in die Reihe.

**Unterricht** (`data-tab="lektion"`, `view-lektion`, Code-Präfix `lk`)
- **Aufbau:**
  - Links eine einklappbare Leiste mit Klasse und Lektion, rechts einklappbare Dokumente.
  - Pro Lektion eine Seite in der Sammlung `seiten`, Schlüssel `klasse~reihe~lektion`, Inhalt `{html, at}`.
  - Speichern über `lkSave` → `lkPersist`, verzögert um 700 ms.
  - Erlaubtes HTML legt `lkSanitize` fest, mit einer Klassen-Whitelist.
- **Werkzeugleiste:**
  - Rückgängig/Wiederholen mit eigenem Verlauf (`LK.undo`/`LK.redo`, Strg+Z/Y)
  - Titel, Untertitel, Text
  - A−/A+ (`fs-1…7`) und Zeilenabstand (`lh-1/3/4`)
  - Ausrichtung (`al-c/r/j`) und Einrücken (`ind-1…8`, Tab/Umschalt+Tab)
  - Fett, Kursiv, Unterstrichen; Schriftfarbe und Marker (`tc-*`, `hl-*`)
  - Listen
  - Kästen in 9 Farben (`lk-box c-*`), mehrzeilig: Enter bleibt im Kasten, zweimal Enter verlässt ihn
  - Symbole (`LK_EMO`) und Mittelpunkt «·»
  - Linien: **Abschnitt** `<hr>`, **Schritt** `<hr class="lk-step">`, **Visual** `<hr class="lk-vis">`. Abschnitt und Schritt werden nicht gedruckt.
  - Bild
- **Folien und Seiten aus Dokumenten (🖼):**
  - PDF direkt.
  - PowerPoint und Word werden über `ZLOCAL.toPdf` umgewandelt (Microsoft `?format=pdf`). **Mit dem echten Konto noch unbestätigt**; der Notweg ist ein PDF-Export.
  - Eingefügt als `<figure class="lk-fig">` mit Bild und optional `img.lk-ink`.
- **Bilder bearbeiten:**
  - Tippen öffnet das Reinschreiben (`lkInk`): Stift, Marker, Radierer, Text. Die Werkzeuge stehen links und lassen sich einklappen.
  - Rechtsklick oder langes Drücken öffnet `lkFigPop`:
    - Grösse (Inline-Stil `width:%`)
    - Lage (`pos-l/r`) und Text daneben (`fl-l/r`)
    - Verschieben (`left`, `margin-top`, auch durch Ziehen)
    - Ausschnitt (`lkCrop`: Klasse `crop` mit `--cx/--cy/--cw/--ch/--ar`)
  - Vor dem Entfernen fragt `lkConfirm` nach.
- **Projizieren:**
  - `lkProj`: dieselbe Seite ohne Kopfzeile, Leisten und Werkzeuge bei Bedarf, Stift über der Seite (vorübergehend).
  - **Folien** (`lkPresent`): Abschnitte und Schritte in einem Fenster.
  - **🖥 Beamer** (`lkPrStart`): zweites Fenster mit Abschnitt für Abschnitt. Das Hauptfenster bleibt die normale Lehreransicht (kein Wechsel zu Projizieren) plus Leiste unten: ◀ ▶, Leer (B), Beamer schliessen, Stift/Spotlight/Zoom für den Beamer. Das Beamer-Fenster selbst zeigt nur – keine Knöpfe, Karten ohne Bedienelemente (Katharina, 16.10.2026).
  - **📡 Beamer an anderem Gerät** (`lkPrRemote`, 21.10.2026): für das Tablet am Beamer (iPad spiegelt nur). Ein anderes Gerät (z. B. Schul-PC) hängt am Beamer und wählt «📺 Dieses Gerät ist der Beamer» (`lkRecvStart`, auch Adresse mit `#beamer`). Das Tablet behält seine eigene Ansicht (Planung, Notizen) und schaltet mit derselben Leiste weiter. Übertragung nur über das eigene OneDrive: das Tablet schreibt den gezeigten Schritt (ohne Notizen) in `Zeitplan-App/temp/beamer.json` (`window.ZBEAM`), das Beamer-Gerät holt die Datei alle 1,2 s (Verzögerung etwa 1–3 s). Stift/Spotlight/Zoom und Werkzeug-Karten gibt es dort noch nicht.
  - Die Aufteilung macht `lkDeck`. Gibt es keine Abschnittslinien, trennen Titel H1/H2.
- **Checkliste und Tabelle** (Werkzeugleiste): `ul.lk-check` mit `li.done` (Klick aufs Kästchen, auch in Folien/Beamer; Zuordnung über die Reihenfolge `lkCheckIdx`), `table.lk-tab` mit Zeilen/Spalten-Befehlen (`lkTableOp`), Tab springt in die nächste Zelle. Word-Export kennt beides.
- **Hilfsmittel beim Projizieren** (Kopfzeile beim Projizieren «🔦 Spotlight», «🔍 Zoom», «Werkzeuge ▾»; Folien-Leiste; Beamer-Leiste im Hauptfenster):
  - Spotlight (`lkSpot`), Zoom (`lkZoom`, auch Doppelklick auf Absatz/Bild), Stift über Folien/Beamer (`lkPenDoc`, «Wegwischen», beim nächsten Abschnitt weg). Wirken im jeweiligen Fenster.
  - Karten Timer/Stoppuhr, Zufall, QR-Code, Umfrage (`LKW_DEF`): erscheinen im Hauptfenster und gleichzeitig im Beamer-Fenster, verschiebbar, gross/klein.
  - Auf der Unterrichtsseite auch ohne Projizieren über den Knopf «Werkzeuge ▾» (nur dort; beim Wechsel des Reiters schliessen sich die Karten). QR-Code mit «Als Bild speichern», Zufall mit Klassenwahl oder eigener Liste. Umfrage: QR-Code zur Abstimmungsseite `umfrage/` (Frage und Antworten nur im Link nach #), Stimmen über ntfy.sh (Thema `semper-<zufall>`, Nachricht `runde:nummer`), Live-Balken in Semper und im Beamer-Fenster; «Neue Runde» = neuer QR-Code. Ein Handy stimmt pro Runde einmal ab.
  - Regeln: Namen für den Zufall nur im Browser des Geräts (`semper-namen-<klasse>`), nie in OneDrive. QR-Code wird im Browser erzeugt (qrcode-generator von jsdelivr), nur für öffentliche Links. Umfrage siehe Ausnahme in Regel 6.
- **Zeigen ▾** (`lkShowPop`): Projizieren, Folien und Beamer in einem Knopf (beim Projizieren bleiben die Einzelknöpfe).
- **Start der Seite** (`lkAutoPick`): öffnet Klasse und Lektion, die gerade läuft oder als Nächstes kommt; eine eigene Wahl bleibt, bis die nächste Lektion beginnt.
- Aufklappmenüs bleiben im Bildschirm (`lkPopFit`); am Handy ist die Werkzeugleiste eine Reihe zum Wischen.
- **Ausgeben** (`lkOutput`):
  - Formate Word (eigener Generator `lkDocx` mit JSZip; Absatz-Eigenschaften in Schema-Reihenfolge über `PPR`) und PDF (Word → Microsoft-Umwandlung).
  - Speichern unter auf dem Gerät (`showSaveFilePicker`) oder in einen OneDrive-Ordner mit Ordnerwahl; ausserdem Drucken.

## Testen

Playwright mit installiertem Chromium und einer nachgebauten Graph-Schnittstelle:
- Routen für `graph.microsoft.com`, `login.microsoftonline.com` und Download-URLs werden auf einen lokalen Testordner umgeleitet.
- `python3 -m http.server` auf `site/` mit `config.js` und Client-ID `test-client`.
- **Testdaten nie ins Repo**: nur ein synthetischer Ordner mit `daten/*.json` (inklusive `seiten.json = {}`), `dokumente/` und leerem `Zeitplan Sicherung/`.
- Der Testrechner hat kein Internet zu cdnjs:
  - pdf.js aus `/opt/npm-tools/node_modules/pdfjs-dist/legacy/build/` über `add_init_script` laden.
  - JSZip aus `/opt/npm-tools/node_modules/jszip/dist/`.
- Word-Ergebnis mit LibreOffice (`soffice --convert-to pdf`) und `pdftoppm` ansehen.
- Handy-Test: 390×844, `is_mobile`.
- Vor jeder Veröffentlichung die Hauptabläufe prüfen und Bildschirmfotos ansehen.

## Offen / später

- **Mit dem echten Konto prüfen:** Umwandlung PowerPoint/Word → PDF (`toPdf`). Katharina gibt Rückmeldung.
- **Beamer-Fenster** am Laptop mit zweitem Bildschirm ausprobieren. Auf dem iPad gibt es kein zweites Fenster. Lösung fürs Tablet: «📡 Beamer an anderem Gerät» – Rückmeldung aus dem Schulzimmer offen.
- **Ideen besprochen, nicht gebaut:**
  - «Mitlesen» (Laptop holt Tablet-Änderungen alle 2–3 s) und Tablet als Fernbedienung
  - Abschnittsweise speichern bzw. ausgeben, Abschnitte als Bausteine
- **Zurückgestellt:**
  - Erinnerungen (Outlook-Kalender oder To Do)
  - OneNote/Schulkonto
  - Doppelte Reihen zusammenführen
- **Vorschläge:**
  - Wiederherstellen aus einer Sicherung einmal zur Probe
  - `src/zeitplan.html` später in Teile aufteilen, damit weniger gelesen werden muss
