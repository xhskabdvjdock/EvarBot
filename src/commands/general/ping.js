const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('🏓 اعرف سرعة استجابة البوت'),

    async execute(interaction, client) {
        const sent = await interaction.deferReply({ fetchReply: true });
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        const apiLatency = Math.round(client.ws.ping);

        const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setTitle('🏓 Pong!')
            .addFields(
                { name: '📡 سرعة الاستجابة', value: `\`${latency}ms\``, inline: true },
                { name: '🌐 سرعة الـ API', value: `\`${apiLatency}ms\``, inline: true },
            )
            .setFooter({ text: `طلب من ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },
};
