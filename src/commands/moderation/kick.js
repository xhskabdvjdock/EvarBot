const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('👢 طرد عضو من السيرفر')
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .addUserOption(opt =>
            opt.setName('user')
                .setDescription('العضو المراد طرده')
                .setRequired(true),
        )
        .addStringOption(opt =>
            opt.setName('reason')
                .setDescription('سبب الطرد')
                .setRequired(false),
        ),

    async execute(interaction, client) {
        const target = interaction.options.getMember('user');
        const reason = interaction.options.getString('reason') || 'لم يتم تحديد سبب';

        // تحقق إن العضو موجود
        if (!target) {
            return interaction.reply({ embeds: [errorEmbed(client, 'العضو مو موجود في السيرفر!')], flags: MessageFlags.Ephemeral });
        }

        // ما تقدر تطرد نفسك
        if (target.id === interaction.user.id) {
            return interaction.reply({ embeds: [errorEmbed(client, 'ما تقدر تطرد نفسك! 😅')], flags: MessageFlags.Ephemeral });
        }

        // ما تقدر تطرد البوت
        if (target.id === client.user.id) {
            return interaction.reply({ embeds: [errorEmbed(client, 'ما تقدر تطردني! 😤')], flags: MessageFlags.Ephemeral });
        }

        // تحقق من الصلاحيات
        if (!target.kickable) {
            return interaction.reply({ embeds: [errorEmbed(client, 'ما أقدر أطرد هذا العضو! رتبته أعلى مني.')], flags: MessageFlags.Ephemeral });
        }

        // تحقق إن رتبتك أعلى
        if (interaction.member.roles.highest.position <= target.roles.highest.position) {
            return interaction.reply({ embeds: [errorEmbed(client, 'ما تقدر تطرد عضو رتبته أعلى أو تساوي رتبتك!')], flags: MessageFlags.Ephemeral });
        }

        // إرسال رسالة خاصة للعضو قبل الطرد
        try {
            const dmEmbed = new EmbedBuilder()
                .setColor(client.config.warnColor)
                .setTitle(`👢 تم طردك من ${interaction.guild.name}`)
                .addFields(
                    { name: '📋 السبب', value: reason },
                    { name: '👮 بواسطة', value: interaction.user.tag },
                )
                .setTimestamp();
            await target.send({ embeds: [dmEmbed] });
        } catch (err) { /* الخاص مقفل */ }

        // تنفيذ الطرد
        try {
            await target.kick(reason);

            const embed = new EmbedBuilder()
                .setColor(client.config.successColor)
                .setTitle('👢 تم طرد العضو')
                .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: '👤 العضو', value: `${target.user.tag} (${target.id})`, inline: true },
                    { name: '👮 بواسطة', value: `${interaction.user.tag}`, inline: true },
                    { name: '📋 السبب', value: reason },
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (err) {
            await interaction.reply({ embeds: [errorEmbed(client, `فشل الطرد: ${err.message}`)], flags: MessageFlags.Ephemeral });
        }
    },
};

function errorEmbed(client, message) {
    return new EmbedBuilder()
        .setColor(client.config.errorColor)
        .setDescription(`❌ ${message}`)
        .setTimestamp();
}
