# Deploy to Railway - Step by Step

## ✅ Your Code is on GitHub!
Repository: https://github.com/qqmakana/AutomatedLeaseAgreement

## 🚀 Deploy to Railway (Both Frontend & Backend)

### Step 1: Sign up for Railway
1. Go to: https://railway.app
2. Click **"Start a New Project"**
3. Sign up with **GitHub** (use your GitHub account: qqmakana)

### Step 2: Deploy from GitHub
1. Click **"Deploy from GitHub repo"**
2. Authorize Railway to access your GitHub repositories
3. Find and select: **AutomatedLeaseAgreement**
4. Click **"Deploy Now"**

### Step 3: Railway Auto-Detection
Railway will automatically detect:
- ✅ Frontend (React app in root)
- ✅ Backend (Node.js server in `/server` folder)

Railway will create **2 services**:
1. **Frontend Service** - Your React app
2. **Backend Service** - Your Node.js server

### Step 4: Configure Backend Service
1. Click on the **Backend Service** (usually named after your repo)
2. Go to **Variables** tab
3. Add these environment variables:
   - `PORT` = `5000`
   - `NODE_ENV` = `production`

### Step 5: Configure Frontend Service
1. Click on the **Frontend Service**
2. Go to **Variables** tab
3. Add this environment variable:
   - `REACT_APP_API_URL` = `https://YOUR-BACKEND-URL.railway.app/api`
   - (Get the backend URL from Railway dashboard - it will be something like `https://automatedleaseagreement-production.up.railway.app`)

### Step 6: Get Your URLs
Railway will provide you with:
- **Frontend URL**: `https://your-frontend.railway.app`
- **Backend URL**: `https://your-backend.railway.app`

### Step 7: Test Your App
1. Visit your frontend URL
2. Try generating a PDF
3. Everything should work! 🎉

## 📝 Important Notes

- Railway has a **free tier** with $5 credit/month
- Your app will sleep after inactivity (free tier)
- First deployment may take 5-10 minutes
- Railway will auto-redeploy when you push to GitHub

## 🔧 Troubleshooting

If PDF generation doesn't work:
1. Check backend URL is correct in frontend environment variables
2. Make sure backend service is running (check Railway dashboard)
3. Check Railway logs for errors

## 🎯 Next Steps After Deployment

1. Share frontend URL with your client
2. Test all features
3. Monitor Railway dashboard for usage

Your app will be live and ready for your client to test! 🚀


