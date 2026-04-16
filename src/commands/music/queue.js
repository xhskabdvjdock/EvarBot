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
        const tracks = queue.tracks.toArray();
        const page = (interaction.options.getInteger('page') || 1) - 1;
        const perPage = 10;
        const totalPages = Math.max(1, Math.ceil(tracks.length / perPage));
        const start = page * perPage;
        const pageTracks = tracks.slice(start, start + perPage);

        const embed = new EmbedBuilder()
            .setColor('#5865f2')
            .setTitle('📋 قائمة الأغاني')
            .setDescription(`🎵 **يشتغل الحين:** [${current.title}](${current.url}) • \`${current.duration || 'مباشر'}\`\n\n` +
                (pageTracks.length > 0
                    ? pageTracks.map((t, i) =>
                        `**${start + i + 1}.** [${t.title}](${t.url}) • \`${t.duration || 'مباشر'}\``
                    ).join('\n')
                    : '`القائمة فارغة`'))
            .setFooter({ text: `📄 صفحة ${page + 1}/${totalPages} • ${tracks.length} أغنية بالقائمة` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};

function err(msg) { return new EmbedBuilder().setColor('#ed4245').setDescription(`❌ ${msg}`); }
