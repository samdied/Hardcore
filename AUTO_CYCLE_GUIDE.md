# Auto-Cycle Feature Guide

## What is Auto-Cycle?

The auto-cycle feature makes your bot automatically disconnect and immediately rejoin the Minecraft server at regular intervals. This creates an infinite loop where the bot stays active 24/7 while periodically refreshing its connection.

## How It Works

1. **Bot joins server** and starts all configured activities (anti-AFK, chat messages, etc.)
2. **Timer starts** counting down from your configured cycle duration
3. **After X hours**, the bot gracefully disconnects with a log message
4. **Immediately reconnects** thanks to the auto-reconnect feature
5. **Cycle repeats** infinitely

## Configuration

In `settings.json`, under the `utils` section:

```json
"auto-cycle": {
  "enabled": true,
  "cycle-hours": 6
}
```

### Options:

- **`enabled`**: Set to `true` to activate auto-cycle, `false` to disable
- **`cycle-hours`**: Number of hours between each disconnect/rejoin cycle

### Examples:

**6-hour cycle (default):**
```json
"auto-cycle": {
  "enabled": true,
  "cycle-hours": 6
}
```

**12-hour cycle:**
```json
"auto-cycle": {
  "enabled": true,
  "cycle-hours": 12
}
```

**1-hour cycle (for testing):**
```json
"auto-cycle": {
  "enabled": true,
  "cycle-hours": 1
}
```

**Disable auto-cycle:**
```json
"auto-cycle": {
  "enabled": false,
  "cycle-hours": 6
}
```

## Log Messages

When auto-cycle is active, you'll see these messages in your logs:

- `[AfkBot] Auto-cycle enabled: Bot will rejoin every 6 hour(s)` - When bot connects
- `[AfkBot] 6-hour cycle complete. Leaving server to rejoin...` - When cycle triggers

## Requirements

For auto-cycle to work properly, you must have:
- `auto-reconnect` set to `true` in settings.json
- A valid `auto-reconnect-delay` value (milliseconds)

## Use Cases

- **Avoid detection**: Some servers may flag accounts that stay connected for days
- **Refresh connection**: Prevents connection staleness and potential issues
- **Session management**: Keeps your bot's session fresh
- **Server compliance**: Some servers have policies about continuous connection

## Troubleshooting

**Q: Bot doesn't rejoin after leaving?**  
A: Make sure `auto-reconnect` is set to `true` in your settings.

**Q: Can I use a custom cycle time?**  
A: Yes! Just change the `cycle-hours` value to any number you want.

**Q: Will this interrupt ongoing activities?**  
A: The bot gracefully disconnects and all activities restart fresh when it rejoins.
