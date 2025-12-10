# Deployment Instructions

## Step 1: Create GitHub Repository

1. Go to: https://github.com/new
2. Repository name: `lease-drafting-system` (or any name you prefer)
3. Description: "Professional Lease Drafting System"
4. Choose: **Private** (recommended) or Public
5. **DO NOT** check "Initialize with README"
6. Click **"Create repository"**

## Step 2: Push Code to GitHub

After creating the repo, run these commands (replace `REPO_NAME` with your actual repo name):

```powershell
git remote add origin https://github.com/qqmakana/REPO_NAME.git
git branch -M main
git push -u origin main
```

## Step 3: Deploy to Railway

1. Go to: https://railway.app
2. Click **"Start a New Project"**
3. Click **"Deploy from GitHub repo"**
4. Authorize Railway to access your GitHub
5. Select your repository: `lease-drafting-system`
6. Railway will auto-detect and deploy both frontend and backend

## Step 4: Configure Environment Variables

After deployment:

1. In Railway dashboard, click on your **backend service**
2. Go to **Variables** tab
3. Add: `PORT` = `5000`
4. Add: `NODE_ENV` = `production`

5. In Railway dashboard, click on your **frontend service**
6. Go to **Variables** tab
7. Add: `REACT_APP_API_URL` = `https://your-backend-url.railway.app/api`
   (Replace with your actual backend URL from Railway)

## Step 5: Get Your URLs

- Frontend URL: Railway will provide this (e.g., `https://your-app.railway.app`)
- Backend URL: Railway will provide this (e.g., `https://your-backend.railway.app`)

Your app will be live! 🚀


