const { SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
    ChannelType,
    MessageFlags } = require('discord.js');
const { getGuildData, updateGuildData } = require('../../utils/database');
const { chat, clearConversation } = require('../../utils/gemini');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ai')
        .setDescription('🤖 نظام الذكاء الاصطناعي')

        // ═══ محادثة ═══
        .addSubcommand(sub =>
            sub.setName('chat')
                .setDescription('تحدث مع الذكاء الاصطناعي')
                .addStringOption(opt =>
                    opt.setName('message').setDescription('رسالتك').setRequired(true)))

        // ═══ مسح المحادثة ═══
        .addSubcommand(sub =>
            sub.setName('clear')
                .setDescription('مسح ذاكرة المحادثة'))

        // ═══ شخصية الـ AI ═══
        .addSubcommand(sub =>
            sub.setName('persona')
                .setDescription('تخصيص شخصية الذكاء الاصطناعي')
                .addStringOption(opt =>
                    opt.setName('name').setDescription('اسم الـ AI').setRequired(false))
                .addStringOption(opt =>
                    opt.setName('personality').setDescription('وصف الشخصية').setRequired(false))
                .addStringOption(opt =>
                    opt.setName('language').setDescription('لغة الرد').setRequired(false)
                        .addChoices(
                            { name: 'العربية', value: 'العربية' },
                            { name: 'English', value: 'English' },
                            { name: 'العربية والإنجليزية', value: 'العربية والإنجليزية' },
                        ))
                .addStringOption(opt =>
                    opt.setName('rules').setDescription('قواعد إضافية للـ AI').setRequired(false)))

        // ═══ قناة الـ AI ═══
        .addSubcommand(sub =>
            sub.setName('channel')
                .setDescription('تحديد قناة للرد التلقائي')
                .addChannelOption(opt =>
                    opt.setName('channel').setDescription('القناة (اتركها فارغة للتعطيل)').setRequired(false)
                        .addChannelTypes(ChannelType.GuildText)))

        // ═══ تفعيل/تعطيل ═══
        .addSubcommand(sub =>
            sub.setName('toggle')
                .setDescription('تفعيل أو تعطيل نظام الذكاء الاصطناعي'))

        // ═══ الإعدادات ═══
        .addSubcommand(sub =>
            sub.setName('settings')
                .setDescription('عرض إعدادات الذكاء الاصطناعي')),

    async execute(interaction, client) {
        const sub = interaction.options.getSubcommand();
        switch (sub) {
            case 'chat': return handleChat(interaction, client);
            case 'clear': return handleClear(interaction, client);
            case 'persona': return handlePersona(interaction, client);
            case 'channel': return handleChannel(interaction, client);
            case 'toggle': return handleToggle(interaction, client);
            case 'settings': return handleSettings(interaction, client);
        }
    },
};

// ══════════════════════ محادثة ══════════════════════
async function handleChat(interaction, client) {
    const guildData = getGuildData(interaction.guild.id);
    const config = guildData.ai || {};

    if (!config.enabled) {
        return interaction.reply({
            embeds: [errEmbed(client, 'نظام الـ AI معطّل! استخدم `/ai toggle` للتفعيل.')],
            flags: MessageFlags.Ephemeral,
        });
    }

    const message = interaction.options.getString('message');
    await interaction.deferReply();

    const response = await chat(
        interaction.user.id,
        message,
        config.persona,
        interaction.guild.name,
    );

    // تقسيم الرد إذا كان طويل
    const chunks = splitMessage(response, 2000);

    await interaction.editReply({ content: chunks[0] });

    // إرسال باقي الأجزاء
    for (let i = 1; i < chunks.length; i++) {
        await interaction.followUp({ content: chunks[i] });
    }
}

// ══════════════════════ مسح الذاكرة ══════════════════════
async function handleClear(interaction, client) {
    clearConversation(interaction.user.id);

    const embed = new EmbedBuilder()
        .setColor('#43b581')
        .setDescription('🗑️ تم مسح ذاكرة المحادثة! الـ AI بيبدأ محادثة جديدة معك.')
        .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

// ══════════════════════ الشخصية ══════════════════════
async function handlePersona(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({ embeds: [errEmbed(client, 'تحتاج صلاحية إدارة السيرفر!')], flags: MessageFlags.Ephemeral });
    }

    const name = interaction.options.getString('name');
    const personality = interaction.options.getString('personality');
    const language = interaction.options.getString('language');
    const rules = interaction.options.getString('rules');

    const guildData = getGuildData(interaction.guild.id);
    const currentPersona = guildData.ai?.persona || {};

    const newPersona = {
        name: name || currentPersona.name || 'EvarBot AI',
        personality: personality || currentPersona.personality || 'ودود ومساعد',
        language: language || currentPersona.language || 'العربية',
        rules: rules !== null && rules !== undefined ? rules : (currentPersona.rules || ''),
    };

    updateGuildData(interaction.guild.id, 'ai', { persona: newPersona });

    const embed = new EmbedBuilder()
        .setColor('#43b581')
        .setTitle('✅ تم تحديث شخصية الـ AI!')
        .addFields(
            { name: '🤖 الاسم', value: newPersona.name, inline: true },
            { name: '🎭 الشخصية', value: newPersona.personality, inline: true },
            { name: '🌐 اللغة', value: newPersona.language, inline: true },
            { name: '📜 القواعد', value: newPersona.rules || '`لا يوجد`' },
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

// ══════════════════════ القناة ══════════════════════
async function handleChannel(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({ embeds: [errEmbed(client, 'تحتاج صلاحية إدارة السيرفر!')], flags: MessageFlags.Ephemeral });
    }

    const channel = interaction.options.getChannel('channel');

    updateGuildData(interaction.guild.id, 'ai', {
        channelId: channel?.id || null,
    });

    const embed = new EmbedBuilder()
        .setColor('#43b581')
        .setDescription(channel
            ? `✅ تم تحديد ${channel} كقناة الـ AI!\nالبوت بيرد تلقائي على أي رسالة فيها.`
            : '✅ تم إلغاء قناة الـ AI. الرد التلقائي معطّل.')
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

// ══════════════════════ تفعيل/تعطيل ══════════════════════
async function handleToggle(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({ embeds: [errEmbed(client, 'تحتاج صلاحية إدارة السيرفر!')], flags: MessageFlags.Ephemeral });
    }

    const guildData = getGuildData(interaction.guild.id);
    const newState = !(guildData.ai?.enabled);

    updateGuildData(interaction.guild.id, 'ai', { enabled: newState });

    const embed = new EmbedBuilder()
        .setColor(newState ? '#43b581' : '#faa61a')
        .setDescription(newState
            ? '✅ تم تفعيل نظام الذكاء الاصطناعي!\nاستخدم `/ai chat` أو حدد قناة بـ `/ai channel`'
            : '❌ تم تعطيل نظام الذكاء الاصطناعي.')
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

// ══════════════════════ الإعدادات ══════════════════════
async function handleSettings(interaction, client) {
    const guildData = getGuildData(interaction.guild.id);
    const c = guildData.ai || {};
    const p = c.persona || {};

    const embed = new EmbedBuilder()
        .setColor('#5865f2')
        .setTitle('⚙️ إعدادات الذكاء الاصطناعي')
        .setThumbnail(client.user.displayAvatarURL())
        .addFields(
            { name: 'الحالة', value: c.enabled ? '✅ مفعّل' : '❌ معطّل', inline: true },
            { name: '📺 القناة', value: c.channelId ? `<#${c.channelId}>` : '`غير محدد`', inline: true },
            { name: '🤖 الاسم', value: p.name || 'EvarBot AI', inline: true },
            { name: '🎭 الشخصية', value: p.personality || 'ودود ومساعد', inline: true },
            { name: '🌐 اللغة', value: p.language || 'العربية', inline: true },
            { name: '📜 القواعد', value: p.rules || '`لا يوجد`', inline: true },
        )
        .setFooter({ text: 'استخدم /ai persona لتخصيص الشخصية' })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

// ══════════════════════ مساعدات ══════════════════════
function splitMessage(text, maxLength) {
    if (text.length <= maxLength) return [text];
    const chunks = [];
    while (text.length > 0) {
        let chunk = text.slice(0, maxLength);
        // قطع عند آخر سطر جديد
        const lastNewline = chunk.lastIndexOf('\n');
        if (lastNewline > maxLength * 0.5 && text.length > maxLength) {
            chunk = chunk.slice(0, lastNewline);
        }
        chunks.push(chunk);
        text = text.slice(chunk.length);
    }
    return chunks;
}

function errEmbed(client, msg) {
    return new EmbedBuilder().setColor(client.config.errorColor).setDescription(`❌ ${msg}`).setTimestamp();
}
