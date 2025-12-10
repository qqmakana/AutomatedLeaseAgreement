# Quick Checklist: Verify Render Setup

## ✅ Step 1: Check Your Render Backend Service

1. Go to: https://dashboard.render.com
2. Click on your **backend service** (probably named `lease-backend`)
3. Click **"Settings"** tab
4. Look for **"Environment"** field

### What You Should See:
```
Environment: Docker ✅
```

### If You See:
```
Environment: Node ❌
```
**→ This is the problem! You need to recreate the service with Docker.**

---

## ✅ Step 2: Check Build Logs

1. In Render dashboard → Backend service
2. Click **"Logs"** tab
3. Scroll to the **build logs** (not runtime logs)
4. Look for these lines:

```
Step 2/8 : RUN apt-get update && apt-get install -y ...
Get:1 ... fonts-liberation ...
Get:2 ... fonts-dejavu ...
...
fc-cache -f -v
```

**If you see font installation** → ✅ Docker is working!

**If you DON'T see font installation** → ❌ Docker is not being used

---

## ✅ Step 3: Test PDF Generation

1. Go to your frontend URL
2. Generate a PDF
3. Go back to Render → Backend service → **"Logs"** tab
4. Look for:

```
=== FONT VERIFICATION ===
🔍 Liberation Sans available: true
🔍 Body font family: "Liberation Sans", ...
🔍 Field metrics: {...}
```

**If you see "Liberation Sans available: true"** → ✅ Fonts are working!

**If you see "false" or errors** → ❌ Fonts not installed properly

---

## 🚨 If Render Shows "Node" Instead of "Docker"

### Fix: Recreate Service with Docker

1. **Delete** current backend service:
   - Settings → Scroll down → "Delete Service"

2. **Create new** backend service:
   - Click "New +" → "Web Service"
   - Connect GitHub repo: `AutomatedLeaseAgreement`
   - **Name**: `lease-backend`
   - **Environment**: **Select "Docker"** ⚠️ (NOT Node!)
   - **Dockerfile Path**: `server/Dockerfile`
   - **Docker Context**: `server`
   - **Plan**: Free

3. **Add Environment Variables**:
   - `PORT` = `5000`
   - `NODE_ENV` = `production`

4. Click **"Create Web Service"**

5. Wait for deployment (5-10 minutes)

---

## 🎯 Quick Answer

**Can Render handle fonts?** 
→ **YES!** But you MUST use **Docker environment**, not Node environment.

**Is our setup correct?**
→ **YES!** Our Dockerfile installs fonts correctly.

**What's the most common issue?**
→ Backend service is using "Node" instead of "Docker"

---

## 📞 Next Steps

1. **Check** your Render backend environment (should be "Docker")
2. **Verify** build logs show font installation
3. **Test** PDF generation
4. **Check** runtime logs for font verification

If everything checks out → PDF should work! 🎉

If not → Consider switching to **Railway.app** (easier Docker setup)

