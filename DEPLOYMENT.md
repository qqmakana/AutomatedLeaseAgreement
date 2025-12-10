# Netlify Deployment Guide

## Prerequisites
1. Node.js 18+ installed
2. Netlify account
3. Backend API deployed (Heroku, Railway, Render, etc.)

## Step 1: Set Environment Variables

### For Local Development
Create a `.env` file in the root directory:
```
REACT_APP_API_URL=http://localhost:5000
```

### For Production (Netlify)
1. Go to your Netlify site dashboard
2. Navigate to **Site settings** → **Environment variables**
3. Add a new variable:
   - **Key**: `REACT_APP_API_URL`
   - **Value**: Your backend API URL (e.g., `https://your-backend.herokuapp.com`)

## Step 2: Build the Project

Run the build command:
```bash
npm run build
```

This creates a `build` folder with optimized production files.

## Step 3: Deploy to Netlify

### Option A: Deploy via Netlify Dashboard
1. Go to [Netlify](https://app.netlify.com)
2. Click **Add new site** → **Deploy manually**
3. Drag and drop the `build` folder
4. Your site will be live!

### Option B: Deploy via Git (Recommended)
1. Push your code to GitHub/GitLab/Bitbucket
2. Connect your repository to Netlify
3. Netlify will automatically build and deploy using `netlify.toml`

### Option C: Deploy via Netlify CLI
```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod --dir=build
```

## Step 4: Configure Backend CORS

Make sure your backend allows requests from your Netlify domain:
- Add your Netlify URL to CORS allowed origins
- Example: `https://your-site.netlify.app`

## Important Notes

- The `build` folder contains optimized, minified production files
- Never commit the `build` folder to Git (already in .gitignore)
- Always set `REACT_APP_API_URL` in Netlify environment variables
- The `_redirects` file ensures React Router works correctly on Netlify

## Troubleshooting

### Build fails
- Check Node.js version (should be 18+)
- Run `npm install` before building
- Check for TypeScript/ESLint errors

### API calls fail in production
- Verify `REACT_APP_API_URL` is set in Netlify
- Check backend CORS settings
- Check browser console for errors

### 404 errors on page refresh
- The `_redirects` file should handle this
- Verify `netlify.toml` redirects are correct


