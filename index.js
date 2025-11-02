// Minecraft AFK Bot - Keeps your character active on servers
// GitHub: https://github.com/samdied/HardcoreBOT

const mineflayer = require('mineflayer');
const Movements = require('mineflayer-pathfinder').Movements;
const pathfinder = require('mineflayer-pathfinder').pathfinder;
const { GoalBlock } = require('mineflayer-pathfinder').goals;

const config = require('./settings.json');
const express = require('express');

const app = express();

app.get('/', (req, res) => {
  res.send('Bot has arrived');
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server started on port ${PORT}`);
});

function createBot() {
  let bot;

  try {
    bot = mineflayer.createBot({
      username: config['bot-account']['username'],
      password: config['bot-account']['password'],
      auth: config['bot-account']['type'],
      host: config.server.ip,
      port: config.server.port,
      version: config.server.version,
      connectTimeout: 60000,
      checkTimeoutInterval: 60000,
      hideErrors: false,
      skipValidation: true
    });
  } catch (error) {
    console.log(`\x1b[31m[ERROR] Failed to create bot: ${error.message}`, '\x1b[0m');
    if (config.utils['auto-reconnect']) {
      console.log('[INFO] Will retry connection in 30 seconds...');
      setTimeout(createBot, 30000);
    }
    return;
  }

  bot.loadPlugin(pathfinder);

  let mcData, defaultMove;
  try {
    mcData = require('minecraft-data')(bot.version);
    defaultMove = new Movements(bot, mcData);
  } catch (error) {
    console.log(`\x1b[33m[WARN] Failed to load pathfinder data: ${error.message}`, '\x1b[0m');
  }

  bot.settings.colorsEnabled = false;

  let pendingPromise = Promise.resolve();

  function sendRegister(password) {
    return new Promise((resolve, reject) => {
      bot.chat(`/register ${password} ${password}`);
      console.log(`[Auth] Sent /register command.`);

      bot.once('chat', (username, message) => {
        console.log(`[ChatLog] <${username}> ${message}`);
        if (message.includes('successfully registered')) {
          console.log('[INFO] Registration confirmed.');
          resolve();
        } else if (message.includes('already registered')) {
          console.log('[INFO] Bot was already registered.');
          resolve();
        } else if (message.includes('Invalid command')) {
          reject(`Registration failed: Invalid command. Message: "${message}"`);
        } else {
          reject(`Registration failed: unexpected message "${message}".`);
        }
      });
    });
  }

  function sendLogin(password) {
    return new Promise((resolve, reject) => {
      bot.chat(`/login ${password}`);
      console.log(`[Auth] Sent /login command.`);

      bot.once('chat', (username, message) => {
        console.log(`[ChatLog] <${username}> ${message}`);
        if (message.includes('successfully logged in')) {
          console.log('[INFO] Login successful.');
          resolve();
        } else if (message.includes('Invalid password')) {
          reject(`Login failed: Invalid password. Message: "${message}"`);
        } else if (message.includes('not registered')) {
          reject(`Login failed: Not registered. Message: "${message}"`);
        } else {
          reject(`Login failed: unexpected message "${message}".`);
        }
      });
    });
  }

  bot.once('spawn', () => {
    console.log('\x1b[33m[AfkBot] Bot joined the server', '\x1b[0m');

    // Auto-cycle: disconnect and rejoin after specified time
    if (config.utils['auto-cycle'] && config.utils['auto-cycle'].enabled) {
      let cycleTime, cycleLabel;
      if (config.utils['auto-cycle']['cycle-minutes']) {
        const cycleMinutes = config.utils['auto-cycle']['cycle-minutes'];
        cycleTime = cycleMinutes * 60 * 1000;
        cycleLabel = `${cycleMinutes} minute(s)`;
      } else {
        const cycleHours = config.utils['auto-cycle']['cycle-hours'] || 6;
        cycleTime = cycleHours * 60 * 60 * 1000;
        cycleLabel = `${cycleHours} hour(s)`;
      }
      console.log(`\x1b[36m[AfkBot] Auto-cycle enabled: Bot will rejoin every ${cycleLabel}`, '\x1b[0m');

      const cycleTimer = setTimeout(() => {
        console.log(`\x1b[36m[AfkBot] Cycle complete (${cycleLabel}). Leaving server to rejoin...`, '\x1b[0m');
        bot.quit();
      }, cycleTime);

      bot.once('end', () => {
        clearTimeout(cycleTimer);
      });
    }

    // Auto-auth
    if (config.utils['auto-auth'].enabled) {
      console.log('[INFO] Started auto-auth module');
      const password = config.utils['auto-auth'].password;

      pendingPromise = pendingPromise
        .then(() => sendRegister(password))
        .then(() => sendLogin(password))
        .catch(error => console.error('[ERROR]', error));
    }

    // Chat messages
    if (config.utils['chat-messages'].enabled) {
      console.log('[INFO] Started chat-messages module');
      const messages = config.utils['chat-messages']['messages'];

      if (config.utils['chat-messages'].repeat) {
        const delay = config.utils['chat-messages']['repeat-delay'];
        let i = 0;

        let msg_timer = setInterval(() => {
          bot.chat(`${messages[i]}`);
          if (i + 1 === messages.length) {
            i = 0;
          } else {
            i++;
          }
        }, delay * 1000);
      } else {
        messages.forEach((msg) => {
          bot.chat(msg);
        });
      }
    }

    // Move to a specific position if enabled
    const pos = config.position;
    if (config.position.enabled) {
      console.log(`\x1b[32m[Afk Bot] Moving to target location (${pos.x}, ${pos.y}, ${pos.z})\x1b[0m`);
      bot.pathfinder.setMovements(defaultMove);
      bot.pathfinder.setGoal(new GoalBlock(pos.x, pos.y, pos.z));
    }

    // Anti-AFK
    if (config.utils['anti-afk'].enabled) {
      bot.setControlState('jump', true);
      if (config.utils['anti-afk'].sneak) {
        bot.setControlState('sneak', true);
      }
    }

    // Auto-Move (Square Path)
    if (config.utils['auto-move'].enabled) {
      console.log('[INFO] Started auto-move module');
      const moveDistance = config.utils['auto-move'].distance || 50; // blocks
      const moveDelay = config.utils['auto-move'].interval || 60000; // ms
      let direction = 0; // 0=+X,1=+Z,2=-X,3=-Z

      function moveNext() {
        if (!bot.entity || !bot.entity.position) return;

        const pos = bot.entity.position.clone();

        switch (direction) {
          case 0: pos.x += moveDistance; break;
          case 1: pos.z += moveDistance; break;
          case 2: pos.x -= moveDistance; break;
          case 3: pos.z -= moveDistance; break;
        }

        bot.pathfinder.setMovements(defaultMove);
        bot.pathfinder.setGoal(new GoalBlock(Math.floor(pos.x), Math.floor(pos.y), Math.floor(pos.z)));
        console.log(`\x1b[36m[AutoMove] Moving to (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)})\x1b[0m`);

        // Turn left next
        direction = (direction + 1) % 4;
      }

      setInterval(moveNext, moveDelay);
    }
  });

  bot.on('goal_reached', () => {
    console.log(`\x1b[32m[AfkBot] Bot arrived at the target location. ${bot.entity.position}\x1b[0m`);
  });

  bot.on('death', () => {
    console.log(`\x1b[33m[AfkBot] Bot has died and was respawned at ${bot.entity.position}`, '\x1b[0m');
  });

  if (config.utils['auto-reconnect']) {
    bot.on('end', () => {
      setTimeout(() => {
        createBot();
      }, config.utils['auto-reconnect-delay']);
    });
  }

  bot.on('kicked', (reason) =>
    console.log('\x1b[33m', `[AfkBot] Bot was kicked. Reason:\n${reason}`, '\x1b[0m')
  );

  bot.on('error', (err) => {
    console.log(`\x1b[31m[ERROR] ${err.message}`, '\x1b[0m');
    if (err.message.includes('timed out') || err.message.includes('ECONNREFUSED')) {
      console.log('[INFO] Connection issue detected. Will retry on next reconnect cycle.');
    }
  });

  bot.on('login', () => {
    console.log('[INFO] Successfully logged into the server');
  });
}

// Handle crashes safely
process.on('uncaughtException', (error) => {
  console.error('\x1b[31m[UNCAUGHT EXCEPTION]\x1b[0m', error.message);
  console.error('Stack:', error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\x1b[31m[UNHANDLED REJECTION]\x1b[0m', reason);
});

// Start bot after express is ready
setTimeout(() => {
  console.log('[INFO] Starting Minecraft bot...');
  createBot();
}, 2000);