const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getGuildData } = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('🏆 عرض ليدربورد المستويات')
        .addIntegerOption(opt =>
            opt.setName('page')
                .setDescription('رقم الصفحة')
                .setRequired(false)
                .setMinValue(1),
        ),

    async execute(interaction, client) {
        const guildData = getGuildData(interaction.guild.id);

        if (!guildData.leveling?.enabled) {
            const embed = new EmbedBuilder()
                .setColor(client.config.errorColor)
                .setDescription('❌ نظام المستويات مو مفعّل!')
                .setTimestamp();
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        const levels = guildData.levels || {};
        const sorted = Object.entries(levels)
            .map(([id, data]) => ({ id, ...data }))
            .sort((a, b) => (b.totalXp || 0) - (a.totalXp || 0));

        if (sorted.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(client.config.warnColor)
                .setDescription('⚠️ ما في أحد في الليدربورد بعد!')
                .setTimestamp();
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        const perPage = 10;
        const page = (interaction.options.getInteger('page') || 1) - 1;
        const maxPage = Math.ceil(sorted.length / perPage);
        const currentPage = Math.min(page, maxPage - 1);
        const start = currentPage * perPage;
        const pageData = sorted.slice(start, start + perPage);

        const medals = ['🥇', '🥈', '🥉'];

        const leaderboard = await Promise.all(pageData.map(async (entry, i) => {
            const rank = start + i + 1;
            const medal = medals[rank - 1] || `\`#${rank}\``;
            let username = 'مستخدم غير معروف';
            try {
                const user = await client.users.fetch(entry.id);
                username = user.displayName || user.username;
            } catch (err) { /* */ }

            const xpNeeded = 5 * Math.pow(entry.level, 2) + 50 * entry.level + 100;
            const progress = Math.floor(((entry.xp || 0) / xpNeeded) * 100);

            return `${medal} **${username}**\n   ⭐ مستوى **${entry.level}** • ✨ ${(entry.totalXp || 0).toLocaleString()} XP • 📈 ${progress}%`;
        }));

        const embed = new EmbedBuilder()
            .setColor('#ffd700')
            .setTitle(`🏆 ليدربورد المستويات — ${interaction.guild.name}`)
            .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 256 }))
            .setDescription(leaderboard.join('\n\n'))
            .setFooter({ text: `صفحة ${currentPage + 1} / ${maxPage} • إجمالي ${sorted.length} عضو` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
