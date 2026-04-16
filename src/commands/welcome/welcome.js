const { SlashCommandBuilder,
    EmbedBuilder,
    ChannelType,
    PermissionFlagsBits,
    MessageFlags } = require('discord.js');
const { getGuildData, updateGuildData } = require('../../utils/database');
const { replacePlaceholders } = require('../../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('welcome')
        .setDescription('⚙️ إعداد نظام الترحيب والوداع')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

        // ——— تفعيل/تعطيل ———
        .addSubcommand(sub =>
            sub.setName('toggle')
                .setDescription('تفعيل أو تعطيل نظام الترحيب')
                .addStringOption(opt =>
                    opt.setName('type')
                        .setDescription('اختر النظام')
                        .setRequired(true)
                        .addChoices(
                            { name: '🟢 الترحيب', value: 'welcome' },
                            { name: '🔴 الوداع', value: 'goodbye' },
                        ),
                )
                .addStringOption(opt =>
                    opt.setName('status')
                        .setDescription('تفعيل أو تعطيل')
                        .setRequired(true)
                        .addChoices(
                            { name: '✅ تفعيل', value: 'on' },
                            { name: '❌ تعطيل', value: 'off' },
                        ),
                ),
        )

        // ——— تحديد القناة ———
        .addSubcommand(sub =>
            sub.setName('channel')
                .setDescription('تحديد قناة الترحيب أو الوداع')
                .addStringOption(opt =>
                    opt.setName('type')
                        .setDescription('اختر النظام')
                        .setRequired(true)
                        .addChoices(
                            { name: '🟢 الترحيب', value: 'welcome' },
                            { name: '🔴 الوداع', value: 'goodbye' },
                        ),
                )
                .addChannelOption(opt =>
                    opt.setName('channel')
                        .setDescription('اختر القناة')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildText),
                ),
        )

        // ——— تخصيص الرسالة (وصف الإمبد) ———
        .addSubcommand(sub =>
            sub.setName('message')
                .setDescription('تخصيص رسالة الترحيب أو الوداع (وصف الإمبد)')
                .addStringOption(opt =>
                    opt.setName('type')
                        .setDescription('اختر النظام')
                        .setRequired(true)
                        .addChoices(
                            { name: '🟢 رسالة الترحيب', value: 'welcome' },
                            { name: '🔴 رسالة الوداع', value: 'goodbye' },
                            { name: '💜 رسالة الخاص (DM)', value: 'dm' },
                        ),
                )
                .addStringOption(opt =>
                    opt.setName('text')
                        .setDescription('الرسالة الجديدة (استخدم {user} {username} {server} {count})')
                        .setRequired(true),
                ),
        )

        // ——— عنوان الإمبد (Title) ———
        .addSubcommand(sub =>
            sub.setName('title')
                .setDescription('تغيير عنوان الإمبد')
                .addStringOption(opt =>
                    opt.setName('type')
                        .setDescription('اختر النظام')
                        .setRequired(true)
                        .addChoices(
                            { name: '🟢 الترحيب', value: 'welcome' },
                            { name: '🔴 الوداع', value: 'goodbye' },
                        ),
                )
                .addStringOption(opt =>
                    opt.setName('text')
                        .setDescription('العنوان الجديد (اكتب "remove" لحذفه)')
                        .setRequired(true),
                ),
        )

        // ——— الكاتب (Author) ———
        .addSubcommand(sub =>
            sub.setName('author')
                .setDescription('تغيير نص الكاتب (أعلى الإمبد)')
                .addStringOption(opt =>
                    opt.setName('type')
                        .setDescription('اختر النظام')
                        .setRequired(true)
                        .addChoices(
                            { name: '🟢 الترحيب', value: 'welcome' },
                            { name: '🔴 الوداع', value: 'goodbye' },
                        ),
                )
                .addStringOption(opt =>
                    opt.setName('text')
                        .setDescription('النص (اكتب "remove" لحذفه) — يدعم المتغيرات')
                        .setRequired(true),
                ),
        )

        // ——— الفوتر ———
        .addSubcommand(sub =>
            sub.setName('footer')
                .setDescription('تغيير نص الفوتر (أسفل الإمبد)')
                .addStringOption(opt =>
                    opt.setName('type')
                        .setDescription('اختر النظام')
                        .setRequired(true)
                        .addChoices(
                            { name: '🟢 الترحيب', value: 'welcome' },
                            { name: '🔴 الوداع', value: 'goodbye' },
                        ),
                )
                .addStringOption(opt =>
                    opt.setName('text')
                        .setDescription('النص (اكتب "remove" لحذفه) — يدعم المتغيرات')
                        .setRequired(true),
                ),
        )

        // ——— الصورة المصغرة (Thumbnail) ———
        .addSubcommand(sub =>
            sub.setName('thumbnail')
                .setDescription('إعداد الصورة المصغرة (الدائرية)')
                .addStringOption(opt =>
                    opt.setName('type')
                        .setDescription('اختر النظام')
                        .setRequired(true)
                        .addChoices(
                            { name: '🟢 الترحيب', value: 'welcome' },
                            { name: '🔴 الوداع', value: 'goodbye' },
                        ),
                )
                .addStringOption(opt =>
                    opt.setName('option')
                        .setDescription('اختر الصورة المصغرة')
                        .setRequired(true)
                        .addChoices(
                            { name: '👤 صورة العضو', value: 'user' },
                            { name: '🌐 أيقونة السيرفر', value: 'server' },
                            { name: '🔗 رابط مخصص', value: 'custom' },
                            { name: '❌ بدون صورة', value: 'none' },
                        ),
                )
                .addStringOption(opt =>
                    opt.setName('url')
                        .setDescription('رابط الصورة (فقط إذا اخترت رابط مخصص)')
                        .setRequired(false),
                ),
        )

        // ——— إظهار/إخفاء الحقول ———
        .addSubcommand(sub =>
            sub.setName('fields')
                .setDescription('إظهار أو إخفاء حقول المعلومات (اسم، رقم، عمر..)')
                .addStringOption(opt =>
                    opt.setName('type')
                        .setDescription('اختر النظام')
                        .setRequired(true)
                        .addChoices(
                            { name: '🟢 الترحيب', value: 'welcome' },
                            { name: '🔴 الوداع', value: 'goodbye' },
                        ),
                )
                .addStringOption(opt =>
                    opt.setName('status')
                        .setDescription('إظهار أو إخفاء')
                        .setRequired(true)
                        .addChoices(
                            { name: '✅ إظهار', value: 'on' },
                            { name: '❌ إخفاء', value: 'off' },
                        ),
                ),
        )

        // ——— الطابع الزمني ———
        .addSubcommand(sub =>
            sub.setName('timestamp')
                .setDescription('إظهار أو إخفاء الطابع الزمني في الإمبد')
                .addStringOption(opt =>
                    opt.setName('type')
                        .setDescription('اختر النظام')
                        .setRequired(true)
                        .addChoices(
                            { name: '🟢 الترحيب', value: 'welcome' },
                            { name: '🔴 الوداع', value: 'goodbye' },
                        ),
                )
                .addStringOption(opt =>
                    opt.setName('status')
                        .setDescription('إظهار أو إخفاء')
                        .setRequired(true)
                        .addChoices(
                            { name: '✅ إظهار', value: 'on' },
                            { name: '❌ إخفاء', value: 'off' },
                        ),
                ),
        )

        // ——— DM ———
        .addSubcommand(sub =>
            sub.setName('dm')
                .setDescription('تفعيل أو تعطيل رسالة الترحيب الخاصة (DM)')
                .addStringOption(opt =>
                    opt.setName('status')
                        .setDescription('تفعيل أو تعطيل')
                        .setRequired(true)
                        .addChoices(
                            { name: '✅ تفعيل', value: 'on' },
                            { name: '❌ تعطيل', value: 'off' },
                        ),
                ),
        )

        // ——— لون الإمبد ———
        .addSubcommand(sub =>
            sub.setName('color')
                .setDescription('تغيير لون الإمبد')
                .addStringOption(opt =>
                    opt.setName('type')
                        .setDescription('اختر النظام')
                        .setRequired(true)
                        .addChoices(
                            { name: '🟢 الترحيب', value: 'welcome' },
                            { name: '🔴 الوداع', value: 'goodbye' },
                        ),
                )
                .addStringOption(opt =>
                    opt.setName('hex')
                        .setDescription('اللون بصيغة HEX (مثال: #ff5733)')
                        .setRequired(true),
                ),
        )

        // ——— بانر ———
        .addSubcommand(sub =>
            sub.setName('banner')
                .setDescription('تحديد صورة بانر تظهر في الإمبد')
                .addStringOption(opt =>
                    opt.setName('type')
                        .setDescription('اختر النظام')
                        .setRequired(true)
                        .addChoices(
                            { name: '🟢 الترحيب', value: 'welcome' },
                            { name: '🔴 الوداع', value: 'goodbye' },
                        ),
                )
                .addStringOption(opt =>
                    opt.setName('url')
                        .setDescription('رابط الصورة (اكتب "remove" لحذفها)')
                        .setRequired(true),
                ),
        )

        // ——— اختبار ———
        .addSubcommand(sub =>
            sub.setName('test')
                .setDescription('اختبار رسالة الترحيب أو الوداع')
                .addStringOption(opt =>
                    opt.setName('type')
                        .setDescription('اختر النظام')
                        .setRequired(true)
                        .addChoices(
                            { name: '🟢 الترحيب', value: 'welcome' },
                            { name: '🔴 الوداع', value: 'goodbye' },
                        ),
                ),
        )

        // ——— عرض الإعدادات ———
        .addSubcommand(sub =>
            sub.setName('settings')
                .setDescription('عرض إعدادات الترحيب والوداع الحالية'),
        )

        // ——— إعادة تعيين ———
        .addSubcommand(sub =>
            sub.setName('reset')
                .setDescription('إعادة تعيين إعدادات الترحيب أو الوداع')
                .addStringOption(opt =>
                    opt.setName('type')
                        .setDescription('اختر النظام')
                        .setRequired(true)
                        .addChoices(
                            { name: '🟢 الترحيب', value: 'welcome' },
                            { name: '🔴 الوداع', value: 'goodbye' },
                            { name: '🔄 الكل', value: 'all' },
                        ),
                ),
        ),

    async execute(interaction, client) {
        const sub = interaction.options.getSubcommand();

        switch (sub) {
            case 'toggle': return handleToggle(interaction, client);
            case 'channel': return handleChannel(interaction, client);
            case 'message': return handleMessage(interaction, client);
            case 'title': return handleTitle(interaction, client);
            case 'author': return handleAuthor(interaction, client);
            case 'footer': return handleFooter(interaction, client);
            case 'thumbnail': return handleThumbnail(interaction, client);
            case 'fields': return handleFields(interaction, client);
            case 'timestamp': return handleTimestamp(interaction, client);
            case 'dm': return handleDM(interaction, client);
            case 'color': return handleColor(interaction, client);
            case 'banner': return handleBanner(interaction, client);
            case 'test': return handleTest(interaction, client);
            case 'settings': return handleSettings(interaction, client);
            case 'reset': return handleReset(interaction, client);
        }
    },
};

// ═══════════════════════════════════════════════════════════
//  دالة مساعدة لبناء الإمبد من الإعدادات
// ═══════════════════════════════════════════════════════════
function buildEmbed(config, member, guild, client, isWelcome) {
    const messageText = replacePlaceholders(config.message, member, guild);
    const embed = new EmbedBuilder();

    // اللون
    embed.setColor(config.embedColor || (isWelcome ? client.config.successColor : client.config.errorColor));

    // الكاتب (Author)
    if (config.authorText !== null && config.authorText !== undefined) {
        const authorName = replacePlaceholders(config.authorText, member, guild);
        embed.setAuthor({
            name: authorName,
            iconURL: config.authorIcon === 'server'
                ? guild.iconURL({ dynamic: true })
                : config.authorIcon === 'user'
                    ? (member.user?.displayAvatarURL || member.displayAvatarURL)({ dynamic: true })
                    : guild.iconURL({ dynamic: true }),
        });
    }

    // العنوان (Title)
    if (config.titleText) {
        embed.setTitle(replacePlaceholders(config.titleText, member, guild));
    }

    // الوصف (Description) — الرسالة الرئيسية
    embed.setDescription(messageText);

    // الصورة المصغرة (Thumbnail)
    const thumbOption = config.thumbnail || 'user';
    if (thumbOption === 'user') {
        const avatarFn = member.user?.displayAvatarURL?.bind(member.user) || member.displayAvatarURL?.bind(member);
        if (avatarFn) embed.setThumbnail(avatarFn({ dynamic: true, size: 512 }));
    } else if (thumbOption === 'server') {
        const icon = guild.iconURL({ dynamic: true, size: 512 });
        if (icon) embed.setThumbnail(icon);
    } else if (thumbOption !== 'none' && config.thumbnailUrl) {
        embed.setThumbnail(config.thumbnailUrl);
    }

    // الحقول (Fields)
    if (config.showFields !== false) {
        if (isWelcome) {
            const accountAge = Math.floor((Date.now() - (member.user?.createdTimestamp || member.createdTimestamp)) / (1000 * 60 * 60 * 24));
            const accountAgeText = accountAge < 7 ? '⚠️ حساب جديد!' : `${accountAge} يوم`;
            const createdAt = `<t:${Math.floor((member.user?.createdTimestamp || member.createdTimestamp) / 1000)}:R>`;

            embed.addFields(
                { name: '👤 المستخدم', value: member.user?.tag || member.tag || 'Unknown', inline: true },
                { name: '🔢 رقم العضو', value: `#${guild.memberCount}`, inline: true },
                { name: '📅 عمر الحساب', value: `${accountAgeText} (${createdAt})`, inline: true },
            );
        } else {
            // وداع
            const joinedAt = member.joinedTimestamp;
            let stayDuration = 'غير معروف';
            if (joinedAt) {
                const days = Math.floor((Date.now() - joinedAt) / (1000 * 60 * 60 * 24));
                if (days < 1) stayDuration = 'أقل من يوم';
                else if (days === 1) stayDuration = 'يوم واحد';
                else if (days < 30) stayDuration = `${days} يوم`;
                else if (days < 365) stayDuration = `${Math.floor(days / 30)} شهر`;
                else stayDuration = `${Math.floor(days / 365)} سنة`;
            }

            embed.addFields(
                { name: '👤 المستخدم', value: member.user?.tag || member.tag || 'Unknown', inline: true },
                { name: '🔢 الأعضاء المتبقين', value: `${guild.memberCount}`, inline: true },
                { name: '⏱️ مدة البقاء', value: stayDuration, inline: true },
            );

            // الأدوار
            if (member.roles?.cache) {
                const roles = member.roles.cache
                    .filter(r => r.id !== guild.id)
                    .sort((a, b) => b.position - a.position)
                    .map(r => r.toString())
                    .slice(0, 10);
                if (roles.length > 0) {
                    embed.addFields({ name: `🎭 الأدوار (${roles.length})`, value: roles.join(', '), inline: false });
                }
            }
        }
    }

    // البانر (Image)
    if (config.bannerUrl) {
        embed.setImage(config.bannerUrl);
    }

    // الفوتر (Footer)
    if (config.footerText !== null && config.footerText !== undefined) {
        embed.setFooter({
            text: replacePlaceholders(config.footerText, member, guild),
            iconURL: guild.iconURL({ dynamic: true }),
        });
    } else {
        // الفوتر الافتراضي
        const defaultFooter = isWelcome
            ? `${guild.name} • نتمنى لك وقت ممتع!`
            : guild.name;
        embed.setFooter({ text: defaultFooter, iconURL: guild.iconURL({ dynamic: true }) });
    }

    // الطابع الزمني
    if (config.showTimestamp !== false) {
        embed.setTimestamp();
    }

    return embed;
}

// ══════════════════════ تفعيل/تعطيل ══════════════════════
async function handleToggle(interaction, client) {
    const type = interaction.options.getString('type');
    const status = interaction.options.getString('status');
    const enabled = status === 'on';

    updateGuildData(interaction.guild.id, type, { enabled });

    const emoji = enabled ? '✅' : '❌';
    const statusText = enabled ? 'مفعّل' : 'معطّل';
    const typeText = type === 'welcome' ? 'الترحيب' : 'الوداع';

    const embed = new EmbedBuilder()
        .setColor(enabled ? client.config.successColor : client.config.errorColor)
        .setDescription(`${emoji} نظام **${typeText}** الآن **${statusText}**`)
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

// ══════════════════════ تحديد القناة ══════════════════════
async function handleChannel(interaction, client) {
    const type = interaction.options.getString('type');
    const channel = interaction.options.getChannel('channel');

    updateGuildData(interaction.guild.id, type, { channelId: channel.id });

    const typeText = type === 'welcome' ? 'الترحيب' : 'الوداع';

    const embed = new EmbedBuilder()
        .setColor(client.config.successColor)
        .setDescription(`✅ تم تحديد قناة **${typeText}** إلى ${channel}`)
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

// ══════════════════════ تخصيص الرسالة ══════════════════════
async function handleMessage(interaction, client) {
    const type = interaction.options.getString('type');
    const text = interaction.options.getString('text');

    if (type === 'dm') {
        updateGuildData(interaction.guild.id, 'welcome', { dmMessage: text });
    } else if (type === 'welcome') {
        updateGuildData(interaction.guild.id, 'welcome', { message: text });
    } else {
        updateGuildData(interaction.guild.id, 'goodbye', { message: text });
    }

    const typeText = type === 'welcome' ? 'الترحيب' : type === 'goodbye' ? 'الوداع' : 'الخاص (DM)';

    const embed = new EmbedBuilder()
        .setColor(client.config.successColor)
        .setTitle(`✅ تم تحديث رسالة ${typeText}`)
        .setDescription(`**الرسالة الجديدة:**\n${text}`)
        .addFields({
            name: '📝 المتغيرات المتاحة',
            value: '`{user}` - منشن العضو\n`{username}` - اسم المستخدم\n`{displayname}` - الاسم المعروض\n`{server}` - اسم السيرفر\n`{count}` - عدد الأعضاء\n`{tag}` - التاق\n`{id}` - الآيدي',
        })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

// ══════════════════════ العنوان (Title) ══════════════════════
async function handleTitle(interaction, client) {
    const type = interaction.options.getString('type');
    const text = interaction.options.getString('text');
    const typeText = type === 'welcome' ? 'الترحيب' : 'الوداع';

    if (text.toLowerCase() === 'remove') {
        updateGuildData(interaction.guild.id, type, { titleText: null });
        const embed = new EmbedBuilder()
            .setColor(client.config.successColor)
            .setDescription(`✅ تم حذف عنوان إمبد **${typeText}**`)
            .setTimestamp();
        return interaction.reply({ embeds: [embed] });
    }

    updateGuildData(interaction.guild.id, type, { titleText: text });

    const embed = new EmbedBuilder()
        .setColor(client.config.successColor)
        .setDescription(`✅ تم تحديث عنوان إمبد **${typeText}** إلى:\n**${text}**`)
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

// ══════════════════════ الكاتب (Author) ══════════════════════
async function handleAuthor(interaction, client) {
    const type = interaction.options.getString('type');
    const text = interaction.options.getString('text');
    const typeText = type === 'welcome' ? 'الترحيب' : 'الوداع';

    if (text.toLowerCase() === 'remove') {
        updateGuildData(interaction.guild.id, type, { authorText: null });
        const embed = new EmbedBuilder()
            .setColor(client.config.successColor)
            .setDescription(`✅ تم حذف نص الكاتب من إمبد **${typeText}**`)
            .setTimestamp();
        return interaction.reply({ embeds: [embed] });
    }

    updateGuildData(interaction.guild.id, type, { authorText: text });

    const embed = new EmbedBuilder()
        .setColor(client.config.successColor)
        .setDescription(`✅ تم تحديث نص الكاتب في إمبد **${typeText}** إلى:\n**${text}**`)
        .addFields({
            name: '📝 ملاحظة',
            value: 'يدعم نفس المتغيرات: `{user}` `{username}` `{server}` `{count}`',
        })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

// ══════════════════════ الفوتر ══════════════════════
async function handleFooter(interaction, client) {
    const type = interaction.options.getString('type');
    const text = interaction.options.getString('text');
    const typeText = type === 'welcome' ? 'الترحيب' : 'الوداع';

    if (text.toLowerCase() === 'remove') {
        updateGuildData(interaction.guild.id, type, { footerText: null });
        const embed = new EmbedBuilder()
            .setColor(client.config.successColor)
            .setDescription(`✅ تم إرجاع فوتر إمبد **${typeText}** للافتراضي`)
            .setTimestamp();
        return interaction.reply({ embeds: [embed] });
    }

    updateGuildData(interaction.guild.id, type, { footerText: text });

    const embed = new EmbedBuilder()
        .setColor(client.config.successColor)
        .setDescription(`✅ تم تحديث فوتر إمبد **${typeText}** إلى:\n**${text}**`)
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

// ══════════════════════ الصورة المصغرة ══════════════════════
async function handleThumbnail(interaction, client) {
    const type = interaction.options.getString('type');
    const option = interaction.options.getString('option');
    const url = interaction.options.getString('url');
    const typeText = type === 'welcome' ? 'الترحيب' : 'الوداع';

    const updateData = { thumbnail: option };

    if (option === 'custom') {
        if (!url) {
            const embed = new EmbedBuilder()
                .setColor(client.config.errorColor)
                .setDescription('❌ لازم تحط رابط الصورة مع خيار "رابط مخصص"!')
                .setTimestamp();
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }
        updateData.thumbnailUrl = url;
    }

    updateGuildData(interaction.guild.id, type, updateData);

    const optionText = {
        user: '👤 صورة العضو',
        server: '🌐 أيقونة السيرفر',
        custom: `🔗 رابط مخصص`,
        none: '❌ بدون صورة',
    };

    const embed = new EmbedBuilder()
        .setColor(client.config.successColor)
        .setDescription(`✅ تم تحديث الصورة المصغرة في إمبد **${typeText}** إلى: **${optionText[option]}**`)
        .setTimestamp();

    if (option === 'custom' && url) embed.setThumbnail(url);

    await interaction.reply({ embeds: [embed] });
}

// ══════════════════════ الحقول ══════════════════════
async function handleFields(interaction, client) {
    const type = interaction.options.getString('type');
    const status = interaction.options.getString('status');
    const show = status === 'on';

    updateGuildData(interaction.guild.id, type, { showFields: show });

    const typeText = type === 'welcome' ? 'الترحيب' : 'الوداع';
    const emoji = show ? '✅' : '❌';
    const statusText = show ? 'ظاهرة' : 'مخفية';

    const embed = new EmbedBuilder()
        .setColor(client.config.successColor)
        .setDescription(`${emoji} حقول المعلومات في إمبد **${typeText}** الآن **${statusText}**`)
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

// ══════════════════════ الطابع الزمني ══════════════════════
async function handleTimestamp(interaction, client) {
    const type = interaction.options.getString('type');
    const status = interaction.options.getString('status');
    const show = status === 'on';

    updateGuildData(interaction.guild.id, type, { showTimestamp: show });

    const typeText = type === 'welcome' ? 'الترحيب' : 'الوداع';
    const emoji = show ? '✅' : '❌';
    const statusText = show ? 'ظاهر' : 'مخفي';

    const embed = new EmbedBuilder()
        .setColor(client.config.successColor)
        .setDescription(`${emoji} الطابع الزمني في إمبد **${typeText}** الآن **${statusText}**`)
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

// ══════════════════════ الخاص DM ══════════════════════
async function handleDM(interaction, client) {
    const status = interaction.options.getString('status');
    const enabled = status === 'on';

    updateGuildData(interaction.guild.id, 'welcome', { dmEnabled: enabled });

    const emoji = enabled ? '✅' : '❌';
    const statusText = enabled ? 'مفعّلة' : 'معطّلة';

    const embed = new EmbedBuilder()
        .setColor(enabled ? client.config.successColor : client.config.errorColor)
        .setDescription(`${emoji} رسالة الترحيب الخاصة (DM) الآن **${statusText}**`)
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

// ══════════════════════ اللون ══════════════════════
async function handleColor(interaction, client) {
    const type = interaction.options.getString('type');
    const hex = interaction.options.getString('hex');

    if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) {
        const embed = new EmbedBuilder()
            .setColor(client.config.errorColor)
            .setDescription('❌ صيغة اللون غلط! استخدم صيغة HEX مثل: `#ff5733`')
            .setTimestamp();
        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    updateGuildData(interaction.guild.id, type, { embedColor: hex });

    const typeText = type === 'welcome' ? 'الترحيب' : 'الوداع';

    const embed = new EmbedBuilder()
        .setColor(hex)
        .setDescription(`🎨 تم تغيير لون إمبد **${typeText}** إلى \`${hex}\``)
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

// ══════════════════════ البانر ══════════════════════
async function handleBanner(interaction, client) {
    const type = interaction.options.getString('type');
    const url = interaction.options.getString('url');
    const typeText = type === 'welcome' ? 'الترحيب' : 'الوداع';

    if (url.toLowerCase() === 'remove') {
        updateGuildData(interaction.guild.id, type, { bannerUrl: null });
        const embed = new EmbedBuilder()
            .setColor(client.config.successColor)
            .setDescription(`✅ تم حذف بانر **${typeText}**`)
            .setTimestamp();
        return interaction.reply({ embeds: [embed] });
    }

    if (!/^https?:\/\/.+\..+/.test(url)) {
        const embed = new EmbedBuilder()
            .setColor(client.config.errorColor)
            .setDescription('❌ الرابط مو صحيح! لازم يبدأ بـ `https://`')
            .setTimestamp();
        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    updateGuildData(interaction.guild.id, type, { bannerUrl: url });

    const embed = new EmbedBuilder()
        .setColor(client.config.successColor)
        .setTitle(`🖼️ تم تحديث بانر ${typeText}`)
        .setImage(url)
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

// ══════════════════════ الاختبار ══════════════════════
async function handleTest(interaction, client) {
    const type = interaction.options.getString('type');
    const guildData = getGuildData(interaction.guild.id);
    const isWelcome = type === 'welcome';
    const config = isWelcome ? guildData.welcome : guildData.goodbye;

    const testEmbed = buildEmbed(config, interaction.member, interaction.guild, client, isWelcome);

    const label = isWelcome ? 'رسالة الترحيب' : 'رسالة الوداع';
    await interaction.reply({ content: `🧪 **هذا اختبار لـ${label}:**`, embeds: [testEmbed] });
}

// ══════════════════════ عرض الإعدادات ══════════════════════
async function handleSettings(interaction, client) {
    const guildData = getGuildData(interaction.guild.id);
    const w = guildData.welcome;
    const g = guildData.goodbye;

    const wChannel = w.channelId ? `<#${w.channelId}>` : '`غير محدد`';
    const gChannel = g.channelId ? `<#${g.channelId}>` : '`غير محدد`';

    const thumbText = (t) => {
        if (t === 'user' || !t) return '👤 صورة العضو';
        if (t === 'server') return '🌐 أيقونة السيرفر';
        if (t === 'custom') return '🔗 رابط مخصص';
        if (t === 'none') return '❌ بدون';
        return '👤 صورة العضو';
    };

    const embed = new EmbedBuilder()
        .setColor(client.config.embedColor)
        .setTitle('⚙️ إعدادات نظام الترحيب والوداع')
        .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
        .addFields(
            {
                name: '🟢 الترحيب',
                value: [
                    `**الحالة:** ${w.enabled ? '✅ مفعّل' : '❌ معطّل'}`,
                    `**القناة:** ${wChannel}`,
                    `**اللون:** \`${w.embedColor || 'افتراضي'}\``,
                    `**العنوان:** ${w.titleText || '`غير محدد`'}`,
                    `**الكاتب:** ${w.authorText || '`عضو جديد انضم! 🎉 (افتراضي)`'}`,
                    `**الفوتر:** ${w.footerText || '`افتراضي`'}`,
                    `**الصورة المصغرة:** ${thumbText(w.thumbnail)}`,
                    `**الحقول:** ${w.showFields !== false ? '✅' : '❌'}`,
                    `**الطابع الزمني:** ${w.showTimestamp !== false ? '✅' : '❌'}`,
                    `**الخاص (DM):** ${w.dmEnabled ? '✅' : '❌'}`,
                    `**البانر:** ${w.bannerUrl ? '✅' : '❌'}`,
                ].join('\n'),
                inline: false,
            },
            {
                name: '📝 رسالة الترحيب',
                value: `\`\`\`${w.message}\`\`\``,
                inline: false,
            },
            {
                name: '🔴 الوداع',
                value: [
                    `**الحالة:** ${g.enabled ? '✅ مفعّل' : '❌ معطّل'}`,
                    `**القناة:** ${gChannel}`,
                    `**اللون:** \`${g.embedColor || 'افتراضي'}\``,
                    `**العنوان:** ${g.titleText || '`غير محدد`'}`,
                    `**الكاتب:** ${g.authorText || '`عضو غادر السيرفر 😢 (افتراضي)`'}`,
                    `**الفوتر:** ${g.footerText || '`افتراضي`'}`,
                    `**الصورة المصغرة:** ${thumbText(g.thumbnail)}`,
                    `**الحقول:** ${g.showFields !== false ? '✅' : '❌'}`,
                    `**الطابع الزمني:** ${g.showTimestamp !== false ? '✅' : '❌'}`,
                    `**البانر:** ${g.bannerUrl ? '✅' : '❌'}`,
                ].join('\n'),
                inline: false,
            },
            {
                name: '📝 رسالة الوداع',
                value: `\`\`\`${g.message}\`\`\``,
                inline: false,
            },
        )
        .setFooter({ text: 'استخدم /welcome لتعديل أي إعداد' })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

// ══════════════════════ إعادة التعيين ══════════════════════
async function handleReset(interaction, client) {
    const type = interaction.options.getString('type');

    const defaultWelcome = {
        enabled: false, channelId: null,
        message: 'أهلاً وسهلاً {user} في **{server}**! 🎉\nأنت العضو رقم **#{count}**',
        dmEnabled: false,
        dmMessage: 'أهلاً فيك في **{server}**! نتمنى لك وقت ممتع 💜',
        embedColor: '#2b2d31', bannerUrl: null,
        titleText: null, authorText: null, footerText: null,
        thumbnail: 'user', thumbnailUrl: null,
        showFields: true, showTimestamp: true,
    };

    const defaultGoodbye = {
        enabled: false, channelId: null,
        message: 'للأسف **{username}** غادر السيرفر 😢\nنتمنى يرجع قريب!',
        embedColor: '#2b2d31', bannerUrl: null,
        titleText: null, authorText: null, footerText: null,
        thumbnail: 'user', thumbnailUrl: null,
        showFields: true, showTimestamp: true,
    };

    if (type === 'welcome' || type === 'all') {
        updateGuildData(interaction.guild.id, 'welcome', defaultWelcome);
    }
    if (type === 'goodbye' || type === 'all') {
        updateGuildData(interaction.guild.id, 'goodbye', defaultGoodbye);
    }

    const typeText = type === 'welcome' ? 'الترحيب' : type === 'goodbye' ? 'الوداع' : 'الترحيب والوداع';

    const embed = new EmbedBuilder()
        .setColor(client.config.warnColor)
        .setDescription(`🔄 تم إعادة تعيين إعدادات **${typeText}** للإعدادات الافتراضية`)
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}
