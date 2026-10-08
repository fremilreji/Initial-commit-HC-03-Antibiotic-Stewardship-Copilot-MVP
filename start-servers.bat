@echo off
set "PATH=D:\node;%PATH%"
echo ========================================================
echo   HC-03: Antibiotic Stewardship Copilot - Launcher
echo ========================================================
echo.
echo Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "HC-03 FastAPI Backend" cmd /k "cd /d %~dp0backend && py -m uvicorn main:app --reload --host 127.0.0.1 --port 8000"

timeout /t 2 /nobreak >nul

echo Starting Next.js Frontend on http://localhost:3000 ...
start "HC-03 Next.js Dashboard" cmd /k "cd /d %~dp0 && npm.cmd run dev"

echo.
echo ========================================================
echo   Both servers launched successfully!
echo   - Frontend: http://localhost:3000
echo   - Backend:  http://127.0.0.1:8000/docs
echo ========================================================
