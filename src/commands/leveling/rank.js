const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getGuildData } = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('📊 عرض مستواك أو مستوى عضو آخر')
        .addUserOption(opt =>
            opt.setName('user')
                .setDescription('العضو (اختياري)')
                .setRequired(false),
        ),

    async execute(interaction, client) {
        const target = interaction.options.getUser('user') || interaction.user;
        const guildData = getGuildData(interaction.guild.id);

        if (!guildData.leveling?.enabled) {
            const embed = new EmbedBuilder()
                .setColor(client.config.errorColor)
                .setDescription('❌ نظام المستويات مو مفعّل في هذا السيرفر!')
                .setTimestamp();
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        const userData = guildData.levels?.[target.id];

        if (!userData) {
            const embed = new EmbedBuilder()
                .setColor(client.config.warnColor)
                .setDescription(`⚠️ **${target.username}** ما عنده أي XP بعد!`)
                .setTimestamp();
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        const level = userData.level;
        const xp = userData.xp;
        const xpNeeded = 5 * Math.pow(level, 2) + 50 * level + 100;
        const progress = Math.floor((xp / xpNeeded) * 100);

        // شريط التقدم
        const barLength = 20;
        const filled = Math.round((progress / 100) * barLength);
        const empty = barLength - filled;
        const progressBar = '█'.repeat(filled) + '░'.repeat(empty);

        // الترتيب
        const allUsers = Object.entries(guildData.levels || {})
            .map(([id, data]) => ({ id, totalXp: data.totalXp || 0 }))
            .sort((a, b) => b.totalXp - a.totalXp);
        const rank = allUsers.findIndex(u => u.id === target.id) + 1;

        const embed = new EmbedBuilder()
            .setColor('#5865f2')
            .setAuthor({
                name: `📊 مستوى ${target.displayName || target.username}`,
                iconURL: target.displayAvatarURL({ dynamic: true }),
            })
            .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                {
                    name: '🏆 الترتيب',
                    value: `#${rank}`,
                    inline: true,
                },
                {
                    name: '⭐ المستوى',
                    value: `${level}`,
                    inline: true,
                },
                {
                    name: '💬 الرسائل',
                    value: `${userData.messages || 0}`,
                    inline: true,
                },
                {
                    name: `📈 التقدم — ${progress}%`,
                    value: `\`${progressBar}\`\n**${xp.toLocaleString()}** / **${xpNeeded.toLocaleString()}** XP`,
                    inline: false,
                },
                {
                    name: '✨ إجمالي XP',
                    value: `${(userData.totalXp || 0).toLocaleString()}`,
                    inline: true,
                },
            )
            .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
