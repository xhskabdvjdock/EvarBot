const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getQueue } = require('../../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shuffle')
        .setDescription('🔀 خلط القائمة'),

    async execute(interaction) {
        const queue = getQueue(interaction.guildId);
        if (!queue) {
            return interaction.reply({ embeds: [err('ما في شي يشتغل!')], flags: MessageFlags.Ephemeral });
        }

        if (queue.size < 2) {
            return interaction.reply({ embeds: [err('لازم يكون أكثر من أغنيتين بالقائمة!')], flags: MessageFlags.Ephemeral });
        }

        queue.enableShuffle(false);

        await interaction.reply({
            embeds: [new EmbedBuilder().setColor('#43b581').setDescription(`🔀 تم خلط **${queue.size}** أغنية!`)],
        });
    },
};

function err(msg) { return new EmbedBuilder().setColor('#ed4245').setDescription(`❌ ${msg}`); }
