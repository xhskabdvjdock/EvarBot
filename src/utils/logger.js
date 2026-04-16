const { EmbedBuilder } = require('discord.js');
const { getGuildData } = require('./database');

/**
 * إرسال لوق للقناة المحددة
 * @param {Guild} guild - السيرفر
 * @param {string} eventType - نوع الحدث
 * @param {EmbedBuilder} embed - الإمبد
 */
async function sendLog(guild, eventType, embed) {
    try {
        const guildData = getGuildData(guild.id);
        const config = guildData.logging;

        if (!config?.enabled || !config?.channelId) return;
        if (config.events?.[eventType] === false) return;

        const channel = guild.channels.cache.get(config.channelId);
        if (!channel) return;

        await channel.send({ embeds: [embed] });
    } catch (err) {
        // صامت — ما نوقف البوت لو اللوق فشل
    }
}

module.exports = { sendLog };
