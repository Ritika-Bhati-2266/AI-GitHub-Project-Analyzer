# AI GitHub Project Analyzer 

Analyze any public GitHub repository instantly — no API key needed!

## Features
- Live GitHub data: stars, forks, issues, languages, contributors
- 5 analysis modes: Overview, README, Code Structure, Improvements, Tech Stack
- Keyword-based Q&A about any repo
- Works 100% offline (after page load) — no external AI API calls

## How to Use
1. Open `index.html` in any modern browser
2. Paste a public GitHub repo URL
3. Click **Analyze**
4. Switch between analysis tabs
5. Ask questions in the text box

## Example Repos to Try
- https://github.com/facebook/react
- https://github.com/torvalds/linux
- https://github.com/microsoft/vscode
- https://github.com/tensorflow/tensorflow

## Files
- `index.html` — Main UI
- `style.css`  — Styling
- `app.js`     — Logic (GitHub API + local analysis)
- `README.md`  — This file

## Notes
- Only works with **public** repositories
- Uses the free GitHub REST API (no auth required, 60 req/hr limit)
- No server needed — open index.html directly in browser
