const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');

const CHOICES = {
    rock: { emoji: '🪨', name: 'حجر', beats: 'scissors' },
    paper: { emoji: '📄', name: 'ورقة', beats: 'rock' },
    scissors: { emoji: '✂️', name: 'مقص', beats: 'paper' },
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rps')
        .setDescription('✊ حجر ورقة مقص'),

    async execute(interaction, client) {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('rps_rock').setLabel('🪨 حجر').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('rps_paper').setLabel('📄 ورقة').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('rps_scissors').setLabel('✂️ مقص').setStyle(ButtonStyle.Secondary),
        );

        const embed = new EmbedBuilder()
            .setColor('#5865f2')
            .setTitle('✊ حجر ورقة مقص!')
            .setDescription('اختر سلاحك! ⬇️')
            .setTimestamp();

        const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

        const filter = (i) => i.user.id === interaction.user.id && i.customId.startsWith('rps_');

        try {
            const response = await msg.awaitMessageComponent({ filter, time: 15000 });

            const userChoice = response.customId.replace('rps_', '');
            const botChoice = Object.keys(CHOICES)[Math.floor(Math.random() * 3)];

            const user = CHOICES[userChoice];
            const bot = CHOICES[botChoice];

            let result, color;
            if (userChoice === botChoice) {
                result = '🤝 تعادل!';
                color = '#faa61a';
            } else if (user.beats === botChoice) {
                result = '🎉 فزت!';
                color = '#43b581';
            } else {
                result = '😢 خسرت!';
                color = '#ed4245';
            }

            const resultEmbed = new EmbedBuilder()
                .setColor(color)
                .setTitle('✊ حجر ورقة مقص — النتيجة!')
                .setDescription(`${result}`)
                .addFields(
                    { name: '🧑 أنت', value: `${user.emoji} ${user.name}`, inline: true },
                    { name: '🤖 البوت', value: `${bot.emoji} ${bot.name}`, inline: true },
                )
                .setFooter({ text: interaction.user.tag })
                .setTimestamp();

            await response.update({ embeds: [resultEmbed], components: [] });
        } catch {
            const timeoutEmbed = new EmbedBuilder()
                .setColor('#747f8d')
                .setDescription('⏰ انتهى الوقت! ما اخترت شي.')
                .setTimestamp();
            await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
        }
    },
};
