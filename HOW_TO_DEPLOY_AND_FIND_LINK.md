# How to Deploy and Find Your App Link 🔗

## 🚀 Step-by-Step Deployment

### Step 1: Install Fly CLI (If Not Installed)

**Open PowerShell as Administrator:**
```powershell
iwr https://fly.io/install.ps1 -useb | iex
```

**Close and reopen PowerShell**, then verify:
```bash
flyctl version
```

---

### Step 2: Sign Up / Login to Fly.io

```bash
flyctl auth signup
```

**OR if you already have an account:**
```bash
flyctl auth login
```

**Note:** Fly.io requires a credit card for verification (free tier, no charges)

---

### Step 3: Deploy Your Backend

```bash
cd server
flyctl launch
```

**When prompted:**
- **App name:** Type `lease-backend` (or press Enter for auto-generated name)
- **Region:** Choose closest to you:
  - `lax` (Los Angeles)
  - `iad` (Washington DC)
  - `sjc` (San Jose)
  - `dfw` (Dallas)
  - `ord` (Chicago)
- **Would you like to set up a Postgresql database?** → Type `n` and press Enter
- **Would you like to set up an Upstash Redis database?** → Type `n` and press Enter
- **Would you like to deploy now?** → Type `y` and press Enter

**Wait 3-5 minutes** for deployment to complete.

---

### Step 4: Find Your Backend URL 🔗

**After deployment completes, you'll see:**

```
App URL: https://lease-backend-xxxxx.fly.dev
```

**OR check status:**
```bash
flyctl status
```

**Look for:**
```
App URL: https://lease-backend-xxxxx.fly.dev
```

**This is your backend URL!** Save it!

---

### Step 5: Test Your Backend

**Test health endpoint:**
```bash
curl https://lease-backend-xxxxx.fly.dev/health
```

**Should return:**
```json
{"status":"ok","timestamp":"2024-..."}
```

**OR open in browser:**
```
https://lease-backend-xxxxx.fly.dev/health
```

---

### Step 6: View Logs

**See what's happening:**
```bash
flyctl logs
```

**Look for:**
- ✅ Server started
- ✅ Using system Chromium
- ✅ Liberation Sans available

---

## 📍 Where to Find Everything

### Backend URL
- **During deployment:** Shown at the end
- **After deployment:** Run `flyctl status`
- **In browser:** Go to `https://fly.io/apps` → Click your app

### Logs
```bash
flyctl logs
```

### App Dashboard
- Go to: https://fly.io/apps
- Click on `lease-backend`
- See: Status, Logs, Metrics, Settings

---

## 🎯 Your Backend API URL Format

**Base URL:**
```
https://lease-backend-xxxxx.fly.dev
```

**API Endpoints:**
```
https://lease-backend-xxxxx.fly.dev/api/leases
https://lease-backend-xxxxx.fly.dev/api/generate-pdf
https://lease-backend-xxxxx.fly.dev/health
```

---

## 🔧 Useful Commands

```bash
# Check status
flyctl status

# View logs (live)
flyctl logs

# View logs (follow)
flyctl logs -a lease-backend

# Restart app
flyctl apps restart lease-backend

# Open app in browser
flyctl open

# SSH into VM (for debugging)
flyctl ssh console
```

---

## 📱 Deploy Frontend (After Backend Works)

### Option 1: Netlify (Easiest)

1. **Build frontend:**
   ```bash
   cd C:\Users\makan\OneDrive\Desktop\newSystem
   npm run build
   ```

2. **Deploy:**
   - Go to https://app.netlify.com
   - Drag and drop the `build` folder
   - Get URL: `https://your-app.netlify.app`

3. **Set environment variable:**
   - Netlify → Site settings → Environment variables
   - Add: `REACT_APP_API_URL` = `https://lease-backend-xxxxx.fly.dev/api`
   - Redeploy

### Option 2: Fly.io Static (Alternative)

```bash
# From project root
flyctl launch --name lease-frontend
# Choose: Static site
# Set build command: npm install && npm run build
# Set publish directory: build
```

---

## ✅ Quick Checklist

- [ ] Fly CLI installed
- [ ] Logged in to Fly.io
- [ ] Backend deployed (`flyctl launch`)
- [ ] Got backend URL (`flyctl status`)
- [ ] Tested health endpoint
- [ ] Checked logs (`flyctl logs`)
- [ ] Generated PDF from frontend
- [ ] Verified PDF looks correct

---

## 🎉 After Deployment

**Your backend will be at:**
```
https://lease-backend-xxxxx.fly.dev
```

**Your API endpoints:**
```
https://lease-backend-xxxxx.fly.dev/api/...
```

**Test PDF generation:**
1. Use your frontend (local or deployed)
2. Set `REACT_APP_API_URL` to your Fly.io backend URL
3. Generate PDF
4. Check `flyctl logs` for verification messages

---

## 🚨 Troubleshooting

**"Command not found"**
- Close and reopen PowerShell
- Or restart computer

**"Not authenticated"**
- Run: `flyctl auth login`

**"App not found"**
- Check: `flyctl apps list`
- Make sure you're in the right directory

**"Deployment failed"**
- Check logs: `flyctl logs`
- Try: `flyctl deploy --verbose`

---

**Ready to deploy? Follow Step 3 above!** 🚀


