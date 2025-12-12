# Restart Frontend Dev Server Script
Write-Host "Stopping any running dev servers..." -ForegroundColor Yellow

# Kill any node processes running from this directory
Get-Process node -ErrorAction SilentlyContinue | Where-Object {
    $_.Path -and $_.Path.Contains("frontend")
} | Stop-Process -Force

Start-Sleep -Seconds 2

Write-Host "Starting dev server..." -ForegroundColor Green
Set-Location $PSScriptRoot
npm run dev
