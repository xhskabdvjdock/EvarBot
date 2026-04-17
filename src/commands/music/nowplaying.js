const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getQueue, QueueRepeatMode } = require('../../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('🎵 الأغنية الحالية'),

    async execute(interaction) {
        const queue = getQueue(interaction.guildId);
        if (!queue) {
            return interaction.reply({ embeds: [err('ما في شي يشتغل!')], flags: MessageFlags.Ephemeral });
        }

        const song = queue.currentTrack;
        if (!song) {
            return interaction.reply({ embeds: [err('ما في أغنية حالية!')], flags: MessageFlags.Ephemeral });
        }
        const loopModes = {
            [QueueRepeatMode.OFF]: '❌ مطفي',
            [QueueRepeatMode.TRACK]: '🔂 أغنية',
            [QueueRepeatMode.QUEUE]: '🔁 قائمة',
        };

        const embed = new EmbedBuilder()
            .setColor('#5865f2')
            .setTitle('🎵 يشتغل الحين')
            .setDescription(song.url ? `**[${song.title}](${song.url})**` : `**${song.title}**`)
            .addFields(
                { name: '👤 الفنان', value: song.author || 'غير معروف', inline: true },
                { name: '⏱️ المدة', value: song.durationMs ? `\`${Math.floor(song.durationMs / 60000)}:${Math.floor((song.durationMs % 60000) / 1000).toString().padStart(2, '0')}\`` : 'مباشر', inline: true },
                { name: '🔊 الصوت', value: `${queue.volume}%`, inline: true },
                { name: '🔁 التكرار', value: loopModes[queue.repeatMode] || '❌', inline: true },
                { name: '📋 بالقائمة', value: `${queue.size} أغنية`, inline: true },
                { name: '⏸️ الحالة', value: queue.paused ? '⏸️ متوقف' : '▶️ يشتغل', inline: true },
            )
            .setFooter({ text: `طلبه: ${song.requestedBy?.tag || song.requestedBy || 'غير معروف'}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};

function err(msg) { return new EmbedBuilder().setColor('#ed4245').setDescription(`❌ ${msg}`); }
