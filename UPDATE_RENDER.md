# Update Existing Render Services

## ✅ Your Code is Already Pushed!
Your changes are on GitHub, so Render can update automatically.

## Option 1: Auto-Deploy (Easiest - If Enabled)

If auto-deploy is enabled on Render:
1. **Nothing to do!** Render will automatically detect the push
2. Go to Render dashboard
3. You'll see "Deploying..." status
4. Wait 5-10 minutes
5. Done! Same URLs, updated code

## Option 2: Manual Redeploy

If auto-deploy is disabled:

### Backend Service:
1. Go to Render dashboard
2. Click on your **backend service** (lease-backend)
3. Click **"Manual Deploy"** button (top right)
4. Select **"Deploy latest commit"**
5. Wait for deployment

### Frontend Service:
1. Click on your **frontend service** (lease-frontend)
2. Click **"Manual Deploy"** button
3. Select **"Deploy latest commit"**
4. Wait for deployment

## Option 3: Update Build Command (If Needed)

If your backend build command doesn't have fonts:

1. Go to backend service → **Settings**
2. Find **"Build Command"**
3. Update to:
   ```
   apt-get update && apt-get install -y fonts-liberation fonts-dejavu-core fontconfig && npm install
   ```
4. Click **"Save Changes"**
5. Render will auto-redeploy

## ✅ Verify Deployment

After deployment:
1. Check service status: Should show "Live" ✅
2. Test backend: `https://your-backend-url.onrender.com/health`
3. Test frontend: `https://your-frontend-url.onrender.com`
4. Generate a PDF to verify spacing is fixed

## 🎯 Same URLs, Updated Code!

Your URLs stay the same - only the code updates!


