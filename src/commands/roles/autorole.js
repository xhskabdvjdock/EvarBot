const { SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
    MessageFlags } = require('discord.js');
const { getGuildData, saveGuildData } = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autorole')
        .setDescription('🎭 أدوار تلقائية عند دخول عضو')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)

        .addSubcommand(sub =>
            sub.setName('add')
                .setDescription('إضافة رول تلقائي')
                .addRoleOption(opt =>
                    opt.setName('role').setDescription('الرول').setRequired(true)))

        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('حذف رول تلقائي')
                .addRoleOption(opt =>
                    opt.setName('role').setDescription('الرول').setRequired(true)))

        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('عرض الأدوار التلقائية'))

        .addSubcommand(sub =>
            sub.setName('toggle')
                .setDescription('تفعيل أو تعطيل الأدوار التلقائية')),

    async execute(interaction, client) {
        const sub = interaction.options.getSubcommand();
        switch (sub) {
            case 'add': return handleAdd(interaction, client);
            case 'remove': return handleRemove(interaction, client);
            case 'list': return handleList(interaction, client);
            case 'toggle': return handleToggle(interaction, client);
        }
    },
};

async function handleAdd(interaction, client) {
    const role = interaction.options.getRole('role');
    const guildData = getGuildData(interaction.guild.id);

    if (!guildData.autorole) guildData.autorole = { enabled: true, roles: [] };

    if (guildData.autorole.roles.includes(role.id)) {
        return interaction.reply({
            embeds: [new EmbedBuilder().setColor('#ed4245').setDescription(`❌ ${role} موجود بالفعل!`)],
            flags: MessageFlags.Ephemeral,
        });
    }

    if (guildData.autorole.roles.length >= 10) {
        return interaction.reply({
            embeds: [new EmbedBuilder().setColor('#ed4245').setDescription('❌ الحد الأقصى 10 أدوار تلقائية!')],
            flags: MessageFlags.Ephemeral,
        });
    }

    guildData.autorole.roles.push(role.id);
    saveGuildData(interaction.guild.id, guildData);

    const embed = new EmbedBuilder()
        .setColor('#43b581')
        .setDescription(`✅ تمت إضافة ${role} كرول تلقائي!\nكل عضو جديد بيحصل عليه.`)
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleRemove(interaction, client) {
    const role = interaction.options.getRole('role');
    const guildData = getGuildData(interaction.guild.id);

    if (!guildData.autorole?.roles?.includes(role.id)) {
        return interaction.reply({
            embeds: [new EmbedBuilder().setColor('#ed4245').setDescription(`❌ ${role} مو موجود بالقائمة!`)],
            flags: MessageFlags.Ephemeral,
        });
    }

    guildData.autorole.roles = guildData.autorole.roles.filter(r => r !== role.id);
    saveGuildData(interaction.guild.id, guildData);

    const embed = new EmbedBuilder()
        .setColor('#43b581')
        .setDescription(`✅ تمت إزالة ${role} من الأدوار التلقائية.`)
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleList(interaction, client) {
    const guildData = getGuildData(interaction.guild.id);
    const roles = guildData.autorole?.roles || [];

    const embed = new EmbedBuilder()
        .setColor('#5865f2')
        .setTitle('🎭 الأدوار التلقائية')
        .addFields(
            { name: 'الحالة', value: guildData.autorole?.enabled !== false ? '✅ مفعّل' : '❌ معطّل', inline: true },
            { name: 'العدد', value: `${roles.length}/10`, inline: true },
        )
        .setTimestamp();

    if (roles.length > 0) {
        embed.addFields({
            name: '📋 القائمة',
            value: roles.map((r, i) => `${i + 1}. <@&${r}>`).join('\n'),
        });
    } else {
        embed.setDescription('ما في أدوار تلقائية بعد. استخدم `/autorole add`');
    }

    await interaction.reply({ embeds: [embed] });
}

async function handleToggle(interaction, client) {
    const guildData = getGuildData(interaction.guild.id);
    if (!guildData.autorole) guildData.autorole = { enabled: true, roles: [] };

    guildData.autorole.enabled = !guildData.autorole.enabled;
    saveGuildData(interaction.guild.id, guildData);

    const embed = new EmbedBuilder()
        .setColor(guildData.autorole.enabled ? '#43b581' : '#faa61a')
        .setDescription(guildData.autorole.enabled
            ? '✅ تم تفعيل الأدوار التلقائية!'
            : '❌ تم تعطيل الأدوار التلقائية.')
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}
