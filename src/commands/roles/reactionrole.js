const { SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    MessageFlags } = require('discord.js');
const { getGuildData, saveGuildData } = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reactionrole')
        .setDescription('🎯 نظام أدوار التفاعل')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)

        .addSubcommand(sub =>
            sub.setName('button')
                .setDescription('إنشاء رسالة أدوار بأزرار')
                .addStringOption(opt =>
                    opt.setName('title').setDescription('عنوان الرسالة').setRequired(true))
                .addStringOption(opt =>
                    opt.setName('description').setDescription('وصف').setRequired(false))
                .addStringOption(opt =>
                    opt.setName('color').setDescription('اللون HEX').setRequired(false)))

        .addSubcommand(sub =>
            sub.setName('dropdown')
                .setDescription('إنشاء رسالة أدوار بقائمة منسدلة')
                .addStringOption(opt =>
                    opt.setName('title').setDescription('عنوان الرسالة').setRequired(true))
                .addStringOption(opt =>
                    opt.setName('description').setDescription('وصف').setRequired(false))
                .addStringOption(opt =>
                    opt.setName('color').setDescription('اللون HEX').setRequired(false)))

        .addSubcommand(sub =>
            sub.setName('addrole')
                .setDescription('إضافة رول لرسالة أدوار موجودة')
                .addStringOption(opt =>
                    opt.setName('message_id').setDescription('آيدي الرسالة').setRequired(true))
                .addRoleOption(opt =>
                    opt.setName('role').setDescription('الرول').setRequired(true))
                .addStringOption(opt =>
                    opt.setName('label').setDescription('النص على الزر').setRequired(false))
                .addStringOption(opt =>
                    opt.setName('emoji').setDescription('إيموجي').setRequired(false))
                .addStringOption(opt =>
                    opt.setName('style').setDescription('لون الزر (أزرار فقط)')
                        .addChoices(
                            { name: '🔵 أزرق', value: 'Primary' },
                            { name: '⚪ رمادي', value: 'Secondary' },
                            { name: '🟢 أخضر', value: 'Success' },
                            { name: '🔴 أحمر', value: 'Danger' },
                        ).setRequired(false)))

        .addSubcommand(sub =>
            sub.setName('removerole')
                .setDescription('حذف رول من رسالة أدوار')
                .addStringOption(opt =>
                    opt.setName('message_id').setDescription('آيدي الرسالة').setRequired(true))
                .addRoleOption(opt =>
                    opt.setName('role').setDescription('الرول المراد حذفه').setRequired(true)))

        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('عرض جميع رسائل الأدوار')),

    async execute(interaction, client) {
        const sub = interaction.options.getSubcommand();
        switch (sub) {
            case 'button': return handleCreate(interaction, client, 'button');
            case 'dropdown': return handleCreate(interaction, client, 'dropdown');
            case 'addrole': return handleAddRole(interaction, client);
            case 'removerole': return handleRemoveRole(interaction, client);
            case 'list': return handleList(interaction, client);
        }
    },
};

const BTN_STYLES = {
    Primary: ButtonStyle.Primary,
    Secondary: ButtonStyle.Secondary,
    Success: ButtonStyle.Success,
    Danger: ButtonStyle.Danger,
};

// ══════════════════ إنشاء رسالة ══════════════════
async function handleCreate(interaction, client, mode) {
    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description') || '';
    const color = interaction.options.getString('color') || '#5865f2';

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(description || 'اختر الأدوار اللي تبيها ⬇️')
        .setFooter({ text: 'استخدم /reactionrole addrole لإضافة أدوار' })
        .setTimestamp();

    const msg = await interaction.channel.send({ embeds: [embed] });

    // حفظ في الداتا
    const guildData = getGuildData(interaction.guild.id);
    if (!guildData.reactionRoles) guildData.reactionRoles = [];

    guildData.reactionRoles.push({
        messageId: msg.id,
        channelId: interaction.channel.id,
        mode,
        roles: [],
    });

    saveGuildData(interaction.guild.id, guildData);

    await interaction.reply({
        embeds: [new EmbedBuilder().setColor('#43b581')
            .setDescription(`✅ تم إنشاء رسالة الأدوار (${mode === 'button' ? 'أزرار' : 'قائمة'})!\n📝 آيدي الرسالة: \`${msg.id}\`\nاستخدم \`/reactionrole addrole\` لإضافة أدوار.`)],
        flags: MessageFlags.Ephemeral,
    });
}

// ══════════════════ إضافة رول ══════════════════
async function handleAddRole(interaction, client) {
    const messageId = interaction.options.getString('message_id');
    const role = interaction.options.getRole('role');
    const label = interaction.options.getString('label') || role.name;
    const emoji = interaction.options.getString('emoji') || '';
    const style = interaction.options.getString('style') || 'Primary';

    const guildData = getGuildData(interaction.guild.id);
    const rrData = guildData.reactionRoles?.find(r => r.messageId === messageId);

    if (!rrData) {
        return interaction.reply({
            embeds: [new EmbedBuilder().setColor('#ed4245').setDescription('❌ ما لقيت رسالة بهالآيدي!')],
            flags: MessageFlags.Ephemeral,
        });
    }

    if (rrData.roles.length >= 25) {
        return interaction.reply({
            embeds: [new EmbedBuilder().setColor('#ed4245').setDescription('❌ الحد الأقصى 25 رول!')],
            flags: MessageFlags.Ephemeral,
        });
    }

    if (rrData.roles.find(r => r.roleId === role.id)) {
        return interaction.reply({
            embeds: [new EmbedBuilder().setColor('#ed4245').setDescription(`❌ ${role} موجود بالفعل!`)],
            flags: MessageFlags.Ephemeral,
        });
    }

    rrData.roles.push({ roleId: role.id, label, emoji, style });
    saveGuildData(interaction.guild.id, guildData);

    // تحديث الرسالة
    try {
        const channel = interaction.guild.channels.cache.get(rrData.channelId);
        const msg = await channel.messages.fetch(messageId);
        await updateRoleMessage(msg, rrData);
    } catch (err) {
        console.error('❌ فشل تحديث رسالة الأدوار:', err.message);
    }

    await interaction.reply({
        embeds: [new EmbedBuilder().setColor('#43b581')
            .setDescription(`✅ تمت إضافة ${role} لرسالة الأدوار!`)],
        flags: MessageFlags.Ephemeral,
    });
}

// ══════════════════ حذف رول ══════════════════
async function handleRemoveRole(interaction, client) {
    const messageId = interaction.options.getString('message_id');
    const role = interaction.options.getRole('role');

    const guildData = getGuildData(interaction.guild.id);
    const rrData = guildData.reactionRoles?.find(r => r.messageId === messageId);

    if (!rrData) {
        return interaction.reply({
            embeds: [new EmbedBuilder().setColor('#ed4245').setDescription('❌ ما لقيت رسالة بهالآيدي!')],
            flags: MessageFlags.Ephemeral,
        });
    }

    rrData.roles = rrData.roles.filter(r => r.roleId !== role.id);
    saveGuildData(interaction.guild.id, guildData);

    try {
        const channel = interaction.guild.channels.cache.get(rrData.channelId);
        const msg = await channel.messages.fetch(messageId);
        await updateRoleMessage(msg, rrData);
    } catch (err) { /* ignore */ }

    await interaction.reply({
        embeds: [new EmbedBuilder().setColor('#43b581')
            .setDescription(`✅ تمت إزالة ${role} من رسالة الأدوار.`)],
        flags: MessageFlags.Ephemeral,
    });
}

// ══════════════════ القائمة ══════════════════
async function handleList(interaction, client) {
    const guildData = getGuildData(interaction.guild.id);
    const rrs = guildData.reactionRoles || [];

    if (rrs.length === 0) {
        return interaction.reply({
            embeds: [new EmbedBuilder().setColor('#5865f2').setDescription('ما في رسائل أدوار بعد. استخدم `/reactionrole button` أو `/reactionrole dropdown`')],
        });
    }

    const list = rrs.map((rr, i) =>
        `**${i + 1}.** <#${rr.channelId}> | ${rr.mode === 'button' ? '🔘 أزرار' : '📋 قائمة'} | ${rr.roles.length} رول\n🆔 \`${rr.messageId}\``
    ).join('\n\n');

    const embed = new EmbedBuilder()
        .setColor('#5865f2')
        .setTitle('🎯 رسائل الأدوار')
        .setDescription(list)
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

// ══════════════════ تحديث الرسالة ══════════════════
async function updateRoleMessage(msg, rrData) {
    const components = [];

    if (rrData.mode === 'button') {
        // أزرار — كل 5 أزرار في صف
        let row = new ActionRowBuilder();
        for (let i = 0; i < rrData.roles.length; i++) {
            const r = rrData.roles[i];
            const btn = new ButtonBuilder()
                .setCustomId(`rr_${r.roleId}`)
                .setLabel(r.label)
                .setStyle(BTN_STYLES[r.style] || ButtonStyle.Primary);

            if (r.emoji) {
                try { btn.setEmoji(r.emoji); } catch { /* ignore */ }
            }

            row.addComponents(btn);

            if ((i + 1) % 5 === 0 || i === rrData.roles.length - 1) {
                components.push(row);
                row = new ActionRowBuilder();
            }
        }
    } else {
        // قائمة منسدلة
        if (rrData.roles.length > 0) {
            const options = rrData.roles.map(r => {
                const opt = { label: r.label, value: r.roleId };
                if (r.emoji) {
                    try {
                        // تحقق إذا كاستم إيموجي
                        const customMatch = r.emoji.match(/<a?:(\w+):(\d+)>/);
                        if (customMatch) {
                            opt.emoji = { id: customMatch[2], name: customMatch[1] };
                        } else {
                            opt.emoji = { name: r.emoji.replace(/\uFE0F/g, '') };
                        }
                    } catch { /* ignore */ }
                }
                return opt;
            });

            const menu = new StringSelectMenuBuilder()
                .setCustomId('rr_select')
                .setPlaceholder('اختر الأدوار...')
                .setMinValues(0)
                .setMaxValues(options.length)
                .addOptions(options);

            components.push(new ActionRowBuilder().addComponents(menu));
        }
    }

    await msg.edit({ components });
}
