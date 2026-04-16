const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('🔓 فك حظر عضو')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addStringOption(opt =>
            opt.setName('userid')
                .setDescription('آيدي العضو المحظور')
                .setRequired(true),
        )
        .addStringOption(opt =>
            opt.setName('reason')
                .setDescription('سبب فك الحظر')
                .setRequired(false),
        ),

    async execute(interaction, client) {
        const userId = interaction.options.getString('userid');
        const reason = interaction.options.getString('reason') || 'لم يتم تحديد سبب';

        // تحقق إنه آيدي صحيح
        if (!/^\d{17,20}$/.test(userId)) {
            return interaction.reply({
                embeds: [errorEmbed(client, 'الآيدي مو صحيح! لازم يكون أرقام فقط.')],
                flags: MessageFlags.Ephemeral,
            });
        }

        try {
            const banList = await interaction.guild.bans.fetch();
            const bannedUser = banList.get(userId);

            if (!bannedUser) {
                return interaction.reply({
                    embeds: [errorEmbed(client, 'هذا العضو مو محظور!')],
                    flags: MessageFlags.Ephemeral,
                });
            }

            await interaction.guild.members.unban(userId, reason);

            const embed = new EmbedBuilder()
                .setColor(client.config.successColor)
                .setTitle('🔓 تم فك الحظر')
                .setThumbnail(bannedUser.user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: '👤 العضو', value: `${bannedUser.user.tag} (${userId})`, inline: true },
                    { name: '👮 بواسطة', value: `${interaction.user.tag}`, inline: true },
                    { name: '📋 السبب', value: reason },
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (err) {
            await interaction.reply({ embeds: [errorEmbed(client, `فشل فك الحظر: ${err.message}`)], flags: MessageFlags.Ephemeral });
        }
    },
};

function errorEmbed(client, message) {
    return new EmbedBuilder()
        .setColor(client.config.errorColor)
        .setDescription(`❌ ${message}`)
        .setTimestamp();
}
