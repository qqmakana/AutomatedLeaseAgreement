# Render Deployment Script
Write-Host "`n🚀 RENDER DEPLOYMENT SCRIPT`n" -ForegroundColor Cyan

# Step 1: Check if code is committed
Write-Host "📋 Step 1: Checking Git status..." -ForegroundColor Yellow
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "⚠️  You have uncommitted changes!" -ForegroundColor Red
    Write-Host "   Files:" -ForegroundColor Yellow
    $gitStatus | ForEach-Object { Write-Host "   - $_" -ForegroundColor Gray }
    Write-Host "`n   Do you want to commit and push? (y/n)" -ForegroundColor Yellow
    $response = Read-Host
    if ($response -eq 'y' -or $response -eq 'Y') {
        git add .
        git commit -m "Add render.yaml for deployment"
        Write-Host "✅ Committed changes" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Skipping commit. Make sure to push manually later." -ForegroundColor Yellow
    }
}

# Step 2: Push to GitHub
Write-Host "`n📤 Step 2: Pushing to GitHub..." -ForegroundColor Yellow
git push origin main
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Code pushed to GitHub!" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to push. Please push manually." -ForegroundColor Red
    exit 1
}

# Step 3: Instructions
Write-Host "`n📝 Step 3: Next Steps" -ForegroundColor Yellow
Write-Host "`n1. Go to: https://dashboard.render.com" -ForegroundColor Cyan
Write-Host "2. Click 'New +' → 'Blueprint'" -ForegroundColor Cyan
Write-Host "3. Connect your GitHub repo: AutomatedLeaseAgreement" -ForegroundColor Cyan
Write-Host "4. Render will detect render.yaml and create both services!" -ForegroundColor Cyan
Write-Host "`n   OR use Dashboard method:" -ForegroundColor Yellow
Write-Host "   - Deploy backend: New + → Web Service → Connect repo → Use settings from render.yaml" -ForegroundColor Gray
Write-Host "   - Deploy frontend: New + → Static Site → Connect repo → Use settings from render.yaml" -ForegroundColor Gray

Write-Host "`n✅ Deployment script complete!`n" -ForegroundColor Green


