const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { getGuildData, updateGuildData } = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('⚠️ إعطاء تحذير لعضو')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(opt =>
            opt.setName('user')
                .setDescription('العضو المراد تحذيره')
                .setRequired(true),
        )
        .addStringOption(opt =>
            opt.setName('reason')
                .setDescription('سبب التحذير')
                .setRequired(true),
        ),

    async execute(interaction, client) {
        const target = interaction.options.getMember('user');
        const reason = interaction.options.getString('reason');

        if (!target) {
            return interaction.reply({ embeds: [errorEmbed(client, 'العضو مو موجود في السيرفر!')], flags: MessageFlags.Ephemeral });
        }

        if (target.user.bot) {
            return interaction.reply({ embeds: [errorEmbed(client, 'ما تقدر تحذر بوت!')], flags: MessageFlags.Ephemeral });
        }

        if (target.id === interaction.user.id) {
            return interaction.reply({ embeds: [errorEmbed(client, 'ما تقدر تحذر نفسك!')], flags: MessageFlags.Ephemeral });
        }

        // حفظ التحذير
        const guildData = getGuildData(interaction.guild.id);
        if (!guildData.warnings) guildData.warnings = {};
        if (!guildData.warnings[target.id]) guildData.warnings[target.id] = [];

        const warning = {
            id: Date.now().toString(36),
            reason: reason,
            moderator: interaction.user.id,
            moderatorTag: interaction.user.tag,
            date: new Date().toISOString(),
        };

        guildData.warnings[target.id].push(warning);
        updateGuildData(interaction.guild.id, 'warnings', guildData.warnings);

        const warnCount = guildData.warnings[target.id].length;

        // DM
        try {
            const dmEmbed = new EmbedBuilder()
                .setColor(client.config.warnColor)
                .setTitle(`⚠️ تحذير في ${interaction.guild.name}`)
                .addFields(
                    { name: '📋 السبب', value: reason },
                    { name: '👮 بواسطة', value: interaction.user.tag },
                    { name: '📊 إجمالي التحذيرات', value: `${warnCount}` },
                )
                .setTimestamp();
            await target.send({ embeds: [dmEmbed] });
        } catch (err) { /* الخاص مقفل */ }

        const embed = new EmbedBuilder()
            .setColor(client.config.warnColor)
            .setTitle('⚠️ تم تحذير العضو')
            .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '👤 العضو', value: `${target.user.tag}`, inline: true },
                { name: '👮 بواسطة', value: `${interaction.user.tag}`, inline: true },
                { name: '📊 إجمالي التحذيرات', value: `${warnCount}`, inline: true },
                { name: '📋 السبب', value: reason },
                { name: '🔑 رقم التحذير', value: `\`${warning.id}\`` },
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};

function errorEmbed(client, message) {
    return new EmbedBuilder()
        .setColor(client.config.errorColor)
        .setDescription(`❌ ${message}`)
        .setTimestamp();
}
