const { Events, EmbedBuilder, ChannelType } = require('discord.js');
const { sendLog } = require('../utils/logger');

const TYPE_NAMES = {
    [ChannelType.GuildText]: '💬 نصية',
    [ChannelType.GuildVoice]: '🔊 صوتية',
    [ChannelType.GuildCategory]: '📂 فئة',
    [ChannelType.GuildAnnouncement]: '📢 إعلانات',
    [ChannelType.GuildStageVoice]: '🎤 ستيج',
    [ChannelType.GuildForum]: '📋 منتدى',
};

module.exports = [
    {
        name: Events.ChannelCreate,
        once: false,
        async execute(channel, client) {
            if (!channel.guild) return;

            const embed = new EmbedBuilder()
                .setColor('#43b581')
                .setTitle('📁 قناة جديدة')
                .addFields(
                    { name: '📛 الاسم', value: `${channel} (\`${channel.name}\`)`, inline: true },
                    { name: '📋 النوع', value: TYPE_NAMES[channel.type] || 'غير معروف', inline: true },
                    { name: '📂 الفئة', value: channel.parent?.name || '`بدون فئة`', inline: true },
                )
                .setTimestamp();

            await sendLog(channel.guild, 'channelCreate', embed);
        },
    },
    {
        name: Events.ChannelDelete,
        once: false,
        async execute(channel, client) {
            if (!channel.guild) return;

            const embed = new EmbedBuilder()
                .setColor('#ed4245')
                .setTitle('🗑️ قناة محذوفة')
                .addFields(
                    { name: '📛 الاسم', value: `\`${channel.name}\``, inline: true },
                    { name: '📋 النوع', value: TYPE_NAMES[channel.type] || 'غير معروف', inline: true },
                    { name: '📂 الفئة', value: channel.parent?.name || '`بدون فئة`', inline: true },
                )
                .setTimestamp();

            await sendLog(channel.guild, 'channelDelete', embed);
        },
    },
];
