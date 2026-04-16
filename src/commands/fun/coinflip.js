const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('🪙 رمي عملة'),

    async execute(interaction, client) {
        const result = Math.random() < 0.5;

        const embed = new EmbedBuilder()
            .setColor(result ? '#ffd700' : '#c0c0c0')
            .setTitle('🪙 رمي العملة!')
            .setDescription(`النتيجة: **${result ? '👑 كتبة (Heads)!' : '🔢 صورة (Tails)!'}**`)
            .setFooter({ text: `رماها: ${interaction.user.tag}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
