@echo off
set "PATH=D:\node;%PATH%"
echo ========================================================
echo   attend.to: Antibiotic Stewardship Copilot - Launcher
echo ========================================================
echo.
echo Starting FastAPI Backend on port 8000 (0.0.0.0) ...
start "HC-03 FastAPI Backend" cmd /k "cd /d %~dp0backend && py -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

timeout /t 2 /nobreak >nul

echo Starting Next.js Frontend on port 3000 (0.0.0.0) ...
start "HC-03 Next.js Dashboard" cmd /k "cd /d %~dp0 && npm.cmd run dev"

echo.
echo ========================================================
echo   Both servers launched successfully!
echo   - Local PC:   http://localhost:3000
echo   - Teammates:  http://<Your-IP>:3000
echo   - Backend:    http://localhost:8000/docs
echo ========================================================
