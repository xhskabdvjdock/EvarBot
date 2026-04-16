const { Events, EmbedBuilder, ChannelType, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { getGuildData, saveGuildData } = require('../utils/database');

module.exports = {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction, client) {

        // ══════════════════════ Autocomplete ══════════════════════
        if (interaction.isAutocomplete()) {
            const command = client.commands.get(interaction.commandName);
            if (command?.autocomplete) {
                try { await command.autocomplete(interaction); } catch { }
            }
            return;
        }

        // ══════════════════════ أوامر السلاش ══════════════════════
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) {
                console.log(`⚠️ الأمر ${interaction.commandName} مو موجود!`);
                return;
            }

            try {
                await command.execute(interaction, client);
            } catch (error) {
                console.error(`❌ خطأ في الأمر ${interaction.commandName}:`, error);
                const errorEmbed = new EmbedBuilder()
                    .setColor(client.config.errorColor)
                    .setTitle('❌ حدث خطأ!')
                    .setDescription('صار خطأ أثناء تنفيذ الأمر. حاول مرة ثانية.')
                    .setTimestamp();
                const opts = { embeds: [errorEmbed], flags: MessageFlags.Ephemeral };
                try {
                    if (interaction.replied || interaction.deferred) await interaction.followUp(opts);
                    else await interaction.reply(opts);
                } catch (replyError) {
                    const code = replyError?.code || replyError?.rawError?.code;
                    // Ignore Discord interaction lifecycle errors (expired/already-acked).
                    if (code !== 10062 && code !== 40060) {
                        console.error('❌ فشل إرسال رسالة الخطأ:', replyError);
                    }
                }
            }
            return;
        }

        // ══════════════════════ أزرار التذاكر ══════════════════════
        if (interaction.isButton()) {
            const { customId } = interaction;

            // أزرار فتح التذاكر (متعددة الأنواع)
            if (customId.startsWith('ticket_create_')) {
                const categoryId = customId.replace('ticket_create_', '');
                return handleTicketCreate(interaction, client, categoryId);
            }

            if (customId === 'ticket_close') return handleTicketClose(interaction, client);
            if (customId === 'ticket_delete') return handleTicketDelete(interaction, client);
            if (customId === 'ticket_reopen') return handleTicketReopen(interaction, client);

            // ══════ أزرار أدوار التفاعل ══════
            if (customId.startsWith('rr_')) {
                const roleId = customId.replace('rr_', '');
                return handleReactionRoleToggle(interaction, roleId);
            }
        }

        // ══════════════════════ قائمة منسدلة ══════════════════════
        if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'ticket_select') {
                const categoryId = interaction.values[0];
                return handleTicketCreate(interaction, client, categoryId);
            }

            // ══════ قائمة أدوار التفاعل ══════
            if (interaction.customId === 'rr_select') {
                return handleReactionRoleSelect(interaction);
            }
        }
    },
};

// ══════════════════════ إنشاء تذكرة ══════════════════════
async function handleTicketCreate(interaction, client, categoryId) {
    const guildData = getGuildData(interaction.guild.id);
    const config = guildData.tickets;

    if (!config?.enabled) {
        return interaction.reply({ content: '❌ نظام التذاكر مو مفعّل!', flags: MessageFlags.Ephemeral });
    }

    // البحث عن النوع
    const category = (config.categories || []).find(c => c.id === categoryId);
    if (!category) {
        return interaction.reply({ content: '❌ نوع التذكرة غير موجود!', flags: MessageFlags.Ephemeral });
    }

    // تحقق من عدد التذاكر المفتوحة
    if (!guildData.activeTickets) guildData.activeTickets = [];
    const userTickets = guildData.activeTickets.filter(t => t.userId === interaction.user.id);

    if (userTickets.length >= (config.maxTickets || 1)) {
        return interaction.reply({
            content: `❌ عندك بالفعل ${userTickets.length} تذكرة مفتوحة! الحد: ${config.maxTickets || 1}`,
            flags: MessageFlags.Ephemeral,
        });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
        const ticketNumber = (guildData.ticketCounter || 0) + 1;
        guildData.ticketCounter = ticketNumber;

        const channelName = `${categoryId}-${ticketNumber}`;

        const channel = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: config.categoryId,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                {
                    id: interaction.user.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory,
                        PermissionsBitField.Flags.AttachFiles,
                        PermissionsBitField.Flags.EmbedLinks,
                    ],
                },
                {
                    id: config.staffRoleId,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory,
                        PermissionsBitField.Flags.ManageMessages,
                        PermissionsBitField.Flags.AttachFiles,
                    ],
                },
                {
                    id: client.user.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ManageChannels,
                    ],
                },
            ],
        });

        // حفظ التذكرة
        guildData.activeTickets.push({
            channelId: channel.id,
            userId: interaction.user.id,
            userTag: interaction.user.tag,
            categoryId: categoryId,
            categoryLabel: category.label,
            createdAt: new Date().toISOString(),
            number: ticketNumber,
        });
        saveGuildData(interaction.guild.id, guildData);

        // رسالة الترحيب
        let welcomeMsg = category.welcomeMessage || `أهلاً {user}! 👋\nتذكرة **${category.label}** مفتوحة.`;
        welcomeMsg = welcomeMsg
            .replace(/{user}/g, `<@${interaction.user.id}>`)
            .replace(/{username}/g, interaction.user.username);

        const welcomeEmbed = new EmbedBuilder()
            .setColor(category.color || '#5865f2')
            .setTitle(`${category.emoji || '🎫'} تذكرة ${category.label} — #${ticketNumber}`)
            .setDescription(welcomeMsg)
            .addFields(
                { name: '👤 فاتح التذكرة', value: `${interaction.user}`, inline: true },
                { name: '📋 النوع', value: `${category.emoji} ${category.label}`, inline: true },
                { name: '📅 الوقت', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
            )
            .setFooter({ text: 'استخدم الزر أو /ticket close لإغلاق التذكرة' })
            .setTimestamp();

        const closeBtn = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_close')
                .setLabel('🔒 إغلاق التذكرة')
                .setStyle(ButtonStyle.Secondary),
        );

        await channel.send({
            content: `${interaction.user} | <@&${config.staffRoleId}>`,
            embeds: [welcomeEmbed],
            components: [closeBtn],
        });

        await interaction.editReply({ content: `✅ تم إنشاء تذكرتك! ${channel}` });

    } catch (err) {
        console.error('❌ خطأ في إنشاء التذكرة:', err);
        await interaction.editReply({ content: '❌ فشل إنشاء التذكرة! تأكد إن الكاتيجوري موجود والبوت عنده الصلاحيات.' });
    }
}

// ══════════════════════ إغلاق التذكرة ══════════════════════
async function handleTicketClose(interaction, client) {
    const guildData = getGuildData(interaction.guild.id);
    const config = guildData.tickets;

    if (!config?.categoryId || interaction.channel.parentId !== config.categoryId) {
        return interaction.reply({ content: '❌ هذي مو قناة تذكرة!', flags: MessageFlags.Ephemeral });
    }

    if (interaction.channel.name.startsWith('closed-')) {
        return interaction.reply({ content: '⚠️ التذكرة مقفلة بالفعل!', flags: MessageFlags.Ephemeral });
    }

    const newName = `closed-${interaction.channel.name}`;
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
        new ButtonBuilder().setCustomId('ticket_delete').setLabel('🗑️ حذف التذكرة').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('ticket_reopen').setLabel('🔓 إعادة فتح').setStyle(ButtonStyle.Success),
    );

    await interaction.reply({ embeds: [embed], components: [row] });
}

// ══════════════════════ حذف التذكرة ══════════════════════
async function handleTicketDelete(interaction, client) {
    const guildData = getGuildData(interaction.guild.id);
    const config = guildData.tickets;

    // حفظ المحادثة
    if (config?.transcriptChannelId) {
        const transcriptChannel = interaction.guild.channels.cache.get(config.transcriptChannelId);
        if (transcriptChannel) {
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
    }

    // حذف من البيانات
    if (guildData.activeTickets) {
        const idx = guildData.activeTickets.findIndex(t => t.channelId === interaction.channel.id);
        if (idx !== -1) guildData.activeTickets.splice(idx, 1);
        saveGuildData(interaction.guild.id, guildData);
    }

    await interaction.reply({ content: '🗑️ سيتم حذف التذكرة خلال 5 ثواني...' });
    setTimeout(() => interaction.channel.delete().catch(() => { }), 5000);
}

// ══════════════════════ إعادة فتح ══════════════════════
async function handleTicketReopen(interaction, client) {
    const guildData = getGuildData(interaction.guild.id);

    if (!interaction.channel.name.startsWith('closed-')) {
        return interaction.reply({ content: '⚠️ التذكرة مفتوحة بالفعل!', flags: MessageFlags.Ephemeral });
    }

    const originalName = interaction.channel.name.replace('closed-', '');
    await interaction.channel.setName(originalName);

    const ticket = guildData.activeTickets?.find(t => t.channelId === interaction.channel.id);
    if (ticket) {
        await interaction.channel.permissionOverwrites.edit(ticket.userId, {
            SendMessages: true, ViewChannel: true,
        }).catch(() => { });
    }

    const embed = new EmbedBuilder()
        .setColor('#43b581')
        .setTitle('🔓 تم إعادة فتح التذكرة')
        .setDescription(`تم الفتح بواسطة ${interaction.user}`)
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_close').setLabel('🔒 إغلاق').setStyle(ButtonStyle.Secondary),
    );

    await interaction.reply({ embeds: [embed], components: [row] });
}

// ══════════════════════ أدوار التفاعل — زر ══════════════════════
async function handleReactionRoleToggle(interaction, roleId) {
    const member = interaction.member;
    const role = interaction.guild.roles.cache.get(roleId);

    if (!role) {
        return interaction.reply({ content: '❌ الرول مو موجود!', flags: MessageFlags.Ephemeral });
    }

    try {
        if (member.roles.cache.has(roleId)) {
            await member.roles.remove(role);
            await interaction.reply({ content: `❌ تم إزالة ${role} منك.`, flags: MessageFlags.Ephemeral });
        } else {
            await member.roles.add(role);
            await interaction.reply({ content: `✅ تم إعطاءك ${role}!`, flags: MessageFlags.Ephemeral });
        }
    } catch (err) {
        await interaction.reply({ content: '❌ ما أقدر أعطيك هالرول! تأكد من صلاحيات البوت.', flags: MessageFlags.Ephemeral });
    }
}

// ══════════════════════ أدوار التفاعل — قائمة ══════════════════════
async function handleReactionRoleSelect(interaction) {
    const member = interaction.member;
    const selectedRoles = interaction.values;

    // جلب كل الأدوار المتاحة من الداتا
    const guildData = getGuildData(interaction.guild.id);
    const rrData = guildData.reactionRoles?.find(r => r.messageId === interaction.message.id);
    if (!rrData) return interaction.reply({ content: '❌ بيانات غير موجودة!', flags: MessageFlags.Ephemeral });

    const allRoleIds = rrData.roles.map(r => r.roleId);
    const added = [];
    const removed = [];

    for (const roleId of allRoleIds) {
        const role = interaction.guild.roles.cache.get(roleId);
        if (!role) continue;

        try {
            if (selectedRoles.includes(roleId)) {
                if (!member.roles.cache.has(roleId)) {
                    await member.roles.add(role);
                    added.push(role.toString());
                }
            } else {
                if (member.roles.cache.has(roleId)) {
                    await member.roles.remove(role);
                    removed.push(role.toString());
                }
            }
        } catch { /* ignore */ }
    }

    const parts = [];
    if (added.length) parts.push(`✅ مضاف: ${added.join(' ')}`);
    if (removed.length) parts.push(`❌ محذوف: ${removed.join(' ')}`);

    await interaction.reply({
        content: parts.length ? parts.join('\n') : '✅ ما تغير شي!',
        flags: MessageFlags.Ephemeral,
    });
}

