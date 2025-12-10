# Deploy to Render - Step by Step (FREE)

## ✅ Your Code is on GitHub!
Repository: https://github.com/qqmakana/AutomatedLeaseAgreement

## 🚀 Deploy to Render (Both Frontend & Backend - FREE)

### Step 1: Sign up for Render
1. Go to: https://render.com
2. Click **"Get Started for Free"**
3. Sign up with **GitHub** (use your GitHub account: qqmakana)
4. Authorize Render to access your repositories

### Step 2: Deploy Backend First

1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository: **AutomatedLeaseAgreement**
3. Configure Backend:
   - **Name**: `lease-backend` (or any name)
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: **Free**

4. Add Environment Variables:
   - `PORT` = `5000`
   - `NODE_ENV` = `production`

5. Click **"Create Web Service"**
6. Wait for deployment (5-10 minutes)
7. Copy your backend URL (e.g., `https://lease-backend.onrender.com`)

### Step 3: Deploy Frontend

1. Click **"New +"** → **"Static Site"**
2. Connect your GitHub repository: **AutomatedLeaseAgreement**
3. Configure Frontend:
   - **Name**: `lease-frontend` (or any name)
   - **Root Directory**: Leave empty (or `/`)
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `build`
   - **Plan**: **Free**

4. Add Environment Variable:
   - `REACT_APP_API_URL` = `https://your-backend-url.onrender.com/api`
   - (Use the backend URL from Step 2)

5. Click **"Create Static Site"**
6. Wait for deployment (5-10 minutes)

### Step 4: Get Your URLs

Render will provide:
- **Frontend URL**: `https://lease-frontend.onrender.com`
- **Backend URL**: `https://lease-backend.onrender.com`

### Step 5: Update Frontend Environment Variable

After backend is deployed:
1. Go to your Frontend service in Render dashboard
2. Go to **Environment** tab
3. Update `REACT_APP_API_URL` with your actual backend URL
4. Click **"Save Changes"**
5. Render will auto-redeploy

## 📝 Important Notes

- **FREE TIER**: Both services are free
- **Sleep Mode**: Free services sleep after 15 minutes of inactivity
- **First Request**: May take 30-60 seconds to wake up (free tier limitation)
- **Auto-Deploy**: Render auto-deploys when you push to GitHub

## 🔧 Troubleshooting

If PDF generation doesn't work:
1. Check backend URL is correct in frontend environment variables
2. Make sure backend service is running (check Render dashboard)
3. Check Render logs for errors
4. Wait 30-60 seconds after first request (free tier wake-up time)

## 🎯 Next Steps After Deployment

1. Share frontend URL with your client
2. Test all features
3. Monitor Render dashboard for usage

Your app will be live and ready for your client to test! 🚀

## 💡 Pro Tip

Free tier services sleep after inactivity. First request after sleep takes 30-60 seconds. This is normal for free tier.


