const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('🖼️ عرض صورة عضو')
        .addUserOption(opt =>
            opt.setName('user').setDescription('العضو (افتراضي: أنت)').setRequired(false)),

    async execute(interaction, client) {
        const user = interaction.options.getUser('user') || interaction.user;

        const embed = new EmbedBuilder()
            .setColor('#5865f2')
            .setTitle(`🖼️ صورة ${user.tag}`)
            .setImage(user.displayAvatarURL({ dynamic: true, size: 1024 }))
            .addFields(
                {
                    name: '📎 روابط', value: [
                        `[PNG](${user.displayAvatarURL({ format: 'png', size: 1024 })})`,
                        `[JPG](${user.displayAvatarURL({ format: 'jpg', size: 1024 })})`,
                        `[WEBP](${user.displayAvatarURL({ format: 'webp', size: 1024 })})`,
                        user.avatar?.startsWith('a_') ? `[GIF](${user.displayAvatarURL({ format: 'gif', size: 1024 })})` : '',
                    ].filter(Boolean).join(' • ')
                },
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
