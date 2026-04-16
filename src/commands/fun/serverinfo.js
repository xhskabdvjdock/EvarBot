const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('📊 معلومات السيرفر'),

    async execute(interaction, client) {
        const guild = interaction.guild;
        await guild.members.fetch().catch(() => { });

        const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
        const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
        const categories = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;
        const roles = guild.roles.cache.size - 1; // بدون @everyone
        const emojis = guild.emojis.cache.size;
        const stickers = guild.stickers.cache.size;

        const humans = guild.members.cache.filter(m => !m.user.bot).size;
        const bots = guild.members.cache.filter(m => m.user.bot).size;
        const online = guild.members.cache.filter(m => m.presence?.status === 'online').size;

        const boostLevel = guild.premiumTier;
        const boostCount = guild.premiumSubscriptionCount || 0;
        const boostBar = '█'.repeat(boostCount).padEnd(14, '░');

        const verificationLevels = { 0: 'لا يوجد', 1: 'منخفض', 2: 'متوسط', 3: 'عالي', 4: 'أعلى مستوى' };

        const createdAt = Math.floor(guild.createdTimestamp / 1000);

        const embed = new EmbedBuilder()
            .setColor('#5865f2')
            .setTitle(`📊 ${guild.name}`)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
            .addFields(
                { name: '👑 المالك', value: `<@${guild.ownerId}>`, inline: true },
                { name: '📅 تاريخ الإنشاء', value: `<t:${createdAt}:R>`, inline: true },
                { name: '🆔 الآيدي', value: `\`${guild.id}\``, inline: true },
                { name: `👥 الأعضاء (${guild.memberCount})`, value: `🧑 ${humans} عضو • 🤖 ${bots} بوت${online ? `\n🟢 ${online} أونلاين` : ''}`, inline: true },
                { name: `📁 القنوات (${textChannels + voiceChannels})`, value: `💬 ${textChannels} نصية\n🔊 ${voiceChannels} صوتية\n📂 ${categories} فئة`, inline: true },
                { name: '🎭 أخرى', value: `🎨 ${roles} رول\n😀 ${emojis} إيموجي\n🏷️ ${stickers} ملصق`, inline: true },
                { name: `🚀 البوست (المستوى ${boostLevel})`, value: `\`${boostBar}\` ${boostCount} بوست` },
                { name: '🔒 مستوى التحقق', value: verificationLevels[guild.verificationLevel] || 'غير معروف', inline: true },
            )
            .setTimestamp();

        if (guild.bannerURL()) embed.setImage(guild.bannerURL({ size: 1024 }));

        await interaction.reply({ embeds: [embed] });
    },
};
