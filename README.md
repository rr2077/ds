# reros Die Staemme Tool Collection

Modulare Userscript-Sammlung fuer Die Staemme. Die Module werden ueber `main.user.js` geladen und anhand von `config/manifest.prod.json` von `ds.rero.space` nachgeladen.

## Installation

Direkter Installations-Link fuer Tampermonkey / Violentmonkey:

```text
https://ds.rero.space/main.user.js
```

Nach der Installation erscheint im Spielmenue der Eintrag **DS-Tools**.

## Self-Hosting

Die produktive Version ist auf `https://ds.rero.space` ausgerichtet. Der Server muss die Ordner `assets`, `config`, `maps`, `menu`, `modules` und `ui` sowie `main.user.js` statisch ausliefern.

Empfohlen fuer den Webserver:

- HTTPS aktivieren.
- JavaScript-, JSON-, CSS- und HTML-Dateien mit passenden MIME-Types ausliefern.
- CORS fuer die statischen Dateien erlauben, zum Beispiel `Access-Control-Allow-Origin: *`.

## Development Setup

1. Projektordner lokal bearbeiten.
2. Lokalen HTTP-Server starten, zum Beispiel:

```bash
python3 -m http.server 8123
```

3. Im Tampermonkey-Menue das Environment auf **dev** umstellen.

Danach werden Manifest und Module von `http://localhost:8123` geladen.

## Module

Die enthaltenen Module lassen sich ingame ueber die DS-Tools-Settings aktivieren oder deaktivieren. Die Einstellungen sind persistent und gelten accountweit.

## Benachrichtigungen

Discord-Webhooks werden weiterhin unterstuetzt, zum Beispiel fuer Inc-Reminder und BotGuard-Hinweise. Die Konfiguration erfolgt in den DS-Tools-Settings.
