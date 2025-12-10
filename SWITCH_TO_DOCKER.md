# Switch Render Backend to Docker - Step by Step

## Why Docker?
- ✅ Can install fonts properly
- ✅ Matches your local Docker setup
- ✅ More reliable PDF generation

## Steps to Switch:

### 1. Go to Render Dashboard
- Visit: https://dashboard.render.com
- Click on your **backend service**

### 2. Go to Settings Tab
- Click **"Settings"** tab at the top

### 3. Change Environment to Docker
- Find **"Environment"** dropdown (near the top)
- Change from **"Node"** to **"Docker"**
- Click **"Save Changes"**

### 4. Set Dockerfile Path
- Find **"Dockerfile Path"** field
- Enter: `server/Dockerfile`
- Click **"Save Changes"**

### 5. Clear Build Command
- Find **"Build Command"** field
- **Clear it** (leave empty) - Docker handles building
- Click **"Save Changes"**

### 6. Verify Start Command
- Find **"Start Command"** field
- Should be empty or `node server.js` (Dockerfile has CMD)
- Click **"Save Changes"**

### 7. Deploy
- Render will automatically start deploying
- Wait 10-15 minutes (Docker builds take longer)
- Status will show: "Building" → "Deploying" → "Live"

## ✅ That's It!

After deployment, PDFs should have proper fonts and spacing!


