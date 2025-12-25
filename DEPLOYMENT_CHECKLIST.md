# ✅ Render.com Deployment Checklist

## Before You Start
- [ ] You have a GitHub account
- [ ] You have a Render.com account (sign up: https://render.com)
- [ ] Your code is committed to GitHub

---

## Quick Deployment Steps

### 1️⃣ Push to GitHub
```bash
git add .
git commit -m "Ready for Render deployment"
git push
```

### 2️⃣ Deploy Backend (5-10 min)
1. Go to https://dashboard.render.com/
2. Click "New +" → "Web Service"
3. Connect GitHub repo
4. Settings:
   - Name: `lease-backend`
   - Root Directory: `server`
   - Build: `npm install`
   - Start: `npm start`
   - Plan: **Free**
5. Add env var: `NODE_ENV` = `production`
6. Click "Create Web Service"
7. **COPY THE URL** (e.g., `https://lease-backend-abc123.onrender.com`)

### 3️⃣ Update Frontend Config
1. Open `public/runtime-config.js`
2. Replace `https://lease-backend.onrender.com/api` with **YOUR backend URL**/api
3. Save and push:
   ```bash
   git add public/runtime-config.js
   git commit -m "Update production backend URL"
   git push
   ```

### 4️⃣ Deploy Frontend (3-5 min)
1. Go to Render dashboard
2. Click "New +" → "Static Site"
3. Connect same GitHub repo
4. Settings:
   - Name: `lease-frontend`
   - Build: `npm install && npm run build`
   - Publish: `build`
5. Click "Create Static Site"

### 5️⃣ Test Everything
- [ ] Visit backend health: `https://YOUR-BACKEND-URL/api/health`
- [ ] Visit frontend: `https://YOUR-FRONTEND-URL.onrender.com`
- [ ] Login with `yehuda` / `yehuda`
- [ ] Test PDF generation

---

## 🎉 You're Done!

**Important Notes:**
- First request takes ~30 seconds (service wakes up)
- Services sleep after 15 minutes of inactivity
- Totally **FREE** (750 hours/month)

---

## 🐛 If Something Breaks

1. Check Render logs (in dashboard)
2. Check browser console (F12)
3. Verify backend URL in `public/runtime-config.js`
4. Check `/api/health` endpoint

**Need help? Check RENDER_DEPLOYMENT.md for detailed troubleshooting!**


















