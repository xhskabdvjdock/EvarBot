const { Events, EmbedBuilder, AuditLogEvent } = require('discord.js');
const { sendLog } = require('../utils/logger');

module.exports = {
    name: Events.MessageDelete,
    once: false,

    async execute(message, client) {
        if (!message.guild || message.author?.bot) return;
        if (message.partial) return;

        const embed = new EmbedBuilder()
            .setColor('#ed4245')
            .setTitle('🗑️ رسالة محذوفة')
            .addFields(
                { name: '👤 الكاتب', value: `${message.author} (${message.author.tag})`, inline: true },
                { name: '📺 القناة', value: `${message.channel}`, inline: true },
                { name: '📅 الوقت', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
            )
            .setFooter({ text: `آيدي الرسالة: ${message.id}` })
            .setTimestamp();

        if (message.content) {
            embed.addFields({ name: '💬 المحتوى', value: message.content.slice(0, 1024) });
        }

        if (message.attachments.size > 0) {
            const files = message.attachments.map(a => `[${a.name}](${a.url})`).join('\n');
            embed.addFields({ name: '📎 المرفقات', value: files.slice(0, 1024) });
        }

        embed.setThumbnail(message.author.displayAvatarURL({ dynamic: true }));

        await sendLog(message.guild, 'messageDelete', embed);
    },
};
