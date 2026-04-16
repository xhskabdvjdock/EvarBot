const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('👤 معلومات عضو')
        .addUserOption(opt =>
            opt.setName('user').setDescription('العضو (افتراضي: أنت)').setRequired(false)),

    async execute(interaction, client) {
        const user = interaction.options.getUser('user') || interaction.user;
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        const createdAt = Math.floor(user.createdTimestamp / 1000);
        const badges = getUserBadges(user.flags?.toArray() || []);

        const embed = new EmbedBuilder()
            .setColor(member?.displayHexColor || '#5865f2')
            .setTitle(`👤 ${user.tag}`)
            .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }))
            .addFields(
                { name: '🆔 الآيدي', value: `\`${user.id}\``, inline: true },
                { name: '📅 إنشاء الحساب', value: `<t:${createdAt}:R>`, inline: true },
                { name: '🤖 بوت؟', value: user.bot ? '✅ نعم' : '❌ لا', inline: true },
            );

        if (member) {
            const joinedAt = Math.floor(member.joinedTimestamp / 1000);
            const roles = member.roles.cache
                .filter(r => r.id !== interaction.guild.id)
                .sort((a, b) => b.position - a.position)
                .map(r => `${r}`)
                .slice(0, 15);

            embed.addFields(
                { name: '📥 دخل السيرفر', value: `<t:${joinedAt}:R>`, inline: true },
                { name: '📛 اللقب', value: member.nickname || '`لا يوجد`', inline: true },
                { name: '🎨 اللون', value: member.displayHexColor || 'افتراضي', inline: true },
                { name: `🎭 الأدوار (${roles.length})`, value: roles.length > 0 ? roles.join(' ') : '`لا يوجد`' },
            );
        }

        if (badges) {
            embed.addFields({ name: '🏅 الشارات', value: badges });
        }

        embed.setTimestamp();
        await interaction.reply({ embeds: [embed] });
    },
};

function getUserBadges(flags) {
    const badgeMap = {
        Staff: '<:staff:🔧> طاقم ديسكورد',
        Partner: '<:partner:🤝> شريك',
        Hypesquad: '🏠 HypeSquad Events',
        BugHunterLevel1: '🐛 صائد أخطاء',
        BugHunterLevel2: '🐛 صائد أخطاء (ذهبي)',
        HypeSquadOnlineHouse1: '🟣 Bravery',
        HypeSquadOnlineHouse2: '🟢 Brilliance',
        HypeSquadOnlineHouse3: '🟡 Balance',
        PremiumEarlySupporter: '👑 داعم مبكر',
        VerifiedDeveloper: '✅ مطور موثق',
        ActiveDeveloper: '🛠️ مطور نشط',
        CertifiedModerator: '🛡️ مشرف معتمد',
    };

    const userBadges = flags.map(f => badgeMap[f]).filter(Boolean);
    return userBadges.length > 0 ? userBadges.join('\n') : null;
}
