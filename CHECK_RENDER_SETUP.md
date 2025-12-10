# Critical: Verify Render is Using Docker

## Step 1: Check Render Backend Settings

1. Go to Render dashboard → Your backend service
2. Click **Settings** tab
3. Check **"Environment"** field:
   - ✅ Should say **"Docker"**
   - ❌ If it says **"Node"**, that's the problem!

## Step 2: If It Says "Node"

You need to switch to Docker:

1. **Delete** the current backend service
2. **Create new** service:
   - Click "New +" → "Web Service"
   - Connect GitHub repo
   - **Environment**: Select **"Docker"** (NOT Node!)
   - **Dockerfile Path**: `server/Dockerfile`
   - **Root Directory**: `server` (or leave empty)
   - **Name**: `lease-backend`
   - Click "Create Web Service"

## Step 3: Verify Dockerfile is Being Used

After deployment, check logs for:
- Font installation messages
- `fc-cache` output
- Debug output showing fonts

## Why This Matters

- **Node environment**: Can't install fonts properly
- **Docker environment**: Can install fonts via Dockerfile

If Render is using Node instead of Docker, fonts won't be available!


