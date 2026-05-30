# Burp Payloader

Burp Payloader is a lightweight, static reference tool for authorized web application security testing. It helps build Burp Suite Repeater checks and Intruder payload sets from a local catalog covering SQL injection, XSS, SSRF, command injection, path traversal, XXE, SSTI, NoSQL, LDAP, open redirect, CRLF, and boundary fuzzing.

The app can optionally load a small browser-side assistant through WebLLM and WebGPU. That assistant runs locally in the browser; request notes are not sent to a server. The catalog, search, encoding, copy, and download features work without loading it.

## Features

- Filter payloads by class, technique, context, or search text.
- Copy individual Repeater payloads with one click.
- Build Intruder lists with optional URL, double URL, base64, or HTML entity encoding.
- Download generated payload sets as text files.
- Optionally generate or explain payload variants locally when WebGPU is available.

## Running Locally

Serve the files over HTTP from the project root:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

Opening `index.html` directly may block browser modules, so an HTTP server is recommended.

## GitHub Pages

The project is ready for GitHub Pages at:

https://moonpiesheldon1337.github.io/burp-payloader/

The included workflow publishes the static files from `main` whenever the branch changes.

## Responsible Use

Payloads are standard test strings intended for systems you own or have explicit permission to assess. Do not use this tool against third-party systems without authorization.
