const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { getGuildData, updateGuildData } = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warnings')
        .setDescription('📋 عرض أو إدارة تحذيرات عضو')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)

        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('عرض تحذيرات عضو')
                .addUserOption(opt =>
                    opt.setName('user')
                        .setDescription('العضو')
                        .setRequired(true),
                ),
        )

        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('حذف تحذير معين')
                .addUserOption(opt =>
                    opt.setName('user')
                        .setDescription('العضو')
                        .setRequired(true),
                )
                .addStringOption(opt =>
                    opt.setName('id')
                        .setDescription('رقم التحذير')
                        .setRequired(true),
                ),
        )

        .addSubcommand(sub =>
            sub.setName('clear')
                .setDescription('حذف جميع تحذيرات عضو')
                .addUserOption(opt =>
                    opt.setName('user')
                        .setDescription('العضو')
                        .setRequired(true),
                ),
        ),

    async execute(interaction, client) {
        const sub = interaction.options.getSubcommand();

        switch (sub) {
            case 'list': return handleList(interaction, client);
            case 'remove': return handleRemove(interaction, client);
            case 'clear': return handleClear(interaction, client);
        }
    },
};

async function handleList(interaction, client) {
    const target = interaction.options.getUser('user');
    const guildData = getGuildData(interaction.guild.id);
    const warnings = guildData.warnings?.[target.id] || [];

    if (warnings.length === 0) {
        const embed = new EmbedBuilder()
            .setColor(client.config.successColor)
            .setDescription(`✅ **${target.tag}** ما عنده أي تحذيرات!`)
            .setTimestamp();
        return interaction.reply({ embeds: [embed] });
    }

    const warningList = warnings.map((w, i) => {
        const date = new Date(w.date);
        const timestamp = `<t:${Math.floor(date.getTime() / 1000)}:R>`;
        return `**${i + 1}.** \`${w.id}\` — ${w.reason}\n   👮 ${w.moderatorTag} • ${timestamp}`;
    }).join('\n\n');

    const embed = new EmbedBuilder()
        .setColor(client.config.warnColor)
        .setTitle(`⚠️ تحذيرات ${target.tag}`)
        .setThumbnail(target.displayAvatarURL({ dynamic: true }))
        .setDescription(warningList)
        .setFooter({ text: `إجمالي: ${warnings.length} تحذير` })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleRemove(interaction, client) {
    const target = interaction.options.getUser('user');
    const warnId = interaction.options.getString('id');
    const guildData = getGuildData(interaction.guild.id);

    if (!guildData.warnings?.[target.id]) {
        return interaction.reply({
            embeds: [errorEmbed(client, 'هذا العضو ما عنده تحذيرات!')],
            flags: MessageFlags.Ephemeral,
        });
    }

    const index = guildData.warnings[target.id].findIndex(w => w.id === warnId);
    if (index === -1) {
        return interaction.reply({
            embeds: [errorEmbed(client, `التحذير \`${warnId}\` مو موجود!`)],
            flags: MessageFlags.Ephemeral,
        });
    }

    const removed = guildData.warnings[target.id].splice(index, 1)[0];
    updateGuildData(interaction.guild.id, 'warnings', guildData.warnings);

    const embed = new EmbedBuilder()
        .setColor(client.config.successColor)
        .setTitle('✅ تم حذف التحذير')
        .addFields(
            { name: '👤 العضو', value: target.tag, inline: true },
            { name: '🔑 رقم التحذير', value: `\`${warnId}\``, inline: true },
            { name: '📋 السبب', value: removed.reason },
            { name: '📊 التحذيرات المتبقية', value: `${guildData.warnings[target.id].length}` },
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleClear(interaction, client) {
    const target = interaction.options.getUser('user');
    const guildData = getGuildData(interaction.guild.id);

    if (!guildData.warnings?.[target.id] || guildData.warnings[target.id].length === 0) {
        return interaction.reply({
            embeds: [errorEmbed(client, 'هذا العضو ما عنده تحذيرات!')],
            flags: MessageFlags.Ephemeral,
        });
    }

    const count = guildData.warnings[target.id].length;
    guildData.warnings[target.id] = [];
    updateGuildData(interaction.guild.id, 'warnings', guildData.warnings);

    const embed = new EmbedBuilder()
        .setColor(client.config.successColor)
        .setTitle('🗑️ تم حذف جميع التحذيرات')
        .addFields(
            { name: '👤 العضو', value: target.tag, inline: true },
            { name: '📊 تحذيرات محذوفة', value: `${count}`, inline: true },
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

function errorEmbed(client, message) {
    return new EmbedBuilder()
        .setColor(client.config.errorColor)
        .setDescription(`❌ ${message}`)
        .setTimestamp();
}
