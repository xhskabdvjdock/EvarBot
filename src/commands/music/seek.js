const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getQueue, llSeek } = require('../../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('seek')
        .setDescription('⏩ القفز لوقت معين')
        .addStringOption(opt =>
            opt.setName('time').setDescription('الوقت (مثل: 1:30 أو 90)').setRequired(true)),

    async execute(interaction) {
        const queue = getQueue(interaction.guildId);
        if (!queue) {
            return interaction.reply({ embeds: [err('ما في شي يشتغل!')], flags: MessageFlags.Ephemeral });
        }

        const timeStr = interaction.options.getString('time');
        const seconds = parseTime(timeStr);

        if (seconds === null) {
            return interaction.reply({ embeds: [err('صيغة الوقت غلط! استخدم `1:30` أو `90`')], flags: MessageFlags.Ephemeral });
        }

        const durationMs = Number(queue.currentTrack?.durationMs || 0);
        if (durationMs > 0 && (seconds * 1000) >= durationMs) {
            return interaction.reply({ embeds: [err('الوقت أكبر من مدة الأغنية الحالية!')], flags: MessageFlags.Ephemeral });
        }

        await llSeek(interaction.guildId, seconds * 1000);

        await interaction.reply({
            embeds: [new EmbedBuilder().setColor('#5865f2').setDescription(`⏩ تم القفز لـ **${formatSec(seconds)}**`)],
        });
    },
};

function parseTime(str) {
    str = str.trim();
    if (str.includes(':')) {
        const parts = str.split(':').map(Number);
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) return parts[0] * 60 + parts[1];
        if (parts.length === 3 && parts.every(p => !isNaN(p))) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        return null;
    }
    const sec = parseInt(str);
    return isNaN(sec) ? null : sec;
}

function formatSec(s) {
    const m = Math.floor(s / 60);
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
}

function err(msg) { return new EmbedBuilder().setColor('#ed4245').setDescription(`❌ ${msg}`); }
