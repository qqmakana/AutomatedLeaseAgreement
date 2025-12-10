# Deploy to Render - Step by Step

## 🚀 Quick Deploy Guide

### Step 1: Go to Render Dashboard
1. Visit: https://dashboard.render.com
2. You should see your services listed

### Step 2: Deploy Backend

1. **Click on your backend service** (e.g., "lease-backend")
2. Look for **"Manual Deploy"** button (usually top right, blue button)
3. Click it
4. Select **"Deploy latest commit"**
5. ✅ Wait for deployment (5-10 minutes)
6. Status will change: "Building" → "Deploying" → "Live"

### Step 3: Deploy Frontend

1. **Click on your frontend service** (e.g., "lease-frontend")
2. Click **"Manual Deploy"** button
3. Select **"Deploy latest commit"**
4. ✅ Wait for deployment (5-10 minutes)

### Step 4: Update Backend Build Command (IMPORTANT!)

**Before deploying, make sure backend has fonts:**

1. Go to backend service → **Settings** tab
2. Scroll to **"Build Command"**
3. Change it to:
   ```
   apt-get update && apt-get install -y fonts-liberation fonts-dejavu-core fontconfig && npm install
   ```
4. Click **"Save Changes"**
5. It will auto-redeploy

### Step 5: Test

After both are "Live":
- Backend: `https://your-backend-url.onrender.com/health`
- Frontend: `https://your-frontend-url.onrender.com`
- Generate a PDF to verify spacing is fixed!

## ✅ That's It!

Your app will be updated with the fixed PDF spacing!


