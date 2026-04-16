const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const DICE_EMOJI = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roll')
        .setDescription('🎲 رمي نرد')
        .addIntegerOption(opt =>
            opt.setName('sides').setDescription('عدد الأوجه (افتراضي: 6)').setRequired(false)
                .setMinValue(2).setMaxValue(100))
        .addIntegerOption(opt =>
            opt.setName('count').setDescription('عدد النردات (افتراضي: 1)').setRequired(false)
                .setMinValue(1).setMaxValue(10)),

    async execute(interaction, client) {
        const sides = interaction.options.getInteger('sides') || 6;
        const count = interaction.options.getInteger('count') || 1;

        const results = [];
        for (let i = 0; i < count; i++) {
            results.push(Math.floor(Math.random() * sides) + 1);
        }

        const total = results.reduce((a, b) => a + b, 0);
        const diceDisplay = results.map(r => sides === 6 ? DICE_EMOJI[r] : `**${r}**`).join(' ');

        const embed = new EmbedBuilder()
            .setColor('#5865f2')
            .setTitle('🎲 رمي النرد!')
            .setDescription(`${diceDisplay}`)
            .addFields(
                { name: '🎯 النتائج', value: results.join(' + '), inline: true },
                { name: '📊 المجموع', value: `**${total}**`, inline: true },
            )
            .setFooter({ text: `${count}d${sides} • رماه: ${interaction.user.tag}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
