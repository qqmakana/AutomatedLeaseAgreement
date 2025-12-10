# Deploy to Fly.io - Quick Start 🚀

## ✅ Pre-Deployment Checklist

- [x] Dockerfile has fonts installed ✅
- [x] PDF generator auto-detects Chromium ✅
- [x] CSS uses Liberation Sans explicitly ✅
- [x] Fly.io config ready ✅

---

## 🚀 Deploy Now (Choose One Method)

### Method 1: Use the Script (Easiest)

```powershell
# From project root
.\deploy-flyio.ps1
```

### Method 2: Manual Commands

```powershell
# 1. Check Fly CLI is installed
flyctl version

# 2. Login/Signup (if not already)
flyctl auth login
# OR
flyctl auth signup

# 3. Deploy backend
cd server
flyctl launch
```

**When prompted:**
- **App name:** `lease-backend` (or press Enter)
- **Region:** Choose closest (e.g., `lax`, `iad`, `sjc`)
- **Postgres?** → **No**
- **Redis?** → **No**
- **Deploy now?** → **Yes**

---

## 📋 What Happens During Deployment

1. ✅ Fly.io builds your Docker image
2. ✅ Installs fonts (Liberation Sans, DejaVu, etc.)
3. ✅ Installs Chromium
4. ✅ Deploys to a real Linux VM
5. ✅ Gives you a URL: `https://lease-backend.fly.dev`

**Deployment takes 3-5 minutes**

---

## 🔍 Verify Deployment

### 1. Check Status
```bash
flyctl status
```

### 2. Test Backend
```bash
curl https://lease-backend.fly.dev/health
```

Should return: `{"status":"ok","timestamp":"..."}`

### 3. View Logs
```bash
flyctl logs
```

---

## 🎯 Test PDF Generation

1. **Get your backend URL:**
   ```bash
   flyctl status
   ```
   Look for: `App URL: https://lease-backend.fly.dev`

2. **Update frontend** (if deploying separately):
   - Set `REACT_APP_API_URL` = `https://lease-backend.fly.dev/api`

3. **Generate a PDF** from your frontend

4. **Check logs:**
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

## ✅ Why PDF Won't Break

1. **Same Dockerfile** → Fonts installed exactly like local
2. **Real Linux VM** → Chromium works perfectly
3. **Auto-detects Chromium** → Uses system Chrome with fonts
4. **Explicit fonts in CSS** → Liberation Sans forced with `!important`
5. **More memory** → 1024MB (enough for Puppeteer)

**Your PDF will match localhost - beautiful spacing! 🎨**

---

## 🚨 If Something Goes Wrong

### "Command not found"
- Close and reopen PowerShell
- Or restart computer

### "Not enough memory"
- Already set to 1024MB in `server/fly.toml`
- If still fails, increase to 2048MB

### "Deployment failed"
- Check logs: `flyctl logs`
- Make sure Dockerfile is correct
- Try: `flyctl deploy --verbose`

### "Chromium not found"
- Check logs for font installation
- Verify Dockerfile is being used
- Check: `flyctl ssh console` then `which chromium`

---

## 📝 Next Steps After Deployment

1. ✅ Backend deployed → Get URL
2. ✅ Test PDF generation
3. ✅ Check logs for font verification
4. ✅ Deploy frontend (Netlify or Fly.io static)
5. ✅ Set `REACT_APP_API_URL` environment variable

---

## 🎉 Expected Result

**PDF should look exactly like localhost:**
- ✅ Tight spacing (12px between fields)
- ✅ No huge gaps
- ✅ Liberation Sans font
- ✅ Beautiful layout

**Ready to deploy? Run the script or follow manual steps above!**
