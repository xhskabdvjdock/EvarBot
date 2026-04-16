const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    MessageFlags,
} = require('discord.js');

/** أوامر مرتبة حسب القسم — نص عربي نظيف بدون إيموجي */
const SECTIONS = {
    overview: {
        menuLabel: 'نظرة عامة',
        menuHint: 'مقدمة، إحصائيات، استخدام الأوامر',
        build: (client, interaction) => {
            const guilds = client.guilds.cache.size;
            const members = client.guilds.cache.reduce((n, g) => n + (g.memberCount || 0), 0);
            return new EmbedBuilder()
                .setColor(client.config.embedColor)
                .setAuthor({
                    name: client.user.username,
                    iconURL: client.user.displayAvatarURL({ size: 128 }),
                })
                .setTitle('مركز المساعدة')
                .setDescription(
                    [
                        'هذا البوت يجمع أوامر الإدارة، الموسيقى، المستويات، التذاكر، السجلات، وأدوات أخرى.',
                        '',
                        '**كيفية الاستخدام**',
                        '• اكتب `/` في أي قناة نصية واختر الأمر من القائمة، أو اكتب جزءًا من اسمه.',
                        '• استخدم القائمة أدناه للتنقل بين الأقسام.',
                        '• يمكنك فتح قسم مباشرة عبر الخيار `section` في نفس الأمر.',
                        '',
                        `**إحصائيات سريعة** — سيرفرات: \`${guilds}\` — أعضاء (تقريبي): \`${members.toLocaleString('ar-SA')}\``,
                    ].join('\n')
                )
                .addFields(
                    {
                        name: 'صلاحيات',
                        value: 'بعض الأوامر تتطلب صلاحيات إدارية في السيرفر أو في القناة. إن رفض البوت التنفيذ، راجع صلاحيات الرتبة والقناة.',
                        inline: false,
                    },
                    {
                        name: 'روابط',
                        value: '[لوحة تطبيقات Discord](https://discord.com/developers/applications) · [مركز مساعدة Discord](https://support.discord.com)',
                        inline: false,
                    }
                )
                .setFooter({
                    text: `طلب المساعدة: ${interaction.user.tag}`,
                })
                .setTimestamp();
        },
    },
    music: {
        menuLabel: 'الموسيقى',
        menuHint: 'تشغيل، قائمة، صوت، تكرار',
        build: (client, interaction) =>
            sectionEmbed(client, interaction, 'الموسيقى', [
                '`/play` — تشغيل (بحث نصي أو رابط). يتطلب وجودك في روم صوتي.',
                '`/skip` — تخطي التشغيل الحالي.',
                '`/stop` — إيقاف كامل ومسح القائمة.',
                '`/pause` — إيقاف مؤقت أو استئناف.',
                '`/queue` — عرض قائمة الانتظار (يدعم الصفحات).',
                '`/nowplaying` — ما يُشغَّل الآن.',
                '`/volume` — ضبط مستوى الصوت.',
                '`/seek` — الانتقال إلى وقت داخل المقطع.',
                '`/loop` — وضع التكرار (معطّل / أغنية / قائمة).',
                '`/shuffle` — خلط ترتيب القائمة.',
            ]),
    },
    moderation: {
        menuLabel: 'الإشراف',
        menuHint: 'حظر، طرد، إسكات، تحذيرات',
        build: (client, interaction) =>
            sectionEmbed(client, interaction, 'الإشراف', [
                '`/ban` — حظر عضو.',
                '`/kick` — طرد عضو.',
                '`/timeout` — إسكات مؤقت.',
                '`/clear` — حذف عدد من الرسائل في القناة.',
                '`/warn` — إصدار تحذير.',
                '`/warnings` — عرض تحذيرات العضو.',
                '`/unban` — رفع الحظر عن مستخدم.',
            ]),
    },
    leveling: {
        menuLabel: 'المستويات',
        menuHint: 'خبرة، لوحة، إعدادات',
        build: (client, interaction) =>
            sectionEmbed(client, interaction, 'المستويات والخبرة', [
                '`/rank` — بطاقة المستوى.',
                '`/leaderboard` — ترتيب الأعضاء.',
                '`/xp` — إدارة الخبرة (صلاحيات إدارية).',
                '`/levelsettings` — ضبط نظام المستويات.',
            ]),
    },
    fun: {
        menuLabel: 'معلومات وترفيه',
        menuHint: 'مستخدم، سيرفر، ألعاب بسيطة',
        build: (client, interaction) =>
            sectionEmbed(client, interaction, 'معلومات وترفيه', [
                '`/userinfo` — معلومات مستخدم.',
                '`/serverinfo` — معلومات السيرفر.',
                '`/avatar` — عرض صورة المستخدم.',
                '`/8ball` — إجابة عشوائية.',
                '`/coinflip` — رمي عملة.',
                '`/roll` — رمي نرد.',
                '`/rps` — حجر ورقة مقص.',
                '`/joke` — نكتة.',
                '`/meme` — صورة ميم.',
            ]),
    },
    community: {
        menuLabel: 'تذاكر وأدوار وترحيب',
        menuHint: 'تذاكر، رولات، ترحيب',
        build: (client, interaction) =>
            sectionEmbed(client, interaction, 'تذاكر، أدوار، ترحيب', [
                '`/ticket` — إعداد وإدارة نظام التذاكر.',
                '`/autorole` — أدوار تلقائية عند الانضمام.',
                '`/reactionrole` — أدوار عبر التفاعل.',
                '`/welcome` — رسائل الترحيب والمغادرة.',
            ]),
    },
    tools: {
        menuLabel: 'أدوات وسجلات وذكاء',
        menuHint: 'سجلات، تضمين، ذكاء، اتصال',
        build: (client, interaction) =>
            sectionEmbed(client, interaction, 'أدوات، سجلات، ذكاء اصطناعي', [
                '`/logs` — توجيه أحداث السيرفر إلى قنوات.',
                '`/embed` — إنشاء رسائل مدمجة منسّقة.',
                '`/ai` — محادثة نصية (يتطلب ضبط مفتاح الخدمة في البيئة).',
                '`/ping` — قياس زمن الاستجابة والاتصال.',
            ]),
    },
};

function sectionEmbed(client, interaction, title, lines) {
    return new EmbedBuilder()
        .setColor(client.config.embedColor)
        .setTitle(title)
        .setDescription(lines.join('\n'))
        .addFields({
            name: 'ملاحظة',
            value: 'الأوامر المعروضة قد تتطلب صلاحيات أو شروطًا إضافية (مثل الروم الصوتي للموسيقى).',
            inline: false,
        })
        .setFooter({ text: `${interaction.user.tag} — استخدم القائمة للتنقل بين الأقسام` })
        .setTimestamp();
}

function buildSelectMenu(currentValue, disabled) {
    return new StringSelectMenuBuilder()
        .setCustomId('help_nav')
        .setPlaceholder(disabled ? 'انتهت مهلة التفاعل مع القائمة' : 'اختر قسمًا…')
        .setDisabled(disabled)
        .addOptions(
            Object.entries(SECTIONS).map(([value, meta]) => ({
                label: meta.menuLabel.slice(0, 100),
                description: meta.menuHint.slice(0, 100),
                value,
                default: value === currentValue,
            }))
        );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('مركز المساعدة: تصفّح أوامر البوت حسب القسم')
        .addStringOption((opt) =>
            opt
                .setName('section')
                .setDescription('فتح قسم محدد مباشرة')
                .setRequired(false)
                .addChoices(
                    { name: 'نظرة عامة', value: 'overview' },
                    { name: 'الموسيقى', value: 'music' },
                    { name: 'الإشراف', value: 'moderation' },
                    { name: 'المستويات', value: 'leveling' },
                    { name: 'معلومات وترفيه', value: 'fun' },
                    { name: 'تذاكر وأدوار وترحيب', value: 'community' },
                    { name: 'أدوات وسجلات وذكاء', value: 'tools' }
                )
        ),

    async execute(interaction, client) {
        const direct = interaction.options.getString('section');
        const initialKey = direct && SECTIONS[direct] ? direct : 'overview';
        let lastSection = initialKey;

        const embed = SECTIONS[initialKey].build(client, interaction);
        const row = new ActionRowBuilder().addComponents(buildSelectMenu(initialKey, false));

        await interaction.reply({
            embeds: [embed],
            components: [row],
            flags: MessageFlags.Ephemeral,
        });

        const message = await interaction.fetchReply();
        const collector = message.createMessageComponentCollector({
            filter: (i) => i.user.id === interaction.user.id && i.customId === 'help_nav',
            time: 300_000,
        });

        collector.on('collect', async (i) => {
            const key = i.values[0];
            if (!SECTIONS[key]) return;
            lastSection = key;
            await i.update({
                embeds: [SECTIONS[key].build(client, interaction)],
                components: [new ActionRowBuilder().addComponents(buildSelectMenu(key, false))],
            });
        });

        collector.on('end', async () => {
            try {
                await interaction.editReply({
                    components: [new ActionRowBuilder().addComponents(buildSelectMenu(lastSection, true))],
                });
            } catch {
                /* تجاهل */
            }
        });
    },
};
