const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const { getQueue, llPlay } = require('../../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('🎵 تشغيل أغنية')
        .addStringOption(opt =>
            opt.setName('query').setDescription('اسم الأغنية أو رابط').setRequired(true)),

    async execute(interaction) {
        const channel = interaction.member.voice.channel;
        if (!channel) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor('#ed4245').setDescription('❌ لازم تكون في روم صوتي!')],
                flags: MessageFlags.Ephemeral,
            });
        }

        if (![ChannelType.GuildVoice, ChannelType.GuildStageVoice].includes(channel.type)) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor('#ed4245').setDescription('❌ نوع الروم الصوتي غير مدعوم.')],
                flags: MessageFlags.Ephemeral,
            });
        }

        const botMember = interaction.guild?.members?.me;
        if (!botMember) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor('#ed4245').setDescription('❌ ما قدرت أجيب بيانات البوت داخل السيرفر.')],
                flags: MessageFlags.Ephemeral,
            });
        }

        const permissions = channel.permissionsFor(botMember);
        const missingPermissions = [];
        if (!permissions?.has(PermissionFlagsBits.ViewChannel)) missingPermissions.push('`View Channel`');
        if (!permissions?.has(PermissionFlagsBits.Connect)) missingPermissions.push('`Connect`');
        if (!permissions?.has(PermissionFlagsBits.Speak)) missingPermissions.push('`Speak`');

        if (missingPermissions.length) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#ed4245')
                        .setDescription(`❌ ما أقدر أدخل الروم الصوتي.\n🔐 الصلاحيات الناقصة: ${missingPermissions.join(', ')}`),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        const query = interaction.options.getString('query');
        try {
            await interaction.deferReply();
        } catch (error) {
            const code = error?.code || error?.rawError?.code;
            if (code === 10062 || code === 40060) {
                // Interaction expired/already acknowledged; stop silently to avoid crash loops.
                return;
            }
            throw error;
        }

        try {
            const result = await llPlay(
                interaction.client,
                interaction.guildId,
                channel.id,
                interaction.channel,
                query,
                interaction.user
            );

            await interaction.editReply({
                embeds: [new EmbedBuilder().setColor('#5865f2').setDescription(`✅ تمت الإضافة: **${result.track?.title || query}**`)],
            });
        } catch (err) {
            console.error('❌ Music play error:', err);
            const msg = String(err?.message || '');
            const isLavalink = msg.includes('Lavalink غير متاح');
            try {
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#ed4245')
                            .setDescription(
                                isLavalink
                                    ? `❌ ${msg.slice(0, 300)}\n\n🔧 افتح الداشبورد > إعداد Lavalink (الموسيقى) > اختبر الاتصال ثم احفظ.`
                                    : `❌ فشل التشغيل: ${msg.slice(0, 300)}`
                            ),
                    ],
                });
            } catch (editError) {
                const code = editError?.code || editError?.rawError?.code;
                if (code !== 10062 && code !== 40060) {
                    console.error('❌ فشل تعديل رد play:', editError);
                }
            }
        }
    },
};
