# Frontend Link - How to Access and Test 🎨

## 🎯 Quick Answer

**You have 2 options:**

### Option 1: Test Locally (Fastest) ✅
- **Frontend URL:** `http://localhost:3000`
- **Backend:** Your Fly.io backend URL
- **Setup:** Just run `npm start` locally

### Option 2: Deploy Frontend (Production) ✅
- **Deploy to:** Netlify (easiest) or Fly.io
- **Get URL:** After deployment (e.g., `https://your-app.netlify.app`)

---

## 🚀 Option 1: Test Locally with Fly.io Backend

### Step 1: Get Your Fly.io Backend URL

```bash
cd server
flyctl status
```

**Look for:** `App URL: https://lease-backend-xxxxx.fly.dev`

**Save this URL!** Example: `https://lease-backend-abc123.fly.dev`

---

### Step 2: Set Environment Variable Locally

**Create `.env` file in project root** (`C:\Users\makan\OneDrive\Desktop\newSystem\.env`):

```env
REACT_APP_API_URL=https://lease-backend-xxxxx.fly.dev/api
```

**Replace `xxxxx` with your actual Fly.io app name!**

---

### Step 3: Start Frontend Locally

```bash
cd C:\Users\makan\OneDrive\Desktop\newSystem
npm start
```

**Frontend will open at:** `http://localhost:3000`

---

### Step 4: Test PDF Generation

1. Open `http://localhost:3000` in browser
2. Fill out the form
3. Generate PDF
4. **Check Fly.io logs:**
   ```bash
   cd server
   flyctl logs
   ```

**Look for:**
```
✅ Using system Chromium: /usr/bin/chromium
🔍 Liberation Sans available: true
```

---

## 🌐 Option 2: Deploy Frontend to Netlify (Production)

### Step 1: Build Frontend

```bash
cd C:\Users\makan\OneDrive\Desktop\newSystem
npm run build
```

**This creates a `build` folder**

---

### Step 2: Deploy to Netlify

**Method A: Drag and Drop (Easiest)**

1. Go to: https://app.netlify.com
2. Sign up/Login (free)
3. Click **"Add new site"** → **"Deploy manually"**
4. **Drag and drop** the `build` folder
5. **Wait 1-2 minutes**
6. **Get your URL:** `https://random-name-12345.netlify.app`

**Method B: Via Netlify CLI**

```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod --dir=build
```

---

### Step 3: Set Environment Variable in Netlify

1. Go to Netlify dashboard
2. Click your site
3. Go to **Site settings** → **Environment variables**
4. Click **"Add variable"**
5. Add:
   - **Key:** `REACT_APP_API_URL`
   - **Value:** `https://lease-backend-xxxxx.fly.dev/api`
   - (Replace `xxxxx` with your Fly.io app name)
6. Click **"Save"**
7. Go to **Deploys** tab → **Trigger deploy** → **Deploy site**

---

### Step 4: Get Your Frontend URL

**After deployment:**
- Netlify will show: `https://your-app-name.netlify.app`
- **This is your frontend link!**

**Or check:**
- Netlify dashboard → Your site → **"Site overview"**
- Look for: **"Production URL"**

---

## 📍 Where to Find Frontend Links

### If Testing Locally:
- **URL:** `http://localhost:3000`
- **Backend:** Your Fly.io URL

### If Deployed to Netlify:
- **URL:** `https://your-app-name.netlify.app`
- **Find it:** Netlify dashboard → Your site → Site overview

### If Deployed to Render:
- **URL:** `https://lease-frontend.onrender.com`
- **Find it:** Render dashboard → Frontend service → Settings

### If Deployed to Railway:
- **URL:** `https://your-app.railway.app`
- **Find it:** Railway dashboard → Frontend service

---

## ✅ Quick Test Checklist

- [ ] Backend deployed on Fly.io ✅
- [ ] Got backend URL (`flyctl status`)
- [ ] Frontend running locally OR deployed
- [ ] Set `REACT_APP_API_URL` environment variable
- [ ] Test PDF generation
- [ ] Check Fly.io logs for font verification

---

## 🎯 Recommended Setup Right Now

**For Testing:**
1. ✅ Use **localhost:3000** (fastest)
2. ✅ Set `.env` file with Fly.io backend URL
3. ✅ Run `npm start`

**For Production:**
1. ✅ Deploy frontend to **Netlify** (easiest)
2. ✅ Set environment variable in Netlify
3. ✅ Get your public URL

---

## 🔗 Your Links Summary

**Backend (Fly.io):**
```
https://lease-backend-xxxxx.fly.dev
```

**Frontend (Local - Testing):**
```
http://localhost:3000
```

**Frontend (Netlify - Production):**
```
https://your-app-name.netlify.app
```

---

## 🚨 Troubleshooting

**"Cannot connect to backend"**
- Check backend URL is correct
- Check `.env` file has correct URL
- Restart frontend: `npm start`

**"PDF generation fails"**
- Check Fly.io logs: `flyctl logs`
- Verify backend is running: `flyctl status`
- Test backend directly: `curl https://lease-backend-xxxxx.fly.dev/health`

**"Environment variable not working"**
- Make sure `.env` file is in project root
- Restart frontend after changing `.env`
- For Netlify: Redeploy after setting environment variable

---

**Ready to test? Use Option 1 (localhost) for fastest testing!** 🚀


