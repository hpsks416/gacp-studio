@echo off
setlocal
cd /d "%~dp0"

set "PY="
where python >nul 2>nul && set "PY=python"
if not defined PY (
  where py >nul 2>nul && set "PY=py -3"
)
if not defined PY (
  echo [gacp-studio] Python 3.9+ not found. Install Python and retry.
  pause
  exit /b 1
)

echo [gacp-studio] starting http://127.0.0.1:8787/
%PY% server.py