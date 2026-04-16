const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const { QueryType } = require('discord-player');
const { getPlayer, getQueue } = require('../../utils/musicPlayer');

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

        const queue = getQueue(interaction.guildId);
        if (queue?.channel && queue.channel.id !== channel.id) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor('#ed4245').setDescription(`❌ أنا شغال حاليًا في <#${queue.channel.id}>. ادخل نفس الروم أو استخدم /stop أولًا.`)],
                flags: MessageFlags.Ephemeral,
            });
        }

        const query = interaction.options.getString('query');
        const isUrl = /^https?:\/\//i.test(query);
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
            const player = getPlayer();
            if (!player) throw new Error('Music player not initialized');
            const playOptions = {
                requestedBy: interaction.user,
                queryType: isUrl ? QueryType.AUTO : QueryType.YOUTUBE_SEARCH,
                fallbackSearchEngine: QueryType.YOUTUBE_SEARCH,
                nodeOptions: {
                    metadata: { channel: interaction.channel, requestedBy: interaction.user },
                    leaveOnEmpty: true,
                    leaveOnEmptyCooldown: 300000,
                    leaveOnEnd: true,
                    leaveOnEndCooldown: 120000,
                    volume: 80,
                },
            };

            let result;
            try {
                result = await player.play(channel, query, playOptions);
            } catch (firstError) {
                const extractFailed = /extract stream/i.test(firstError?.message || '');
                if (!extractFailed) throw firstError;

                // Retry with strict YouTube search and first direct result URL.
                const search = await player.search(query, {
                    requestedBy: interaction.user,
                    searchEngine: QueryType.YOUTUBE_SEARCH,
                    fallbackSearchEngine: QueryType.YOUTUBE_SEARCH,
                });
                const retryTrack = search.tracks?.[0];
                if (!retryTrack) throw firstError;
                result = await player.play(channel, retryTrack.url, {
                    ...playOptions,
                    queryType: QueryType.YOUTUBE_VIDEO,
                    fallbackSearchEngine: QueryType.YOUTUBE_VIDEO,
                });
            }

            await interaction.editReply({
                embeds: [new EmbedBuilder().setColor('#5865f2').setDescription(`✅ تمت الإضافة: **${result.track?.title || query}**`)],
            });
        } catch (err) {
            console.error('❌ Music play error:', err);
            try {
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#ed4245')
                            .setDescription(`❌ فشل التشغيل: ${err.message?.slice(0, 200)}`),
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
