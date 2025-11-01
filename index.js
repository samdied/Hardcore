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
            console.log(`[ChatLog] <${username}> ${message}`); // Log all chat messages

            // Check for various possible responses
            if (message.includes('successfully registered')) {
               console.log('[INFO] Registration confirmed.');
               resolve();
            } else if (message.includes('already registered')) {
               console.log('[INFO] Bot was already registered.');
               resolve(); // Resolve if already registered
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
            console.log(`[ChatLog] <${username}> ${message}`); // Log all chat messages

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

      // Auto-cycle: disconnect and rejoin after specified hours
      if (config.utils['auto-cycle'] && config.utils['auto-cycle'].enabled) {
         const cycleHours = config.utils['auto-cycle']['cycle-hours'] || 6;
         const cycleTime = cycleHours * 60 * 60 * 1000; // Convert hours to milliseconds
         
         console.log(`\x1b[36m[AfkBot] Auto-cycle enabled: Bot will rejoin every ${cycleHours} hour(s)`, '\x1b[0m');
         
         const cycleTimer = setTimeout(() => {
            console.log(`\x1b[36m[AfkBot] ${cycleHours}-hour cycle complete. Leaving server to rejoin...`, '\x1b[0m');
            bot.quit(); // Gracefully disconnect
         }, cycleTime);
         
         // Clear timer if bot disconnects early
         bot.once('end', () => {
            clearTimeout(cycleTimer);
         });
      }

      if (config.utils['auto-auth'].enabled) {
         console.log('[INFO] Started auto-auth module');

         const password = config.utils['auto-auth'].password;

         pendingPromise = pendingPromise
            .then(() => sendRegister(password))
            .then(() => sendLogin(password))
            .catch(error => console.error('[ERROR]', error));
      }

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

      const pos = config.position;

      if (config.position.enabled) {
         console.log(
            `\x1b[32m[Afk Bot] Starting to move to target location (${pos.x}, ${pos.y}, ${pos.z})\x1b[0m`
         );
         bot.pathfinder.setMovements(defaultMove);
         bot.pathfinder.setGoal(new GoalBlock(pos.x, pos.y, pos.z));
      }

      if (config.utils['anti-afk'].enabled) {
         bot.setControlState('jump', true);
         if (config.utils['anti-afk'].sneak) {
            bot.setControlState('sneak', true);
         }
      }
   });

   bot.on('goal_reached', () => {
      console.log(
         `\x1b[32m[AfkBot] Bot arrived at the target location. ${bot.entity.position}\x1b[0m`
      );
   });

   bot.on('death', () => {
      console.log(
         `\x1b[33m[AfkBot] Bot has died and was respawned at ${bot.entity.position}`,
         '\x1b[0m'
      );
   });

   if (config.utils['auto-reconnect']) {
      bot.on('end', () => {
         setTimeout(() => {
            createBot();
         }, config.utils['auto-reconnect-delay']);
      });
   }

   bot.on('kicked', (reason) =>
      console.log(
         '\x1b[33m',
         `[AfkBot] Bot was kicked from the server. Reason: \n${reason}`,
         '\x1b[0m'
      )
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

// Process-level error handlers to prevent crashes
process.on('uncaughtException', (error) => {
   console.error('\x1b[31m[UNCAUGHT EXCEPTION]\x1b[0m', error.message);
   console.error('Stack:', error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
   console.error('\x1b[31m[UNHANDLED REJECTION]\x1b[0m', reason);
});

// Start the bot with delay to ensure Express server is ready
setTimeout(() => {
   console.log('[INFO] Starting Minecraft bot...');
   createBot();
}, 2000);
