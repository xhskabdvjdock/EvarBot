const { Events, EmbedBuilder } = require('discord.js');
const { sendLog } = require('../utils/logger');

module.exports = {
    name: Events.MessageUpdate,
    once: false,

    async execute(oldMessage, newMessage, client) {
        if (!newMessage.guild || newMessage.author?.bot) return;
        if (oldMessage.partial || newMessage.partial) return;
        if (oldMessage.content === newMessage.content) return;

        const embed = new EmbedBuilder()
            .setColor('#faa61a')
            .setTitle('✏️ رسالة معدّلة')
            .addFields(
                { name: '👤 الكاتب', value: `${newMessage.author} (${newMessage.author.tag})`, inline: true },
                { name: '📺 القناة', value: `${newMessage.channel}`, inline: true },
                { name: '📅 الوقت', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                { name: '📝 قبل التعديل', value: oldMessage.content?.slice(0, 1024) || '`فارغ`' },
                { name: '📝 بعد التعديل', value: newMessage.content?.slice(0, 1024) || '`فارغ`' },
            )
            .setThumbnail(newMessage.author.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: `آيدي الرسالة: ${newMessage.id}` })
            .setTimestamp();

        await sendLog(newMessage.guild, 'messageEdit', embed);
    },
};
