require('dotenv').config();
require('./utils/silenceYoutubeJsLogs').install();
const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');

const { Client, GatewayIntentBits, Collection, ActivityType } = require('discord.js');
const config = require('../config.json');

// إنشاء الكلاينت مع كل الصلاحيات المطلوبة
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions,
    ],
});

// تخزين الأوامر
client.commands = new Collection();
client.config = config;

// تحميل الهاندلرز
const commandHandler = require('./handlers/commandHandler');
const eventHandler = require('./handlers/eventHandler');

commandHandler(client);
eventHandler(client);

// تحميل الداشبورد والـ AI
const { startDashboard } = require('../dashboard/server');
const { initGemini } = require('./utils/gemini');
const { initPlayer } = require('./utils/musicPlayer');

// تسجيل الدخول وتشغيل الداشبورد والـ AI والموسيقى
client.login(process.env.TOKEN).then(async () => {
    initGemini();
    await initPlayer(client);
    startDashboard(client);
}).catch(err => {
    console.error('❌ فشل تسجيل الدخول! تأكد من التوكن في ملف .env');
    console.error(err);
});
