const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getQueue } = require('../../utils/musicPlayer');

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
        if (queue.size > 0) {
            const skipped = queue.node.skip();
            if (!skipped) {
                return interaction.reply({ embeds: [err('ما قدرت أتخطى الأغنية الحالية!')], flags: MessageFlags.Ephemeral });
            }
        } else {
            queue.delete();
        }

        await interaction.reply({
            embeds: [new EmbedBuilder().setColor('#43b581').setDescription(`⏭️ تم تخطي **${current?.name || 'الأغنية'}**`)],
        });
    },
};

function err(msg) { return new EmbedBuilder().setColor('#ed4245').setDescription(`❌ ${msg}`); }
