const { Events, EmbedBuilder } = require('discord.js');
const { sendLog } = require('../utils/logger');

// ═══ بان ═══
module.exports = [
    {
        name: Events.GuildBanAdd,
        once: false,
        async execute(ban, client) {
            const embed = new EmbedBuilder()
                .setColor('#ed4245')
                .setTitle('🔨 تم حظر عضو')
                .addFields(
                    { name: '👤 العضو', value: `${ban.user.tag}`, inline: true },
                    { name: '🆔 الآيدي', value: `\`${ban.user.id}\``, inline: true },
                    { name: '📝 السبب', value: ban.reason || '`لم يتم تحديد سبب`' },
                )
                .setThumbnail(ban.user.displayAvatarURL({ dynamic: true }))
                .setTimestamp();

            await sendLog(ban.guild, 'memberBan', embed);
        },
    },
    {
        name: Events.GuildBanRemove,
        once: false,
        async execute(ban, client) {
            const embed = new EmbedBuilder()
                .setColor('#43b581')
                .setTitle('🔓 تم رفع الحظر')
                .addFields(
                    { name: '👤 العضو', value: `${ban.user.tag}`, inline: true },
                    { name: '🆔 الآيدي', value: `\`${ban.user.id}\``, inline: true },
                )
                .setThumbnail(ban.user.displayAvatarURL({ dynamic: true }))
                .setTimestamp();

            await sendLog(ban.guild, 'memberBan', embed);
        },
    },
];
