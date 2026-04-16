const { Events, ActivityType } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        console.log('━'.repeat(50));
        console.log(`🤖 البوت شغال بنجاح!`);
        console.log(`📛 الإسم: ${client.user.tag}`);
        console.log(`🌐 السيرفرات: ${client.guilds.cache.size}`);
        console.log(`👥 الأعضاء: ${client.guilds.cache.reduce((a, g) => a + g.memberCount, 0)}`);
        console.log('━'.repeat(50));

        // ضبط حالة البوت
        client.user.setPresence({
            activities: [{
                name: client.config.bot.activity.name,
                type: ActivityType.Watching,
            }],
            status: client.config.bot.status,
        });
    },
};
