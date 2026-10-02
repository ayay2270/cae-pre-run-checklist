@echo off
cd /d "%~dp0"
echo CAE Pre-Run Checklist
echo Open http://localhost:3210 in your browser.
echo Keep this window open. Ctrl+C stops the app.
node server.cjs
pause
