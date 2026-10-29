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
- **To-dos** (vereinfacht 29.10.2026): ein To-do ist eine Zeile mit Kästchen ☐/☑ im Text (`tdpDeco`, `tdpHit`, `tdpEnter`, `tdpItems`, `tdpSet`). Anlegen nur noch über **einen** Knopf «☐» beim Schreiben im Feld (neben dem Plus, `.tdb`, `tdpToggleLine`: Zeile mit der Schreibmarke bekommt/verliert das Kästchen), im gross geöffneten Eintrag «☐ To-do» (`#d-tdb`) oder Rechtsklick › «To-do (zum Abhaken)» bzw. «To-dos entfernen». Enter in einem To-do = nächstes To-do, Enter in leerem To-do = fertig, Umschalt+Enter = normale Zeile. Kästchen sehen aus wie früher (abgerundet, abgehakt = blau mit ✓; Zeichen ☐/☑ bleibt im Text, nur unsichtbar). Klick aufs Kästchen hakt ab. Das alte einzelne Kästchen pro Eintrag (`todo`/`done`) wird nur noch angezeigt und beim Öffnen bzw. über das Menü in Kästchen-Zeilen umgewandelt (`tdpFromOld`). Erinnerungen über To Do: jedes To-do als eigene Aufgabe (Schlüssel `tag|feld|teil|n`).
- **Einträge verschieben mit der Maus** (29.10.2026, nur Maus, `MV`, `mvDo`): Feld in der Liste bzw. Eintrag im Kalender anfassen und auf ein anderes Feld bzw. einen anderen Kalendertag ziehen. Leeres Ziel = verschieben, besetztes Ziel = Plätze tauschen. «↶ Rückgängig» in der Leiste oben (`#t-undo`, mehrere Schritte), im Hinweis unten und Strg+Z (ausserhalb von Textfeldern).

**Planung** (`data-tab="unterricht"`, `view-unterricht`)
- Unterrichtsreihen mit Lektionen und Dokumenten, Dokumentgruppen (`r.fgroups`) und Materialsammlung.
- Jahresplan mit Jahren 0–6: 5 ist «Anderes», 6 ist «Einzellektionen».
  - Ausblenden mit dem Auge.
  - Spaltenhöhen einzeln einstellbar.
  - Reihen zwischen Jahren ziehen.
  - Materialsammlungen: «◂ Notiz klein» / «▸ Notiz zeigen» (`m.slim`, ohne Wahl klein ab 7 Dokumenten und leerer Notiz) – Dokumente dann in Spalten über die ganze Breite.
  - Literatur-Zeichen «Lit» (kleines Kästchen, kein Emoji; `r.lit`): Häkchen in der Reihe oder Rechtsklick im Jahresplan; Filter «Reihen ▾» → Nur Lit / Ohne Lit (`UP.lit`).
  - Neben «Leitfrage oder Leitproblem» aufklappbare «Notizen» (`r.arbnotiz`, Arbeitsnotizen zur Überarbeitung; offen, wenn gefüllt; Zustand pro Gerät `zeitplan-arb`), werden durchsucht, aber nicht gedruckt.
  - Aussehen (20.10.2026): weisse Karten, Wichtigkeit nur als Farbstreifen links (`--p-*`: Koralle, Bernstein, Salbei, Blau, Grau), Lektionen «10 L» rechts neben dem Titel, kompakte Karten, Spaltenkopf «1. SJ · 111 L», Bahnen `--jp-lane`. «Wichtigkeiten ▾» (`prioFilterMenu`) = Farbstreifen an/aus, Legende mit Anzahl, Filter. Notizspalte über «Notizen» bzw. › ausblendbar (`UP.notes`, ohne Wahl erst ab 1150 px sichtbar). «Anzeigen ▾»: Standard: Unterreihen nur als ↳-Verknüpfung in ihrer Masterreihe (wenn diese in derselben Spalte steht); «Unterreihen einzeln anzeigen» (`UP.kidCards`) zeigt sie zusätzlich als eigene Karten; gilt auch in der Reihenliste (`dropKids`, `kidsLinks`). Ketten: eine Unterreihe, die selbst Masterreihe ist, erscheint unter ihrer Masterreihe und zusätzlich als eigene Karte; Kreise verhindert (`descOf`); Spaltensumme zählt jede Reihe einmal. «Lit-Reihen unten sammeln» (`UP.litGroup`, `litSplit`) in Jahresplan und Reihenliste, über den ausgeblendeten. Unterpunkte werden nicht mehr angezeigt (nur erfasst und durchsucht), «Nach Planungsstand gruppieren» entfernt. Spalten füllen die Fensterhöhe (`--jp-h`, `jpBoxes`), volle Breite (`html.jpw`); unter 980 px Breite (Container-Abfrage) fünf Jahre nebeneinander, «Anderes»/«Einzellektionen» als Band darunter.

  - Reihen-Ansicht: kein blauer Punkt mehr bei Lektionen; das Plus «Gross öffnen» ist dunkelblau gefüllt, wenn die Lektion etwas enthält (Planung, Notizen, Dokumente). In der Masterreihe frei ziehen (23.10.2026, `masterDrag`, `lnPlace`, `setBlocks`): eigene Lektionen und Lektionen der Unterreihen an jede Stelle – zwischen Lektionen einer Unterreihe (dorthin verschoben), auf den Kopf einer Unterreihe (an ihren Anfang), zwischen eigene Lektionen bzw. auf «+ Leistungsnachweis» (gehört dann zur Masterreihe). Verweise wandern mit (Materialsammlungen `after`, Unterreihen `after`/`place`, Anpassungen `ov` in allen Masterreihen); eine angepasste Lektion wird in der gezeigten Fassung übernommen. Rechtsklick/lange drücken auf A·L1 … (`childLessonMenu`): In die Masterreihe nehmen, ▲/▼, In andere Unterreihe. ↳-Link in der Reihenliste: ans Ende. «↶ Rückgängig» im Hinweis.
  - **Materialsammlungen in Unterreihen** (23.10.2026): erscheinen in der Masterreihe im Abschnitt der Unterreihe («A·M1», nach ihrer Lektion), dort beschreibbar, «+ Materialsammlung» im Kopf der Unterreihe; gespeichert direkt in der Unterreihe (`childMatHtml`, `data-mrid`, Feld `cln.<rid>.<k>`, `mrOf`). Nicht in Klassen-Kopien und Druck.
  - **Lektionen lösen und gruppieren** (21.10.2026): Rechtsklick (Tablet/Handy: lange drücken, `longPress`) auf eine Reihe im Jahresplan → «Lektionen lösen oder gruppieren …» (`lnMultiDialog`: anhaken, dann Lösen / In andere Reihe / Zu neuer Reihe). In der Reihen-Ansicht dasselbe über ⋮, Rechtsklick oder langes Drücken auf L1 (`lessonMenu`); L1 auf eine Reihe in der Liste links ziehen verschiebt sie dorthin. Gelöste Lektion = kleine Reihe mit `loose: true`, `from` («Reihe · L3») bei «Einzellektionen», gestrichelte Karte mit «L». Einzellektion auf die Mitte einer Reihe ziehen = dort anhängen; Strg+Klick bzw. Menü «Auswählen» → Leiste unten (`jselBar`, `JSEL`): «Zu neuer Reihe gruppieren» (Name, Schuljahr) oder «In eine Reihe einfügen …». Inhalt, Phase, Ziele, Lektionsplanung, Notizen, Dokumente wandern mit (`takeBlocks`/`addBlocks` über `blocksData`/`writeBlocks`); Materialsammlungen/Unterreihen behalten ihren Platz. Jede Aktion hat «↶ Rückgängig» im Hinweis unten (`lnDo`, `lnToast`). Klassen-Kopien sind ausgenommen.

  - **Tabellen in den Notizen** (23.10.2026): Knopf «▦ Tabelle» in der Notizen-Leiste: Raster 8×8 oder Spalten/Zeilen eingeben (wie Word; auch auf der Unterrichtsseite unter «▦ Tabelle»). Steht der Cursor in einer Tabelle (Notizen oder Unterrichtsseite), erscheint zuerst nur ein blauer Punkt oben links (`tt-min`); ein Klick darauf zeigt den Rahmen (`TT`, `ttShow`): rechts ziehen = Breite (%), unten = Höhe (em), Linien zwischen Spalten = Spaltenbreiten (% in der ersten Zeile, `table-layout:fixed`), ✥ ziehen = verschieben zwischen Absätze oder neben ein Bild (Bild wird links/rechts gestellt, Tabelle daneben), «Tabelle ▾» = Lage `tp-l`/`tp-c`/`tp-r`, ↑/↓, Zeilen/Spalten (`tableOp`), Grösse zurücksetzen, löschen. Gespeichert über `tabHtml` (beide Sanitizer). Tab = nächste Zelle, in der letzten Zelle neue Zeile. Gespeichert als `table.ntab` (`sanitizeNotes`); eingefügte Tabellen aus Word/Excel bleiben Tabellen. Unterricht «◫ Planung»: auf jeder Tabelle (Ablauf und Notizen) «⇥ In die Seite» (`lkInsertBlocks`, als eigener Block nach dem Absatz mit dem Cursor); Strg+C/Strg+V einer Tabelle in die Unterrichtsseite ergibt ebenfalls `table.lk-tab`. Hinüberziehen aus «◫ Planung» (27.10.2026, `lkPD`): markierter Text (mit Lehrerschrift), Bilder und Tabellen landen gesäubert (`lkSanitize`) an der Stelle, wo losgelassen wird.
  - **Dateien aus dem Explorer hineinziehen** (23.10.2026): in der Reihen-Ansicht auf eine Lektion = Dokument der Lektion, auf Hauptdokumente/Gruppe = dorthin, sonst Dokument der ganzen Reihe (`fileZone`, `vStore`, `setDocsAt`, Rahmen `.file-drop`); im gross geöffneten Lektionsfenster (ausser Notizen) = Dokument der Lektion.
  - **Lehrerschrift** (23.10.2026): `span.ls` (Ink Free/Segoe Print/Bradley Hand, rot) für Lösungen; Knopf «✎ Lehrerschrift» in Notizen, Unterrichtsseite und in der kleinen Leiste über markiertem Text der Lektionsplanung (`lsToggle`, über `fontName zp-ls`). Ohne Markierung (27.10.2026): Knopf bzw. **Strg+Umschalt+L** schaltet an der Schreibmarke um, man schreibt einfach weiter (`lsCaret`, Hilfszeichen \u200b wird beim Speichern entfernt); Knopf ist hervorgehoben (`ls-act`), solange die Schreibmarke in Lehrerschrift steht; `line-height: 1`, damit die Zeilen gleichmässig bleiben. In allen Sanitizern erhalten. Beim Zeigen standardmässig ausgeblendet (Lücke bleibt: Projizieren per CSS, Folien/Beamer/Drucken/Word über `lkStripNotes` → `ls-x` mit Leerzeichen); Umschalter `data-lsv` im «Zeigen ▾»-Menü, in der Kopfzeile beim Projizieren, in der Folien- und Beamer-Leiste (`lkLsSet`). Seit 27.10.2026 **nicht mehr gemerkt** (`LS_SHOW` nur im Speicher, `lkLsReset` bei jedem neuen Projizieren/Folien/Beamer): Lehrerschrift ist beim Zeigen immer zuerst ausgeblendet. Tabellen haben eine Quellenangabe (`caption`, «Tabelle ▾ › Quelle»). Ganze Zelle/Spalte in Lehrerschrift: Rechtsklick in Tabellen und in der Lektionsplanung, «Tabelle ▾ › ✎ Spalte» (`lsCell`, `lsStr`). Pfeil ↓/↑ in Tabellen (Notizen, Seite, Lektionsplanung) springt aus der untersten/obersten Zeile einer Zelle in die Zelle darunter/darüber, aus der letzten Zeile unter die Tabelle.
  - **Rückgängig in der Lektion** (23.10.2026): Knöpfe «↶ Rückgängig» / «↷» oben im Lektionsfenster und Strg+Z/Y (`H` in `openDetailBox`, Schnappschuss von Planung, Lernzielen, Kurzeintrag, Notizen; Tippen innerhalb 1 s wird zusammengefasst, Befehle über `HIST.brk` je ein Schritt). Zeilen der Lektionsplanung am Griff ⠿ (`.pgrip`, Zeiger-Ziehen, auch Tablet) verschieben. Rechtsklick auf die Lektionsplanung (`planMenu`, Tablet: lange drücken auf den Spaltentitel): Spalte nach links/rechts, Zeile nach oben/unten, Spalte/Zeile einfügen, Spalte löschen. Rechtsklick in eine Notiz-/Seitentabelle (`cellMenu`, `TAB_MENU`): dasselbe (`tableOp` tleft/tright/tup/tdown).
  - **Lektion gross geöffnet** (22.10.2026): Knopf «◫ Nebeneinander» (`zeitplan-dside`, ab 900 px) zeigt Lektionsplanung links und Notizen rechts, Trennlinie ziehbar (`zeitplan-dsidew`, 25–75 %). Bilder in den Notizen sind Blöcke `figure.nfig` (Grösse `w25/33/50/75`, Lage `p-l`/`p-r` = Text daneben, `p-c` = Mitte, ohne = allein links, `figcaption` = Bildunterschrift/Quelle); Klick aufs Bild öffnet das Fenster dazu (auch ↑/↓ verschieben, Entfernen). Bild ziehen = **verschieben, nicht kopieren** (27.10.2026, `mvAt`): zwischen Absätze; auf Text = Bild auf die Seite, zu der es gezogen wird (`p-l`/`p-r`), Text daneben. Gleich auf der Unterrichtsseite für `lk-fig` (`fl-l`/`fl-r` folgt der Seite). Alte Bilder werden beim ersten Klick umgewandelt. Klick neben ein Bild: Bild rückt auf die andere Seite (Text daneben), Cursor kommt genau auf die angeklickte Höhe wie in einem Textfeld (`besideFig`, leere Füllzeilen `data-fill`, ungenutzte werden mit `dropFill` wieder entfernt). Bildunterschriften erscheinen nicht in der Linkliste unter den Notizen (`notesLinkText`). Unterricht «◫ Planung»: Knopf «⇥ In die Seite» auf jedem Notiz-Bild fügt es an der letzten Cursorstelle der Seite ein (Quelle als kleine Zeile darunter); ist die Klassen-Kopie einer Lektion leer, zeigt die Planung die Lektion aus der Original-Reihe (`LK.planFrom`, «Bearbeiten» öffnet dann das Original).

**Erinnerungen aufs Handy** (22.10.2026, Glocke in der Kopfzeile, `openTodoDlg`): To-dos aus Termine (mit Datum) gehen in die Liste «Semper» in **Microsoft To Do**; die To-Do-App auf dem Handy meldet sich, auch wenn Semper zu ist. Nur über das eigene Microsoft-Konto (kein fremder Dienst): nach «Jetzt erlauben»/«Mit Microsoft verbinden» (Anmeldung mit `prompt=consent`) gehört `Tasks.ReadWrite` fest zu jeder Anmeldung (Merker `zp-todo` im Browser, `scopes()` in cloud.js, `window.ZTODO`). Grund (27.10.2026): beim privaten Konto gilt das Refresh-Token nur für die Rechte, die beim Einlösen verlangt wurden – ein separates Token nur für To Do klappte deshalb nicht. Keine Änderung in der App-Registrierung nötig. Einstellungen und Zuordnung Eintrag → Aufgabe in `plan/erinnerungen` (`on, at, vortag, lead, termine, listId, map`), damit alle Geräte gleich abgleichen (`tdSync`, nach Änderungen, alle 5 Min. und beim Zurückkehren). Ohne Uhrzeit: Erinnerung um `at` (Standard 07:00, wahlweise am Vortag); mit Uhrzeit: `lead` Minuten vorher; wahlweise auch Termine mit Uhrzeit. Abhaken in To Do hakt in Semper ab und umgekehrt; in Semper gelöscht/geändert = in To Do gelöscht/geändert; in To Do gelöscht = bleibt weg, bis der Eintrag in Semper geändert wird. Fenster: 7 Tage zurück bis gut 1 Jahr voraus; Erledigtes/Vergangenes wird nicht neu angelegt, vergangene Erinnerungen bleiben stumm. Ausschalten entfernt die offenen Einträge wieder. **Abendfrage** (27.10.2026, `abend`, Standard 20:00, im Glocken-Fenster ausschaltbar): eine einzige Aufgabe «Sind die To-dos gemacht?», die sich in To Do täglich wiederholt (`recurrence` daily, Schlüssel `abendfrage`, `ask`); Abhaken = für heute beantwortet, Semper folgt der von To Do angelegten nächsten Frage; nicht abgehakt = Semper schiebt sie beim nächsten Abgleich auf den nächsten Abend. Im Text ein Link `…#weiterschieben`. (Katharina wollte keine Aufgaben «Noch offen?» pro Tag.) **To-dos weiterschieben** in Semper: Knopf «⇢ To-dos weiterschieben» in der Termine-Leiste (nur wenn offene To-dos von heute/letzten 7 Tagen da sind; `openTnDlg`, `tnOpenOf`, `tnMove`) und Rechtsklick «Offene To-dos auf den nächsten Tag»; heutige → morgen, ältere → heute; belegtes Zielfeld = als «☐»-Punkt anhängen (ein einzelnes To-do dort wird selbst zum Punkt). Die Aufgaben in To Do bleiben dieselben (Zuordnung über den Titel, `loose`). **Verschieben:** wird in To Do das Fälligkeitsdatum geändert (z. B. «Fällig: Morgen»), nimmt Semper den Eintrag bzw. To-do-Punkt auf diesen Tag mit (gleicher Tagesteil; ist er belegt, als «☐»-Punkt angehängt; `tdMove`, `tdDueKey`); die Aufgabe bleibt dieselbe (Zuordnung über Titel und Datum). To-do-Notizen ohne Datum gehen nicht mit. **Mit dem echten Konto noch unbestätigt.**

**Startbild** (26.10.2026, `#zp-intro` direkt vor der Kopfzeile): beim Öffnen geht ein blaues Buch auf, darunter «Semper». Es ist zugleich der Ladebildschirm (27.10.2026, ohne Text «Lädt …»): bleibt offen stehen, bis die Daten da sind oder ein Hinweis (Anmelden, Fehler) kommt (`zpIntroDone` aus cloud.js), mindestens ca. 1,3 s; danach Klick schliesst. Bei «weniger Bewegung» ohne Bewegung (`zi-still`), im Beamer-Fenster (`#beamer`) ausgelassen (dort leerer Hintergrund beim Laden). Das App-Symbol bleibt unverändert.

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
- **Mit dem echten Konto prüfen:** Erinnerungen über Microsoft To Do (Zustimmung, Liste «Semper», Mitteilung auf dem Handy).
- **Beamer-Fenster** am Laptop mit zweitem Bildschirm ausprobieren. Auf dem iPad gibt es kein zweites Fenster. Lösung fürs Tablet: «📡 Beamer an anderem Gerät» – Rückmeldung aus dem Schulzimmer offen.
- **Ideen besprochen, nicht gebaut:**
  - «Mitlesen» (Laptop holt Tablet-Änderungen alle 2–3 s) und Tablet als Fernbedienung
  - Abschnittsweise speichern bzw. ausgeben, Abschnitte als Bausteine
- **Zurückgestellt:**
  - OneNote/Schulkonto
  - Doppelte Reihen zusammenführen
- **Vorschläge:**
  - Wiederherstellen aus einer Sicherung einmal zur Probe
  - `src/zeitplan.html` später in Teile aufteilen, damit weniger gelesen werden muss
