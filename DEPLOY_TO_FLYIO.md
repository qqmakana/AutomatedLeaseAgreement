# Deploy to Fly.io - Step by Step (FREE) ✅

## Why Fly.io?
- ✅ **Best for Puppeteer PDFs** - Full Docker support
- ✅ **Real Linux VM** - Not just containers
- ✅ **Consistent fonts** - Liberation Sans works perfectly
- ✅ **Free tier** - 3 shared VMs, 512MB RAM each
- ✅ **Better than Render** - More reliable for PDF generation

---

## 📋 Step-by-Step Deployment

### Step 1: Install Fly CLI

**Windows (PowerShell as Administrator):**
```powershell
iwr https://fly.io/install.ps1 -useb | iex
```

**After installation, close and reopen PowerShell/Terminal**

Verify installation:
```bash
flyctl version
```

---

### Step 2: Sign Up for Fly.io

```bash
flyctl auth signup
```

Or if you have an account:
```bash
flyctl auth login
```

**Note:** Fly.io requires a credit card for verification, but free tier is truly free.

---

### Step 3: Deploy Backend

```bash
cd C:\Users\makan\OneDrive\Desktop\newSystem\server
flyctl launch
```

**When prompted:**
- **App name:** Press Enter to use default or type `lease-backend`
- **Region:** Choose closest to you (e.g., `lax` for Los Angeles)
- **Would you like to set up a Postgresql database?** → **No**
- **Would you like to set up an Upstash Redis database?** → **No**
- **Would you like to deploy now?** → **Yes**

---

### Step 4: Wait for Deployment

Fly.io will:
1. ✅ Build your Docker image (with fonts)
2. ✅ Deploy to a real Linux VM
3. ✅ Give you a URL: `https://lease-backend.fly.dev`

**Deployment takes 3-5 minutes**

---

### Step 5: Check Backend is Running

```bash
flyctl status
```

**Test the backend:**
```bash
curl https://YOUR-APP-NAME.fly.dev/health
```

You should see: `{"status":"ok","timestamp":"..."}`

---

### Step 6: Deploy Frontend to Netlify (Free & Easy)

Frontend doesn't need Puppeteer, so Netlify is perfect:

1. **Build your frontend:**
   ```bash
   cd C:\Users\makan\OneDrive\Desktop\newSystem
   npm run build
   ```

2. **Deploy to Netlify:**
   - Go to https://app.netlify.com
   - Drag and drop the `build` folder
   - Done! You'll get a URL like `https://your-app.netlify.app`

3. **Update environment variable:**
   - In Netlify: Site settings → Environment variables
   - Add: `REACT_APP_API_URL` = `https://YOUR-APP-NAME.fly.dev/api`
   - Redeploy

---

## 🔍 Verify PDF Generation Works

1. Go to your Netlify frontend URL
2. Generate a PDF
3. Check logs:
   ```bash
   flyctl logs
   ```

**Look for:**
```
✅ Using system Chromium: /usr/bin/chromium
🔍 Liberation Sans available: true
🔍 Field metrics: { "height": "12px", ... }
```

---

## 📝 Fly.io Commands Cheat Sheet

```bash
# View logs (live)
flyctl logs

# Check status
flyctl status

# SSH into VM
flyctl ssh console

# Restart app
flyctl apps restart

# Check VM metrics
flyctl status --all

# Destroy app (if needed)
flyctl apps destroy lease-backend
```

---

## 💰 Free Tier Limits

- ✅ **3 shared VMs** (512MB RAM each)
- ✅ **160GB outbound data/month**
- ✅ **Unlimited inbound**
- ✅ **No time limit** (unlike Render's sleep mode)

**For your PDF app:** This is more than enough!

---

## 🚨 If Deployment Fails

### Issue: "Not enough memory"
**Fix:** Edit `server/fly.toml`:
```toml
[[vm]]
  memory_mb = 1024  # Increase to 1GB
```

Then redeploy:
```bash
flyctl deploy
```

### Issue: "Chromium not found"
**Fix:** Already handled in Dockerfile! Fly.io will use it.

---

## 🎯 Alternative: Railway (If Fly.io Doesn't Work)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy backend
cd server
railway init
railway up

# Get backend URL
railway domain
```

---

## ✅ Why This Will Work

1. **Fly.io uses your Dockerfile** → Fonts installed
2. **Real Linux VM** → Chromium works perfectly
3. **Code auto-detects Chromium** → Uses system Chrome with fonts
4. **Same environment as local Docker** → Consistent rendering

**Your PDF will look beautiful, just like localhost! 🎨**

---

## 📞 Next Steps

1. **Install Fly CLI** (Step 1)
2. **Sign up** (Step 2)
3. **Deploy backend** (Step 3)
4. **Test PDF** (Step 5)
5. **Deploy frontend to Netlify** (Step 6)

**Total time: ~15 minutes**

Let me know if you need help with any step!


