const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getQueue, llSkip } = require('../../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('⏭️ تخطي الأغنية الحالية'),

    async execute(interaction) {
        const queue = getQueue(interaction.guildId);
        if (!queue) {
            return interaction.reply({ embeds: [err('ما في شي يشتغل!')], flags: MessageFlags.Ephemeral });
        }

        const current = queue.currentTrack;
        await llSkip(interaction.guildId);

        await interaction.reply({
            embeds: [new EmbedBuilder().setColor('#43b581').setDescription(`⏭️ تم تخطي **${current?.title || 'الأغنية'}**`)],
        });
    },
};

function err(msg) { return new EmbedBuilder().setColor('#ed4245').setDescription(`❌ ${msg}`); }
