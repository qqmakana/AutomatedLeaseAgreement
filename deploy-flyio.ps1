# Deploy to Fly.io - PowerShell Script
# Run this from the project root directory

Write-Host "🚀 Deploying to Fly.io..." -ForegroundColor Green
Write-Host ""

# Check if flyctl is installed
try {
    $flyVersion = flyctl version 2>&1
    Write-Host "✅ Fly CLI found: $flyVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Fly CLI not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Fly CLI first:" -ForegroundColor Yellow
    Write-Host "  iwr https://fly.io/install.ps1 -useb | iex" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Then close and reopen PowerShell." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Step 1: Checking authentication..." -ForegroundColor Yellow
flyctl auth whoami

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Not logged in. Please run:" -ForegroundColor Red
    Write-Host "  flyctl auth login" -ForegroundColor Cyan
    Write-Host "  OR" -ForegroundColor Cyan
    Write-Host "  flyctl auth signup" -ForegroundColor Cyan
    exit 1
}

Write-Host ""
Write-Host "Step 2: Deploying backend..." -ForegroundColor Yellow
Write-Host ""

# Navigate to server directory
Set-Location server

# Deploy
flyctl deploy

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Get your backend URL:" -ForegroundColor Cyan
    Write-Host "   flyctl status" -ForegroundColor White
    Write-Host ""
    Write-Host "2. Test backend:" -ForegroundColor Cyan
    Write-Host "   curl https://YOUR-APP-NAME.fly.dev/health" -ForegroundColor White
    Write-Host ""
    Write-Host "3. View logs:" -ForegroundColor Cyan
    Write-Host "   flyctl logs" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Deployment failed. Check the errors above." -ForegroundColor Red
}

# Go back to root
Set-Location ..


