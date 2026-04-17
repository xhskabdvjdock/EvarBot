const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getQueue, QueueRepeatMode, llSetRepeatMode } = require('../../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('🔁 تغيير وضع التكرار')
        .addStringOption(opt =>
            opt.setName('mode').setDescription('وضع التكرار').setRequired(true)
                .addChoices(
                    { name: '❌ إيقاف', value: 'off' },
                    { name: '🔂 أغنية واحدة', value: 'track' },
                    { name: '🔁 القائمة كلها', value: 'queue' },
                )),

    async execute(interaction) {
        const queue = getQueue(interaction.guildId);
        if (!queue) {
            return interaction.reply({ embeds: [err('ما في شي يشتغل!')], flags: MessageFlags.Ephemeral });
        }

        const selected = interaction.options.getString('mode');
        const modeMap = {
            off: QueueRepeatMode.OFF,
            track: QueueRepeatMode.TRACK,
            queue: QueueRepeatMode.QUEUE,
        };
        const labels = {
            off: '❌ إيقاف التكرار',
            track: '🔂 تكرار الأغنية الحالية',
            queue: '🔁 تكرار القائمة كلها',
        };

        llSetRepeatMode(interaction.guildId, modeMap[selected]);

        await interaction.reply({
            embeds: [new EmbedBuilder().setColor('#5865f2').setDescription(labels[selected])],
        });
    },
};

function err(msg) { return new EmbedBuilder().setColor('#ed4245').setDescription(`❌ ${msg}`); }
