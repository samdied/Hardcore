# Railway Deployment Guide

## Deploy to Railway

1. **Push your code to GitHub** (you've already set this up)
   ```bash
   git add .
   git commit -m "Add Railway deployment configuration"
   git push origin main
   ```

2. **Connect to Railway**
   - Go to [railway.app](https://railway.app/)
   - Click "Start a New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `HardcoreBOT` repository

3. **Configure Environment (if needed)**
   Railway will automatically:
   - Detect Node.js project
   - Install dependencies from package.json
   - Run `npm start` command
   - Use the PORT environment variable (already configured in the code)

4. **Health Check**
   Railway will monitor your app via the `/health` endpoint

## Timeout Fix

The bot now includes:
- ✅ Extended connection timeout (60 seconds)
- ✅ Better error handling for timeouts
- ✅ Auto-reconnect on connection failures
- ✅ Health endpoint for Railway monitoring
- ✅ Proper port binding for Railway (PORT environment variable)

## Configuration

Edit `settings.json` to configure:
- Minecraft server details
- Bot username/password
- Auto-auth settings
- Anti-AFK settings
- Chat messages
- **Auto-cycle** (NEW): Bot automatically leaves and rejoins every X hours
  - `enabled`: true/false
  - `cycle-hours`: number of hours (default: 6)

## Monitoring

- Check logs in Railway dashboard
- Visit `/health` endpoint to see bot status
- Root `/` endpoint shows "Bot has arrived"
