const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getQueue, llPause } = require('../../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('⏸️ إيقاف مؤقت / استكمال'),

    async execute(interaction) {
        const queue = getQueue(interaction.guildId);
        if (!queue) {
            return interaction.reply({ embeds: [err('ما في شي يشتغل!')], flags: MessageFlags.Ephemeral });
        }

        if (queue.paused) {
            await llPause(interaction.guildId, false);
            await interaction.reply({
                embeds: [new EmbedBuilder().setColor('#43b581').setDescription('▶️ تم الاستكمال!')],
            });
        } else {
            await llPause(interaction.guildId, true);
            await interaction.reply({
                embeds: [new EmbedBuilder().setColor('#faa61a').setDescription('⏸️ تم الإيقاف المؤقت')],
            });
        }
    },
};

function err(msg) { return new EmbedBuilder().setColor('#ed4245').setDescription(`❌ ${msg}`); }
