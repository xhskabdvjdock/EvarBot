const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('🔇 إسكات عضو (Timeout)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(opt =>
            opt.setName('user')
                .setDescription('العضو المراد إسكاته')
                .setRequired(true),
        )
        .addStringOption(opt =>
            opt.setName('duration')
                .setDescription('مدة الإسكات')
                .setRequired(true)
                .addChoices(
                    { name: '60 ثانية', value: '60' },
                    { name: '5 دقائق', value: '300' },
                    { name: '10 دقائق', value: '600' },
                    { name: '30 دقيقة', value: '1800' },
                    { name: 'ساعة', value: '3600' },
                    { name: '6 ساعات', value: '21600' },
                    { name: '12 ساعة', value: '43200' },
                    { name: 'يوم', value: '86400' },
                    { name: '3 أيام', value: '259200' },
                    { name: 'أسبوع', value: '604800' },
                    { name: 'إلغاء الإسكات', value: '0' },
                ),
        )
        .addStringOption(opt =>
            opt.setName('reason')
                .setDescription('سبب الإسكات')
                .setRequired(false),
        ),

    async execute(interaction, client) {
        const target = interaction.options.getMember('user');
        const duration = parseInt(interaction.options.getString('duration'));
        const reason = interaction.options.getString('reason') || 'لم يتم تحديد سبب';

        if (!target) {
            return interaction.reply({ embeds: [errorEmbed(client, 'العضو مو موجود في السيرفر!')], flags: MessageFlags.Ephemeral });
        }

        if (target.id === interaction.user.id) {
            return interaction.reply({ embeds: [errorEmbed(client, 'ما تقدر تسكت نفسك! 😅')], flags: MessageFlags.Ephemeral });
        }

        if (target.id === client.user.id) {
            return interaction.reply({ embeds: [errorEmbed(client, 'ما تقدر تسكتني! 😤')], flags: MessageFlags.Ephemeral });
        }

        if (!target.moderatable) {
            return interaction.reply({ embeds: [errorEmbed(client, 'ما أقدر أسكت هذا العضو! رتبته أعلى مني.')], flags: MessageFlags.Ephemeral });
        }

        if (interaction.member.roles.highest.position <= target.roles.highest.position) {
            return interaction.reply({ embeds: [errorEmbed(client, 'ما تقدر تسكت عضو رتبته أعلى أو تساوي رتبتك!')], flags: MessageFlags.Ephemeral });
        }

        try {
            // إلغاء الإسكات
            if (duration === 0) {
                await target.timeout(null, reason);

                const embed = new EmbedBuilder()
                    .setColor(client.config.successColor)
                    .setTitle('🔊 تم إلغاء الإسكات')
                    .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
                    .addFields(
                        { name: '👤 العضو', value: `${target.user.tag}`, inline: true },
                        { name: '👮 بواسطة', value: `${interaction.user.tag}`, inline: true },
                        { name: '📋 السبب', value: reason },
                    )
                    .setTimestamp();

                return interaction.reply({ embeds: [embed] });
            }

            // تنفيذ الإسكات
            await target.timeout(duration * 1000, reason);

            const durationText = formatDuration(duration);

            // DM
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor(client.config.warnColor)
                    .setTitle(`🔇 تم إسكاتك في ${interaction.guild.name}`)
                    .addFields(
                        { name: '⏱️ المدة', value: durationText },
                        { name: '📋 السبب', value: reason },
                        { name: '👮 بواسطة', value: interaction.user.tag },
                    )
                    .setTimestamp();
                await target.send({ embeds: [dmEmbed] });
            } catch (err) { /* الخاص مقفل */ }

            const embed = new EmbedBuilder()
                .setColor(client.config.warnColor)
                .setTitle('🔇 تم إسكات العضو')
                .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: '👤 العضو', value: `${target.user.tag}`, inline: true },
                    { name: '👮 بواسطة', value: `${interaction.user.tag}`, inline: true },
                    { name: '⏱️ المدة', value: durationText, inline: true },
                    { name: '📋 السبب', value: reason },
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (err) {
            await interaction.reply({ embeds: [errorEmbed(client, `فشل الإسكات: ${err.message}`)], flags: MessageFlags.Ephemeral });
        }
    },
};

function formatDuration(seconds) {
    if (seconds < 60) return `${seconds} ثانية`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} دقيقة`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} ساعة`;
    return `${Math.floor(seconds / 86400)} يوم`;
}

function errorEmbed(client, message) {
    return new EmbedBuilder()
        .setColor(client.config.errorColor)
        .setDescription(`❌ ${message}`)
        .setTimestamp();
}
