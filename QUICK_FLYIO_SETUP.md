# Quick Fly.io Setup Guide

## Step 1: Install Fly CLI

**Option A: PowerShell (Recommended)**
1. Open PowerShell **as Administrator**
2. Run:
   ```powershell
   iwr https://fly.io/install.ps1 -useb | iex
   ```
3. **Close and reopen** PowerShell

**Option B: Use the script**
1. Right-click `install-fly.ps1` → "Run with PowerShell"
2. **Close and reopen** PowerShell

**Verify installation:**
```bash
flyctl version
```

---

## Step 2: Sign Up / Login

```bash
flyctl auth signup
```

Or if you have an account:
```bash
flyctl auth login
```

**Note:** Fly.io requires a credit card for verification, but free tier is truly free (no charges).

---

## Step 3: Deploy Backend

```bash
cd server
flyctl launch
```

**When prompted:**
- **App name:** `lease-backend` (or press Enter for auto-generated)
- **Region:** Choose closest (e.g., `lax`, `iad`, `sjc`)
- **Postgres?** → **No**
- **Redis?** → **No**
- **Deploy now?** → **Yes**

**Wait 3-5 minutes** for deployment.

---

## Step 4: Get Your Backend URL

After deployment, you'll see:
```
App URL: https://lease-backend.fly.dev
```

**Save this URL!** You'll need it for the frontend.

---

## Step 5: Test Backend

```bash
curl https://lease-backend.fly.dev/health
```

Should return: `{"status":"ok","timestamp":"..."}`

---

## Step 6: Deploy Frontend to Netlify

1. **Build frontend:**
   ```bash
   cd C:\Users\makan\OneDrive\Desktop\newSystem
   npm run build
   ```

2. **Deploy to Netlify:**
   - Go to https://app.netlify.com
   - Sign up/login (free)
   - Drag and drop the `build` folder
   - Done! You'll get a URL

3. **Set environment variable:**
   - Netlify dashboard → Site settings → Environment variables
   - Add: `REACT_APP_API_URL` = `https://lease-backend.fly.dev/api`
   - Redeploy

---

## Step 7: Test PDF Generation

1. Go to your Netlify frontend URL
2. Generate a PDF
3. Check Fly.io logs:
   ```bash
   flyctl logs
   ```

**Look for:**
```
✅ Using system Chromium: /usr/bin/chromium
🔍 Liberation Sans available: true
```

---

## 🎯 Why Fly.io Will Work

- ✅ **Real Linux VM** (not just containers)
- ✅ **Full Docker support** → Your fonts are installed
- ✅ **Chromium works perfectly** → Same as local Docker
- ✅ **Consistent rendering** → PDF will match localhost!

---

## 📝 Useful Commands

```bash
# View logs
flyctl logs

# Check status
flyctl status

# Restart app
flyctl apps restart lease-backend

# SSH into VM (for debugging)
flyctl ssh console
```

---

## 🚨 Troubleshooting

**"Command not found" after install:**
- Close and reopen PowerShell
- Or restart your computer

**"Not enough memory":**
- Edit `server/fly.toml`:
  ```toml
  [[vm]]
    memory_mb = 1024
  ```
- Redeploy: `flyctl deploy`

**"Deployment failed":**
- Check logs: `flyctl logs`
- Make sure Dockerfile is correct
- Try: `flyctl deploy --verbose`

---

## ✅ Expected Result

Your PDF should look **exactly like localhost** - beautiful spacing, correct fonts! 🎨


