# Render Deployment Commands - Quick Reference

## 🔧 BACKEND (Web Service)

**Settings:**
- **Name:** `lease-backend`
- **Root Directory:** `server`
- **Environment:** `Node` (NOT Docker)
- **Build Command:** `npm install`
- **Start Command:** `node server.js`
- **Plan:** `Free`

**Environment Variables:**
```
PORT = 5000
NODE_ENV = production
```

---

## 🎨 FRONTEND (Static Site)

**Settings:**
- **Name:** `lease-frontend`
- **Root Directory:** (leave empty)
- **Build Command:** `npm install && npm run build`
- **Publish Directory:** `build`
- **Plan:** `Free`

**Environment Variable:**
```
REACT_APP_API_URL = https://your-backend-url.onrender.com/api
```
*(Replace `your-backend-url` with your actual backend URL)*

---

## 📝 Step-by-Step Process

### Backend First:
1. Go to Render Dashboard
2. Click "New +" → "Web Service"
3. Connect repo: `AutomatedLeaseAgreement`
4. Fill in the settings above
5. Add environment variables
6. Click "Create Web Service"
7. Wait for deployment (5-10 min)
8. **Copy the backend URL** (e.g., `https://lease-backend-xxxx.onrender.com`)

### Frontend Second:
1. Click "New +" → "Static Site"
2. Connect repo: `AutomatedLeaseAgreement`
3. Fill in the settings above
4. Add environment variable with your **actual backend URL**
5. Click "Create Static Site"
6. Wait for deployment (5-10 min)

---

## ✅ Verify Deployment

**Backend Health Check:**
- Visit: `https://your-backend-url.onrender.com/health`
- Should see: `{"status":"ok","timestamp":"..."}`

**Frontend:**
- Visit your frontend URL
- Should see your app!


