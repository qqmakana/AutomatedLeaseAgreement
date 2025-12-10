# Render CLI Deployment Script
Write-Host "`n🚀 RENDER CLI DEPLOYMENT`n" -ForegroundColor Cyan

# Check if render CLI is installed
Write-Host "📋 Checking Render CLI..." -ForegroundColor Yellow
try {
    $renderVersion = render --version 2>&1
    Write-Host "✅ Render CLI found" -ForegroundColor Green
} catch {
    Write-Host "❌ Render CLI not found. Installing..." -ForegroundColor Red
    npm install -g render-cli
    Write-Host "✅ Render CLI installed" -ForegroundColor Green
}

# Step 1: Authenticate
Write-Host "`n🔐 Step 1: Authenticate with Render" -ForegroundColor Yellow
Write-Host "   This will open your browser to login..." -ForegroundColor Gray
Write-Host "   Run: render login" -ForegroundColor Cyan
Write-Host "`n   Press Enter after you've logged in..." -ForegroundColor Yellow
Read-Host

# Step 2: Push to GitHub
Write-Host "`n📤 Step 2: Pushing code to GitHub..." -ForegroundColor Yellow
git add render.yaml
git commit -m "Add render.yaml for deployment" 2>$null
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Code pushed!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Push failed or already up to date" -ForegroundColor Yellow
}

# Step 3: Create services via CLI
Write-Host "`n🚀 Step 3: Creating Render services..." -ForegroundColor Yellow
Write-Host "`n   Option A: Use Blueprint (Easiest)" -ForegroundColor Cyan
Write-Host "   1. Go to: https://dashboard.render.com" -ForegroundColor Gray
Write-Host "   2. Click 'New +' → 'Blueprint'" -ForegroundColor Gray
Write-Host "   3. Select repo: AutomatedLeaseAgreement" -ForegroundColor Gray
Write-Host "   4. Render will auto-create both services from render.yaml!" -ForegroundColor Gray

Write-Host "`n   Option B: Manual CLI (Advanced)" -ForegroundColor Cyan
Write-Host "   Backend:" -ForegroundColor Yellow
Write-Host "   render services:create web --name lease-backend --repo qqmakana/AutomatedLeaseAgreement --root-dir server --build-command 'npm install' --start-command 'node server.js' --env PORT=5000" -ForegroundColor Gray
Write-Host "`n   Frontend:" -ForegroundColor Yellow
Write-Host "   render services:create static --name lease-frontend --repo qqmakana/AutomatedLeaseAgreement --build-command 'npm install && npm run build' --publish-path build --env REACT_APP_API_URL=https://lease-backend.onrender.com/api" -ForegroundColor Gray

Write-Host "`n✅ Script complete! Choose Option A for easiest deployment.`n" -ForegroundColor Green


