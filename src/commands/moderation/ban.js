const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('🔨 حظر عضو من السيرفر')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption(opt =>
            opt.setName('user')
                .setDescription('العضو المراد حظره')
                .setRequired(true),
        )
        .addStringOption(opt =>
            opt.setName('reason')
                .setDescription('سبب الحظر')
                .setRequired(false),
        )
        .addIntegerOption(opt =>
            opt.setName('days')
                .setDescription('حذف رسائل العضو (عدد الأيام)')
                .setRequired(false)
                .setMinValue(0)
                .setMaxValue(7),
        ),

    async execute(interaction, client) {
        const target = interaction.options.getMember('user');
        const targetUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'لم يتم تحديد سبب';
        const days = interaction.options.getInteger('days') || 0;

        if (targetUser.id === interaction.user.id) {
            return interaction.reply({ embeds: [errorEmbed(client, 'ما تقدر تحظر نفسك! 😅')], flags: MessageFlags.Ephemeral });
        }

        if (targetUser.id === client.user.id) {
            return interaction.reply({ embeds: [errorEmbed(client, 'ما تقدر تحظرني! 😤')], flags: MessageFlags.Ephemeral });
        }

        // إذا العضو في السيرفر، تحقق من الصلاحيات
        if (target) {
            if (!target.bannable) {
                return interaction.reply({ embeds: [errorEmbed(client, 'ما أقدر أحظر هذا العضو! رتبته أعلى مني.')], flags: MessageFlags.Ephemeral });
            }
            if (interaction.member.roles.highest.position <= target.roles.highest.position) {
                return interaction.reply({ embeds: [errorEmbed(client, 'ما تقدر تحظر عضو رتبته أعلى أو تساوي رتبتك!')], flags: MessageFlags.Ephemeral });
            }

            // DM قبل الحظر
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor(client.config.errorColor)
                    .setTitle(`🔨 تم حظرك من ${interaction.guild.name}`)
                    .addFields(
                        { name: '📋 السبب', value: reason },
                        { name: '👮 بواسطة', value: interaction.user.tag },
                    )
                    .setTimestamp();
                await target.send({ embeds: [dmEmbed] });
            } catch (err) { /* الخاص مقفل */ }
        }

        try {
            await interaction.guild.members.ban(targetUser.id, {
                reason: `${reason} | بواسطة: ${interaction.user.tag}`,
                deleteMessageSeconds: days * 86400,
            });

            const embed = new EmbedBuilder()
                .setColor(client.config.errorColor)
                .setTitle('🔨 تم حظر العضو')
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: '👤 العضو', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                    { name: '👮 بواسطة', value: `${interaction.user.tag}`, inline: true },
                    { name: '📋 السبب', value: reason },
                    { name: '🗑️ حذف الرسائل', value: days > 0 ? `${days} يوم` : 'لا', inline: true },
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (err) {
            await interaction.reply({ embeds: [errorEmbed(client, `فشل الحظر: ${err.message}`)], flags: MessageFlags.Ephemeral });
        }
    },
};

function errorEmbed(client, message) {
    return new EmbedBuilder()
        .setColor(client.config.errorColor)
        .setDescription(`❌ ${message}`)
        .setTimestamp();
}
