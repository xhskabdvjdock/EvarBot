const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getQueue, llSetVolume } = require('../../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('🔊 تغيير مستوى الصوت')
        .addIntegerOption(opt =>
            opt.setName('level').setDescription('مستوى الصوت (1-100)').setRequired(true)
                .setMinValue(1).setMaxValue(100)),

    async execute(interaction) {
        const queue = getQueue(interaction.guildId);
        if (!queue) {
            return interaction.reply({ embeds: [err('ما في شي يشتغل!')], flags: MessageFlags.Ephemeral });
        }

        const vol = interaction.options.getInteger('level');
        await llSetVolume(interaction.guildId, vol);

        const bars = Math.round(vol / 10);
        const bar = '█'.repeat(bars) + '░'.repeat(10 - bars);

        await interaction.reply({
            embeds: [new EmbedBuilder().setColor('#5865f2').setDescription(`🔊 مستوى الصوت: **${vol}%**\n\`${bar}\``)],
        });
    },
};

function err(msg) { return new EmbedBuilder().setColor('#ed4245').setDescription(`❌ ${msg}`); }
