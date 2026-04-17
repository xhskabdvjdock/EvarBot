const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getQueue } = require('../../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('📋 عرض قائمة الأغاني')
        .addIntegerOption(opt =>
            opt.setName('page').setDescription('رقم الصفحة').setRequired(false).setMinValue(1)),

    async execute(interaction) {
        const queue = getQueue(interaction.guildId);
        if (!queue) {
            return interaction.reply({ embeds: [err('ما في شي يشتغل!')], flags: MessageFlags.Ephemeral });
        }

        const current = queue.currentTrack;
        if (!current) {
            return interaction.reply({ embeds: [err('ما في أغنية حالية!')], flags: MessageFlags.Ephemeral });
        }
        const tracks = queue.tracks || [];
        const page = (interaction.options.getInteger('page') || 1) - 1;
        const perPage = 10;
        const totalPages = Math.max(1, Math.ceil(tracks.length / perPage));
        const start = page * perPage;
        const pageTracks = tracks.slice(start, start + perPage);

        const embed = new EmbedBuilder()
            .setColor('#5865f2')
            .setTitle('📋 قائمة الأغاني')
            .setDescription(`🎵 **يشتغل الحين:** ${current.url ? `[${current.title}](${current.url})` : current.title} • \`${formatMs(current.durationMs)}\`\n\n` +
                (pageTracks.length > 0
                    ? pageTracks.map((t, i) =>
                        `**${start + i + 1}.** ${t.url ? `[${t.title}](${t.url})` : t.title} • \`${formatMs(t.durationMs)}\``
                    ).join('\n')
                    : '`القائمة فارغة`'))
            .setFooter({ text: `📄 صفحة ${page + 1}/${totalPages} • ${tracks.length} أغنية بالقائمة` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};

function formatMs(ms) {
    if (!ms || ms <= 0) return 'مباشر';
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, '0')}`;
}

function err(msg) { return new EmbedBuilder().setColor('#ed4245').setDescription(`❌ ${msg}`); }
