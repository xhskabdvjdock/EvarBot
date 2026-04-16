const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
    ChannelType,
} = require('discord.js');
const { getGuildData, updateGuildData } = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('logs')
        .setDescription('📋 نظام التسجيلات')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

        .addSubcommand(sub =>
            sub.setName('setup')
                .setDescription('إعداد قناة التسجيلات')
                .addChannelOption(opt =>
                    opt.setName('channel').setDescription('قناة اللوق').setRequired(true)
                        .addChannelTypes(ChannelType.GuildText)))

        .addSubcommand(sub =>
            sub.setName('toggle')
                .setDescription('تفعيل أو تعطيل التسجيلات'))

        .addSubcommand(sub =>
            sub.setName('event')
                .setDescription('تفعيل/تعطيل حدث معين')
                .addStringOption(opt =>
                    opt.setName('type').setDescription('نوع الحدث').setRequired(true)
                        .addChoices(
                            { name: '🗑️ حذف رسالة', value: 'messageDelete' },
                            { name: '✏️ تعديل رسالة', value: 'messageEdit' },
                            { name: '📥 دخول عضو', value: 'memberJoin' },
                            { name: '📤 خروج عضو', value: 'memberLeave' },
                            { name: '🎭 تغيير أدوار', value: 'memberRoleUpdate' },
                            { name: '🔨 بان/أنبان', value: 'memberBan' },
                            { name: '📁 إنشاء قناة', value: 'channelCreate' },
                            { name: '🗑️ حذف قناة', value: 'channelDelete' },
                        )))

        .addSubcommand(sub =>
            sub.setName('settings')
                .setDescription('عرض إعدادات التسجيلات')),

    async execute(interaction, client) {
        const sub = interaction.options.getSubcommand();
        switch (sub) {
            case 'setup': return handleSetup(interaction, client);
            case 'toggle': return handleToggle(interaction, client);
            case 'event': return handleEvent(interaction, client);
            case 'settings': return handleSettings(interaction, client);
        }
    },
};

async function handleSetup(interaction, client) {
    const channel = interaction.options.getChannel('channel');
    updateGuildData(interaction.guild.id, 'logging', {
        enabled: true,
        channelId: channel.id,
    });

    const embed = new EmbedBuilder()
        .setColor('#43b581')
        .setTitle('✅ تم إعداد التسجيلات!')
        .setDescription(`📋 قناة اللوق: ${channel}\nالتسجيلات مفعّلة الحين!`)
        .setFooter({ text: 'استخدم /logs event لتخصيص الأحداث' })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleToggle(interaction, client) {
    const guildData = getGuildData(interaction.guild.id);
    const newState = !(guildData.logging?.enabled);
    updateGuildData(interaction.guild.id, 'logging', { enabled: newState });

    const embed = new EmbedBuilder()
        .setColor(newState ? '#43b581' : '#faa61a')
        .setDescription(newState
            ? '✅ تم تفعيل نظام التسجيلات!'
            : '❌ تم تعطيل نظام التسجيلات.')
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleEvent(interaction, client) {
    const type = interaction.options.getString('type');
    const guildData = getGuildData(interaction.guild.id);

    if (!guildData.logging.events) guildData.logging.events = {};
    const current = guildData.logging.events[type] !== false;
    guildData.logging.events[type] = !current;

    updateGuildData(interaction.guild.id, 'logging', { events: guildData.logging.events });

    const labels = {
        messageDelete: '🗑️ حذف رسالة', messageEdit: '✏️ تعديل رسالة',
        memberJoin: '📥 دخول عضو', memberLeave: '📤 خروج عضو',
        memberRoleUpdate: '🎭 تغيير أدوار', memberBan: '🔨 بان/أنبان',
        channelCreate: '📁 إنشاء قناة', channelDelete: '🗑️ حذف قناة',
    };

    const embed = new EmbedBuilder()
        .setColor(!current ? '#faa61a' : '#43b581')
        .setDescription(`${labels[type]}: ${!current ? '❌ معطّل' : '✅ مفعّل'}`)
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleSettings(interaction, client) {
    const guildData = getGuildData(interaction.guild.id);
    const c = guildData.logging || {};
    const e = c.events || {};

    const labels = {
        messageDelete: '🗑️ حذف رسالة', messageEdit: '✏️ تعديل رسالة',
        memberJoin: '📥 دخول عضو', memberLeave: '📤 خروج عضو',
        memberRoleUpdate: '🎭 تغيير أدوار', memberBan: '🔨 بان/أنبان',
        channelCreate: '📁 إنشاء قناة', channelDelete: '🗑️ حذف قناة',
    };

    const eventsList = Object.entries(labels).map(([key, label]) =>
        `${e[key] !== false ? '✅' : '❌'} ${label}`
    ).join('\n');

    const embed = new EmbedBuilder()
        .setColor('#5865f2')
        .setTitle('⚙️ إعدادات التسجيلات')
        .addFields(
            { name: 'الحالة', value: c.enabled ? '✅ مفعّل' : '❌ معطّل', inline: true },
            { name: '📺 القناة', value: c.channelId ? `<#${c.channelId}>` : '`غير محدد`', inline: true },
            { name: '📋 الأحداث', value: eventsList },
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}
