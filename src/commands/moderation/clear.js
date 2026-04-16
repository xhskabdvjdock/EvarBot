const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('🧹 حذف رسائل من القناة')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addIntegerOption(opt =>
            opt.setName('amount')
                .setDescription('عدد الرسائل المراد حذفها (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100),
        )
        .addUserOption(opt =>
            opt.setName('user')
                .setDescription('حذف رسائل عضو معين فقط (اختياري)')
                .setRequired(false),
        ),

    async execute(interaction, client) {
        const amount = interaction.options.getInteger('amount');
        const targetUser = interaction.options.getUser('user');

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            let deleted;

            if (targetUser) {
                // جلب الرسائل وفلترة حسب المستخدم
                const messages = await interaction.channel.messages.fetch({ limit: 100 });
                const userMessages = messages
                    .filter(m => m.author.id === targetUser.id)
                    .first(amount);

                deleted = await interaction.channel.bulkDelete(userMessages, true);
            } else {
                deleted = await interaction.channel.bulkDelete(amount, true);
            }

            const embed = new EmbedBuilder()
                .setColor(client.config.successColor)
                .setDescription(`🧹 تم حذف **${deleted.size}** رسالة${targetUser ? ` من ${targetUser.tag}` : ''}`)
                .setTimestamp();

            // رسالة مؤقتة
            const reply = await interaction.editReply({ embeds: [embed] });

            // حذف الرسالة بعد 5 ثواني
            setTimeout(() => {
                interaction.deleteReply().catch(() => { });
            }, 5000);

        } catch (err) {
            if (err.code === 50034) {
                const embed = new EmbedBuilder()
                    .setColor(client.config.errorColor)
                    .setDescription('❌ ما أقدر أحذف رسائل أقدم من 14 يوم!')
                    .setTimestamp();
                await interaction.editReply({ embeds: [embed] });
            } else {
                const embed = new EmbedBuilder()
                    .setColor(client.config.errorColor)
                    .setDescription(`❌ فشل حذف الرسائل: ${err.message}`)
                    .setTimestamp();
                await interaction.editReply({ embeds: [embed] });
            }
        }
    },
};
