# Start Backend
Write-Host "Starting JobScout AI Backend on port 8000..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList '-NoExit', '-Command', 'cd "d:\sylani hakathon\jobscout-ai\backend"; uvicorn main:app --reload --port 8000'

Start-Sleep -Seconds 2

# Start Frontend
Write-Host "Starting JobScout AI Frontend on port 3030..." -ForegroundColor Magenta
Start-Process powershell -ArgumentList '-NoExit', '-Command', 'cd "d:\sylani hakathon\jobscout-ai\frontend"; npm run dev'

Write-Host ""
Write-Host "=======================================" -ForegroundColor Green
Write-Host "  JobScout AI is starting up!" -ForegroundColor Green
Write-Host "  Frontend: http://localhost:3030" -ForegroundColor Yellow
Write-Host "  Backend:  http://localhost:8000" -ForegroundColor Yellow
Write-Host "=======================================" -ForegroundColor Green
