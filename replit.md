# Minecraft AFK Bot

## Overview
This is a Minecraft AFK bot built with Node.js and Mineflayer. It connects to Minecraft servers and helps keep your account active with various automation features.

## Recent Changes (October 28, 2025)

### Railway Deployment Fixes
- ✅ Fixed timeout errors (extended to 60 seconds)
- ✅ Added process-level error handlers to prevent crashes
- ✅ Express server now stays alive even if Minecraft connection fails
- ✅ Added Railway-specific configuration (PORT environment variable, health endpoint)
- ✅ Added `/health` endpoint for monitoring
- ✅ Created `Procfile` for Railway deployment
- ✅ Updated `package.json` with start script and Node.js engine version

## Previous Changes (October 26, 2025)
Fixed critical errors in the codebase:
1. **JSON Structure Error** - Fixed malformed JSON in `settings.json` where the `chat-messages` object was not properly closed
2. **Missing Properties** - Restored the `messages` array to the `chat-messages` configuration
3. **Typo Fix** - Corrected `auto-recconect-delay` to `auto-reconnect-delay` throughout the configuration
4. **Port Configuration** - Changed Express server port from 8000 to 5000 (required for Replit)
5. **Workflow Setup** - Configured Server workflow to run the bot successfully

## Project Architecture
- **index.js** - Main bot logic with Express server status endpoint
- **settings.json** - Bot configuration (server, account, modules)
- **Dependencies**: Express, Mineflayer, Mineflayer-pathfinder

## Features
- Anti-AFK kick prevention
- Auto-authentication with Login Security plugin
- Chat messages module
- Auto-reconnect on disconnect
- Move to target block
- Support for Mojang/Microsoft accounts
- Server versions: 1.8 - 1.21.3

## Running the Bot
The bot automatically starts via the Server workflow. It connects to the configured Minecraft server and runs the Express status server on port 5000.
