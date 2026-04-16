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
            [QueueRepeatMode.AUTOPLAY]: '♾️ تلقائي',
        };

        const embed = new EmbedBuilder()
            .setColor('#5865f2')
            .setTitle('🎵 يشتغل الحين')
            .setDescription(`**[${song.title}](${song.url})**`)
            .addFields(
                { name: '👤 الفنان', value: song.author || 'غير معروف', inline: true },
                { name: '⏱️ المدة', value: song.duration || 'مباشر', inline: true },
                { name: '🔊 الصوت', value: `${queue.node.volume}%`, inline: true },
                { name: '🔁 التكرار', value: loopModes[queue.repeatMode] || '❌', inline: true },
                { name: '📋 بالقائمة', value: `${queue.size} أغنية`, inline: true },
                { name: '⏸️ الحالة', value: queue.node.isPaused() ? '⏸️ متوقف' : '▶️ يشتغل', inline: true },
            )
            .setThumbnail(song.thumbnail || null)
            .setFooter({ text: `طلبه: ${song.requestedBy?.tag || 'غير معروف'}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};

function err(msg) { return new EmbedBuilder().setColor('#ed4245').setDescription(`❌ ${msg}`); }
