# Install Fly.io CLI for Windows
# Run this in PowerShell as Administrator

Write-Host "Installing Fly.io CLI..." -ForegroundColor Green

# Download and install Fly CLI
Invoke-WebRequest https://fly.io/install.ps1 -UseBasicParsing | Invoke-Expression

Write-Host ""
Write-Host "Installation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Close and reopen PowerShell/Terminal"
Write-Host "2. Run: flyctl version (to verify)"
Write-Host "3. Run: flyctl auth signup (to create account)"
Write-Host ""


