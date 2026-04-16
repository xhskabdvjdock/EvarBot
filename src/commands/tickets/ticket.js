const { SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    ChannelType,
    PermissionFlagsBits,
    MessageFlags } = require('discord.js');
const { getGuildData, updateGuildData, saveGuildData } = require('../../utils/database');

const BUTTON_STYLES = {
    Primary: ButtonStyle.Primary,
    Secondary: ButtonStyle.Secondary,
    Success: ButtonStyle.Success,
    Danger: ButtonStyle.Danger,
};

// تحويل الإيموجي لصيغة Discord المقبولة
function parseEmoji(emojiStr) {
    if (!emojiStr) return undefined;
    // Custom emoji: <:name:id> or <a:name:id>
    const customMatch = emojiStr.match(/^<(a?):(\w+):(\d+)>$/);
    if (customMatch) {
        return { animated: !!customMatch[1], name: customMatch[2], id: customMatch[3] };
    }
    // Unicode emoji — strip variation selectors (U+FE0F)
    const cleaned = emojiStr.replace(/\uFE0F/g, '').trim();
    if (cleaned) return cleaned;
    return undefined;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('🎫 نظام التذاكر المتقدم')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

        // ═══ إعداد النظام ═══
        .addSubcommand(sub =>
            sub.setName('setup')
                .setDescription('إعداد نظام التذاكر')
                .addChannelOption(opt =>
                    opt.setName('category').setDescription('كاتيجوري التذاكر').setRequired(true)
                        .addChannelTypes(ChannelType.GuildCategory))
                .addRoleOption(opt =>
                    opt.setName('staff').setDescription('رول فريق الدعم').setRequired(true))
                .addChannelOption(opt =>
                    opt.setName('transcripts').setDescription('قناة حفظ المحادثات').setRequired(false)
                        .addChannelTypes(ChannelType.GuildText))
                .addIntegerOption(opt =>
                    opt.setName('max').setDescription('أقصى تذاكر مفتوحة للعضو').setRequired(false)
                        .setMinValue(1).setMaxValue(5)))

        // ═══ إرسال البانل ═══
        .addSubcommand(sub =>
            sub.setName('panel')
                .setDescription('إرسال بانل التذاكر')
                .addStringOption(opt =>
                    opt.setName('mode').setDescription('نوع التفاعل').setRequired(false)
                        .addChoices(
                            { name: '🔘 أزرار', value: 'buttons' },
                            { name: '📋 قائمة منسدلة', value: 'dropdown' },
                        )))

        // ═══ إضافة نوع تذكرة ═══
        .addSubcommand(sub =>
            sub.setName('addcategory')
                .setDescription('إضافة نوع تذكرة جديد')
                .addStringOption(opt =>
                    opt.setName('id').setDescription('آيدي فريد (بالإنجليزي بدون فراغات)').setRequired(true))
                .addStringOption(opt =>
                    opt.setName('label').setDescription('اسم النوع').setRequired(true))
                .addStringOption(opt =>
                    opt.setName('emoji').setDescription('إيموجي').setRequired(true))
                .addStringOption(opt =>
                    opt.setName('description').setDescription('وصف قصير').setRequired(false))
                .addStringOption(opt =>
                    opt.setName('color').setDescription('لون الزر (Primary/Secondary/Success/Danger)').setRequired(false)
                        .addChoices(
                            { name: '🔵 أزرق (Primary)', value: 'Primary' },
                            { name: '⚪ رمادي (Secondary)', value: 'Secondary' },
                            { name: '🟢 أخضر (Success)', value: 'Success' },
                            { name: '🔴 أحمر (Danger)', value: 'Danger' },
                        ))
                .addStringOption(opt =>
                    opt.setName('welcome').setDescription('رسالة ترحيب التذكرة ({user} {username})').setRequired(false)))

        // ═══ حذف نوع تذكرة ═══
        .addSubcommand(sub =>
            sub.setName('removecategory')
                .setDescription('حذف نوع تذكرة')
                .addStringOption(opt =>
                    opt.setName('id').setDescription('آيدي النوع').setRequired(true)))

        // ═══ تخصيص البانل ═══
        .addSubcommand(sub =>
            sub.setName('customize')
                .setDescription('تخصيص إمبد البانل')
                .addStringOption(opt =>
                    opt.setName('title').setDescription('عنوان البانل').setRequired(false))
                .addStringOption(opt =>
                    opt.setName('description').setDescription('وصف البانل').setRequired(false))
                .addStringOption(opt =>
                    opt.setName('color').setDescription('لون الإمبد (hex مثل #5865f2)').setRequired(false))
                .addStringOption(opt =>
                    opt.setName('image').setDescription('رابط صورة كبيرة للبانل').setRequired(false))
                .addStringOption(opt =>
                    opt.setName('thumbnail').setDescription('رابط صورة مصغرة للبانل').setRequired(false)))

        // ═══ إغلاق / حذف / إضافة / إزالة ═══
        .addSubcommand(sub =>
            sub.setName('close').setDescription('إغلاق التذكرة الحالية'))
        .addSubcommand(sub =>
            sub.setName('delete').setDescription('حذف التذكرة نهائياً'))
        .addSubcommand(sub =>
            sub.setName('add').setDescription('إضافة عضو للتذكرة')
                .addUserOption(opt => opt.setName('user').setDescription('العضو').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('remove').setDescription('إزالة عضو من التذكرة')
                .addUserOption(opt => opt.setName('user').setDescription('العضو').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('settings').setDescription('عرض إعدادات التذاكر')),

    async execute(interaction, client) {
        const sub = interaction.options.getSubcommand();
        switch (sub) {
            case 'setup': return handleSetup(interaction, client);
            case 'panel': return handlePanel(interaction, client);
            case 'addcategory': return handleAddCategory(interaction, client);
            case 'removecategory': return handleRemoveCategory(interaction, client);
            case 'customize': return handleCustomize(interaction, client);
            case 'close': return handleClose(interaction, client);
            case 'delete': return handleDelete(interaction, client);
            case 'add': return handleAdd(interaction, client);
            case 'remove': return handleRemove(interaction, client);
            case 'settings': return handleSettings(interaction, client);
        }
    },
};

// ══════════════════════ الإعداد ══════════════════════
async function handleSetup(interaction, client) {
    const category = interaction.options.getChannel('category');
    const staff = interaction.options.getRole('staff');
    const transcripts = interaction.options.getChannel('transcripts');
    const max = interaction.options.getInteger('max') || 1;

    updateGuildData(interaction.guild.id, 'tickets', {
        enabled: true,
        categoryId: category.id,
        staffRoleId: staff.id,
        transcriptChannelId: transcripts?.id || null,
        maxTickets: max,
    });

    const embed = new EmbedBuilder()
        .setColor('#43b581')
        .setTitle('✅ تم إعداد نظام التذاكر!')
        .addFields(
            { name: '📁 الكاتيجوري', value: `${category}`, inline: true },
            { name: '👥 فريق الدعم', value: `${staff}`, inline: true },
            { name: '📄 المحادثات', value: transcripts ? `${transcripts}` : '`لم يتم التحديد`', inline: true },
            { name: '🔢 الحد الأقصى', value: `${max} تذكرة`, inline: true },
        )
        .setFooter({ text: 'استخدم /ticket addcategory لإضافة أنواع تذاكر • /ticket panel لإرسال البانل' })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

// ══════════════════════ إرسال البانل ══════════════════════
async function handlePanel(interaction, client) {
    const guildData = getGuildData(interaction.guild.id);
    const config = guildData.tickets;

    if (!config.enabled || !config.categoryId || !config.staffRoleId) {
        return interaction.reply({
            embeds: [err(client, 'لازم تسوي `/ticket setup` أول!')],
            flags: MessageFlags.Ephemeral,
        });
    }

    const categories = config.categories || [];
    if (categories.length === 0) {
        return interaction.reply({
            embeds: [err(client, 'لازم تضيف نوع تذكرة واحد على الأقل!\nاستخدم `/ticket addcategory`')],
            flags: MessageFlags.Ephemeral,
        });
    }

    const mode = interaction.options.getString('mode') || config.panelMode || 'buttons';

    // إمبد البانل
    const embed = new EmbedBuilder()
        .setColor(config.panelColor || '#5865f2')
        .setTitle(config.panelTitle || '🎫 نظام التذاكر')
        .setDescription(config.panelDescription || 'اختر نوع التذكرة')
        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
        .setTimestamp();

    if (config.panelImage) embed.setImage(config.panelImage);
    if (config.panelThumbnail) embed.setThumbnail(config.panelThumbnail);

    // إضافة حقول الأنواع
    if (categories.length > 1) {
        const fieldsText = categories.map(c => `${c.emoji} **${c.label}** — ${c.description || 'لا يوجد وصف'}`).join('\n');
        embed.addFields({ name: '📋 أنواع التذاكر', value: fieldsText });
    }

    let components = [];

    if (mode === 'dropdown') {
        // ═══ قائمة منسدلة ═══
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('ticket_select')
            .setPlaceholder('📩 اختر نوع التذكرة...')
            .addOptions(categories.map(c => {
                const opt = { label: c.label, value: c.id };
                if (c.description) opt.description = c.description;
                const emoji = parseEmoji(c.emoji);
                if (emoji) opt.emoji = emoji;
                return opt;
            }));

        components.push(new ActionRowBuilder().addComponents(selectMenu));
    } else {
        // ═══ أزرار ═══
        const rows = [];
        let currentRow = new ActionRowBuilder();

        categories.forEach((c, i) => {
            if (i > 0 && i % 5 === 0) {
                rows.push(currentRow);
                currentRow = new ActionRowBuilder();
            }

            const btn = new ButtonBuilder()
                .setCustomId(`ticket_create_${c.id}`)
                .setLabel(c.label)
                .setStyle(BUTTON_STYLES[c.style] || ButtonStyle.Primary);

            if (c.emoji) {
                const emoji = parseEmoji(c.emoji);
                if (emoji) btn.setEmoji(emoji);
            }

            currentRow.addComponents(btn);
        });

        rows.push(currentRow);
        components = rows;
    }

    await interaction.channel.send({ embeds: [embed], components });
    await interaction.reply({ content: '✅ تم إرسال بانل التذاكر!', flags: MessageFlags.Ephemeral });

    // حفظ الوضع
    updateGuildData(interaction.guild.id, 'tickets', { panelMode: mode });
}

// ══════════════════════ إضافة نوع ══════════════════════
async function handleAddCategory(interaction, client) {
    const id = interaction.options.getString('id').toLowerCase().replace(/\s+/g, '-');
    const label = interaction.options.getString('label');
    const emoji = interaction.options.getString('emoji');
    const description = interaction.options.getString('description') || '';
    const style = interaction.options.getString('color') || 'Primary';
    const welcome = interaction.options.getString('welcome') || `أهلاً {user}! 👋\nتذكرة **${label}** مفتوحة. اشرح طلبك بالتفصيل.`;

    const guildData = getGuildData(interaction.guild.id);
    if (!guildData.tickets.categories) guildData.tickets.categories = [];

    // تحقق من التكرار
    if (guildData.tickets.categories.find(c => c.id === id)) {
        return interaction.reply({
            embeds: [err(client, `نوع التذكرة \`${id}\` موجود بالفعل!`)],
            flags: MessageFlags.Ephemeral,
        });
    }

    if (guildData.tickets.categories.length >= 25) {
        return interaction.reply({
            embeds: [err(client, 'الحد الأقصى 25 نوع تذكرة!')],
            flags: MessageFlags.Ephemeral,
        });
    }

    guildData.tickets.categories.push({
        id, label, emoji, description, style,
        color: '#5865f2',
        welcomeMessage: welcome,
    });
    saveGuildData(interaction.guild.id, guildData);

    const embed = new EmbedBuilder()
        .setColor('#43b581')
        .setTitle('✅ تم إضافة نوع تذكرة جديد!')
        .addFields(
            { name: '🆔 الآيدي', value: `\`${id}\``, inline: true },
            { name: '📛 الاسم', value: `${emoji} ${label}`, inline: true },
            { name: '🎨 اللون', value: style, inline: true },
            { name: '📝 الوصف', value: description || '`لا يوجد`' },
        )
        .setFooter({ text: `إجمالي الأنواع: ${guildData.tickets.categories.length}` })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

// ══════════════════════ حذف نوع ══════════════════════
async function handleRemoveCategory(interaction, client) {
    const id = interaction.options.getString('id').toLowerCase();
    const guildData = getGuildData(interaction.guild.id);
    const cats = guildData.tickets.categories || [];
    const index = cats.findIndex(c => c.id === id);

    if (index === -1) {
        return interaction.reply({
            embeds: [err(client, `النوع \`${id}\` مو موجود!`)],
            flags: MessageFlags.Ephemeral,
        });
    }

    const removed = cats.splice(index, 1)[0];
    saveGuildData(interaction.guild.id, guildData);

    const embed = new EmbedBuilder()
        .setColor('#faa61a')
        .setDescription(`🗑️ تم حذف نوع التذكرة: **${removed.emoji} ${removed.label}** (\`${removed.id}\`)`)
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

// ══════════════════════ تخصيص البانل ══════════════════════
async function handleCustomize(interaction, client) {
    const updates = {};
    const title = interaction.options.getString('title');
    const desc = interaction.options.getString('description');
    const color = interaction.options.getString('color');
    const image = interaction.options.getString('image');
    const thumbnail = interaction.options.getString('thumbnail');

    if (title) updates.panelTitle = title;
    if (desc) updates.panelDescription = desc;
    if (color) updates.panelColor = color;
    if (image !== null && image !== undefined) updates.panelImage = image || null;
    if (thumbnail !== null && thumbnail !== undefined) updates.panelThumbnail = thumbnail || null;

    if (Object.keys(updates).length === 0) {
        return interaction.reply({
            embeds: [err(client, 'لازم تحدد خيار واحد على الأقل!')],
            flags: MessageFlags.Ephemeral,
        });
    }

    updateGuildData(interaction.guild.id, 'tickets', updates);

    const embed = new EmbedBuilder()
        .setColor('#43b581')
        .setTitle('✅ تم تحديث بانل التذاكر!')
        .setDescription(Object.entries(updates).map(([k, v]) => `**${k}**: ${v || 'تم المسح'}`).join('\n'))
        .setFooter({ text: 'استخدم /ticket panel لإرسال البانل المحدث' })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

// ══════════════════════ إغلاق ══════════════════════
async function handleClose(interaction, client) {
    const guildData = getGuildData(interaction.guild.id);
    if (!isTicketChannel(interaction.channel, guildData)) {
        return interaction.reply({ embeds: [err(client, 'هذي مو قناة تذكرة!')], flags: MessageFlags.Ephemeral });
    }

    const newName = interaction.channel.name.startsWith('closed-')
        ? interaction.channel.name
        : `closed-${interaction.channel.name}`;
    await interaction.channel.setName(newName);

    const ticket = guildData.activeTickets?.find(t => t.channelId === interaction.channel.id);
    if (ticket) {
        await interaction.channel.permissionOverwrites.edit(ticket.userId, {
            SendMessages: false, ViewChannel: true,
        }).catch(() => { });
    }

    const embed = new EmbedBuilder()
        .setColor('#faa61a')
        .setTitle('🔒 تم إغلاق التذكرة')
        .setDescription(`تم الإغلاق بواسطة ${interaction.user}`)
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_delete').setLabel('🗑️ حذف').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('ticket_reopen').setLabel('🔓 إعادة فتح').setStyle(ButtonStyle.Success),
    );

    await interaction.reply({ embeds: [embed], components: [row] });
}

// ══════════════════════ حذف ══════════════════════
async function handleDelete(interaction, client) {
    const guildData = getGuildData(interaction.guild.id);
    if (!isTicketChannel(interaction.channel, guildData)) {
        return interaction.reply({ embeds: [err(client, 'هذي مو قناة تذكرة!')], flags: MessageFlags.Ephemeral });
    }
    await saveTranscript(interaction, guildData);
    if (guildData.activeTickets) {
        const idx = guildData.activeTickets.findIndex(t => t.channelId === interaction.channel.id);
        if (idx !== -1) guildData.activeTickets.splice(idx, 1);
        saveGuildData(interaction.guild.id, guildData);
    }
    await interaction.reply({ content: '🗑️ سيتم حذف التذكرة خلال 5 ثواني...' });
    setTimeout(() => interaction.channel.delete().catch(() => { }), 5000);
}

// ══════════════════════ إضافة عضو ══════════════════════
async function handleAdd(interaction, client) {
    const guildData = getGuildData(interaction.guild.id);
    if (!isTicketChannel(interaction.channel, guildData)) {
        return interaction.reply({ embeds: [err(client, 'هذي مو قناة تذكرة!')], flags: MessageFlags.Ephemeral });
    }
    const user = interaction.options.getMember('user');
    await interaction.channel.permissionOverwrites.edit(user.id, {
        ViewChannel: true, SendMessages: true, ReadMessageHistory: true,
    });
    await interaction.reply({
        embeds: [new EmbedBuilder().setColor('#43b581').setDescription(`✅ تم إضافة ${user} للتذكرة`).setTimestamp()],
    });
}

// ══════════════════════ إزالة عضو ══════════════════════
async function handleRemove(interaction, client) {
    const guildData = getGuildData(interaction.guild.id);
    if (!isTicketChannel(interaction.channel, guildData)) {
        return interaction.reply({ embeds: [err(client, 'هذي مو قناة تذكرة!')], flags: MessageFlags.Ephemeral });
    }
    const user = interaction.options.getMember('user');
    await interaction.channel.permissionOverwrites.edit(user.id, {
        ViewChannel: false, SendMessages: false,
    });
    await interaction.reply({
        embeds: [new EmbedBuilder().setColor('#faa61a').setDescription(`⚠️ تم إزالة ${user} من التذكرة`).setTimestamp()],
    });
}

// ══════════════════════ عرض الإعدادات ══════════════════════
async function handleSettings(interaction, client) {
    const guildData = getGuildData(interaction.guild.id);
    const c = guildData.tickets || {};

    const cats = (c.categories || []).map(cat =>
        `${cat.emoji} **${cat.label}** (\`${cat.id}\`) — ${cat.style} — ${cat.description || 'بدون وصف'}`,
    ).join('\n') || '`لا يوجد أنواع`';

    const embed = new EmbedBuilder()
        .setColor('#5865f2')
        .setTitle('⚙️ إعدادات نظام التذاكر')
        .addFields(
            { name: 'الحالة', value: c.enabled ? '✅ مفعّل' : '❌ معطّل', inline: true },
            { name: 'الوضع', value: c.panelMode === 'dropdown' ? '📋 منسدلة' : '🔘 أزرار', inline: true },
            { name: 'الحد الأقصى', value: `${c.maxTickets || 1} تذكرة`, inline: true },
            { name: '📁 الكاتيجوري', value: c.categoryId ? `<#${c.categoryId}>` : '`غير محدد`', inline: true },
            { name: '👥 الدعم', value: c.staffRoleId ? `<@&${c.staffRoleId}>` : '`غير محدد`', inline: true },
            { name: '📄 المحادثات', value: c.transcriptChannelId ? `<#${c.transcriptChannelId}>` : '`غير محدد`', inline: true },
            { name: '🎫 أنواع التذاكر', value: cats },
        )
        .setTimestamp();

    if (c.panelImage) embed.setImage(c.panelImage);

    await interaction.reply({ embeds: [embed] });
}

// ══════════════════════ مساعدات ══════════════════════
function isTicketChannel(channel, guildData) {
    const config = guildData.tickets;
    if (!config?.categoryId) return false;
    return channel.parentId === config.categoryId;
}

async function saveTranscript(interaction, guildData) {
    const config = guildData.tickets;
    if (!config.transcriptChannelId) return;
    const transcriptChannel = interaction.guild.channels.cache.get(config.transcriptChannelId);
    if (!transcriptChannel) return;

    try {
        const messages = await interaction.channel.messages.fetch({ limit: 100 });
        const sorted = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
        let text = `📄 محادثة: #${interaction.channel.name}\n📅 ${new Date().toLocaleString('ar-SA')}\n${'━'.repeat(40)}\n\n`;
        sorted.forEach(msg => {
            const t = new Date(msg.createdTimestamp).toLocaleTimeString('ar-SA');
            text += `[${t}] ${msg.author.tag}: ${msg.content || '[مرفق/إمبد]'}\n`;
        });

        const embed = new EmbedBuilder()
            .setColor('#5865f2')
            .setTitle(`📄 #${interaction.channel.name}`)
            .addFields(
                { name: '🗑️ بواسطة', value: interaction.user.tag, inline: true },
                { name: '💬 الرسائل', value: `${sorted.size}`, inline: true },
            ).setTimestamp();

        await transcriptChannel.send({
            embeds: [embed],
            files: [{ attachment: Buffer.from(text, 'utf-8'), name: `transcript-${interaction.channel.name}.txt` }],
        });
    } catch (e) { console.error('❌ Transcript error:', e.message); }
}

function err(client, msg) {
    return new EmbedBuilder().setColor(client.config.errorColor).setDescription(`❌ ${msg}`).setTimestamp();
}
