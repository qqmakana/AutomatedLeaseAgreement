# 🚀 Deploy to Render.com - Step by Step Guide

## ✅ Prerequisites
- GitHub account
- Render.com account (sign up at https://render.com - it's FREE!)
- Your code pushed to GitHub

---

## 📦 Step 1: Push Your Code to GitHub

If you haven't already:

```bash
git init
git add .
git commit -m "Ready for Render deployment"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

---

## 🔧 Step 2: Deploy Backend to Render

1. **Go to Render Dashboard**: https://dashboard.render.com/

2. **Click "New +"** → Select **"Web Service"**

3. **Connect Your Repository**:
   - Select your GitHub repository
   - Click "Connect"

4. **Configure Backend Service**:
   ```
   Name: lease-backend
   Region: Oregon (US West)
   Branch: main
   Root Directory: server
   Environment: Node
   Build Command: npm install
   Start Command: npm start
   Plan: Free
   ```

5. **Add Environment Variables**:
   - Click "Advanced"
   - Add: `NODE_ENV` = `production`
   - Add: `PORT` = `10000` (Render uses 10000 by default)

6. **Click "Create Web Service"**

7. **⏳ Wait for deployment** (5-10 minutes)

8. **Copy the backend URL**: 
   - It will look like: `https://lease-backend-XXXX.onrender.com`
   - **SAVE THIS URL!** You'll need it for the frontend

---

## 🎨 Step 3: Update Frontend Configuration

1. **Update `public/runtime-config.js`**:
   - Replace `https://lease-backend.onrender.com/api` 
   - With YOUR actual backend URL from Step 2

2. **Commit and push the change**:
   ```bash
   git add public/runtime-config.js
   git commit -m "Update backend URL for production"
   git push
   ```

---

## 🌐 Step 4: Deploy Frontend to Render

1. **Go to Render Dashboard again**

2. **Click "New +"** → Select **"Static Site"**

3. **Connect the SAME Repository**

4. **Configure Frontend Service**:
   ```
   Name: lease-frontend
   Branch: main
   Build Command: npm install && npm run build
   Publish Directory: build
   ```

5. **Click "Create Static Site"**

6. **⏳ Wait for deployment** (3-5 minutes)

7. **Your app is LIVE!** 🎉
   - Frontend URL: `https://lease-frontend-XXXX.onrender.com`

---

## 🔒 Step 5: Update CORS (Important!)

After both are deployed, update the backend CORS settings:

1. Go to your backend service in Render

2. Click "Environment"

3. Add environment variable:
   ```
   FRONTEND_URL = https://lease-frontend-XXXX.onrender.com
   ```

4. **Update `server/server.js` CORS configuration** (I'll do this for you below)

---

## ⚠️ Important Notes

### Free Tier Limitations:
- ✅ **750 hours/month** free
- ⏱️ **Services sleep after 15 minutes** of inactivity
- 🐌 **First request takes ~30 seconds** to wake up
- 💾 **Free tier has limited resources**

### Keep Services Awake (Optional):
Use a service like **UptimeRobot** (free) to ping your backend every 14 minutes.

---

## 🎯 Expected URLs After Deployment

- **Frontend**: `https://lease-frontend-[your-id].onrender.com`
- **Backend**: `https://lease-backend-[your-id].onrender.com`
- **Backend Health Check**: `https://lease-backend-[your-id].onrender.com/api/health`

---

## 🐛 Troubleshooting

### Backend not working?
- Check logs in Render dashboard
- Verify environment variables are set
- Check that Puppeteer installed correctly

### Frontend can't connect to backend?
- Update `public/runtime-config.js` with correct backend URL
- Check CORS settings in backend
- Verify backend is running (check health endpoint)

### PDF generation fails?
- Check backend logs for Puppeteer errors
- Verify Chrome/Chromium installed on Render
- Check timeout settings (we increased to 60s)

---

## ✅ Testing Your Deployment

1. **Test Backend Health**:
   - Visit: `https://YOUR-BACKEND-URL.onrender.com/api/health`
   - Should see: `{"status":"ok","timestamp":"..."}`

2. **Test Frontend**:
   - Visit: `https://YOUR-FRONTEND-URL.onrender.com`
   - Should see the login page

3. **Test Login**:
   - Username: `yehuda` / Password: `yehuda`
   - Or: `builder` / `q`

4. **Test PDF Generation**:
   - Fill in some lease data
   - Click "Generate PDF"
   - Wait (might take 30-60 seconds on free tier)

---

## 📞 Need Help?

If something doesn't work, check:
1. Render logs (click on your service → "Logs" tab)
2. Browser console (F12)
3. Backend health endpoint

**I'm here to help!** 🚀


















