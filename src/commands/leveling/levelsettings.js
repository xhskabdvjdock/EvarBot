const { SlashCommandBuilder,
    EmbedBuilder,
    ChannelType,
    PermissionFlagsBits,
    MessageFlags } = require('discord.js');
const { getGuildData, updateGuildData } = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('levelsettings')
        .setDescription('⚙️ إعدادات نظام المستويات')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

        .addSubcommand(sub =>
            sub.setName('toggle')
                .setDescription('تفعيل أو تعطيل نظام المستويات')
                .addStringOption(opt =>
                    opt.setName('status').setDescription('تفعيل أو تعطيل').setRequired(true)
                        .addChoices({ name: '✅ تفعيل', value: 'on' }, { name: '❌ تعطيل', value: 'off' }),
                ),
        )
        .addSubcommand(sub =>
            sub.setName('channel')
                .setDescription('قناة إشعارات اللفل أب')
                .addChannelOption(opt =>
                    opt.setName('channel').setDescription('القناة').setRequired(true).addChannelTypes(ChannelType.GuildText),
                ),
        )
        .addSubcommand(sub =>
            sub.setName('notify')
                .setDescription('طريقة إشعار اللفل أب')
                .addStringOption(opt =>
                    opt.setName('mode').setDescription('الطريقة').setRequired(true)
                        .addChoices(
                            { name: '📢 قناة محددة', value: 'channel' },
                            { name: '💬 نفس القناة', value: 'same' },
                            { name: '📩 رسالة خاصة', value: 'dm' },
                        ),
                ),
        )
        .addSubcommand(sub =>
            sub.setName('xprate')
                .setDescription('تحديد نطاق الـ XP لكل رسالة')
                .addIntegerOption(opt => opt.setName('min').setDescription('الحد الأدنى').setRequired(true).setMinValue(1).setMaxValue(100))
                .addIntegerOption(opt => opt.setName('max').setDescription('الحد الأقصى').setRequired(true).setMinValue(1).setMaxValue(200)),
        )
        .addSubcommand(sub =>
            sub.setName('cooldown')
                .setDescription('مدة الكولداون بين كل رسالة (بالثواني)')
                .addIntegerOption(opt => opt.setName('seconds').setDescription('المدة بالثواني').setRequired(true).setMinValue(0).setMaxValue(300)),
        )
        .addSubcommand(sub =>
            sub.setName('message')
                .setDescription('تخصيص رسالة اللفل أب')
                .addStringOption(opt => opt.setName('text').setDescription('الرسالة ({user} {username} {level} {server})').setRequired(true)),
        )
        .addSubcommand(sub =>
            sub.setName('levelrole')
                .setDescription('إضافة رول عند وصول مستوى معين')
                .addIntegerOption(opt => opt.setName('level').setDescription('المستوى').setRequired(true).setMinValue(1))
                .addRoleOption(opt => opt.setName('role').setDescription('الرول').setRequired(true)),
        )
        .addSubcommand(sub =>
            sub.setName('settings')
                .setDescription('عرض إعدادات المستويات'),
        ),

    async execute(interaction, client) {
        const sub = interaction.options.getSubcommand();

        switch (sub) {
            case 'toggle': {
                const enabled = interaction.options.getString('status') === 'on';
                updateGuildData(interaction.guild.id, 'leveling', { enabled });
                const emoji = enabled ? '✅' : '❌';
                const embed = new EmbedBuilder()
                    .setColor(enabled ? client.config.successColor : client.config.errorColor)
                    .setDescription(`${emoji} نظام المستويات الآن **${enabled ? 'مفعّل' : 'معطّل'}**`)
                    .setTimestamp();
                return interaction.reply({ embeds: [embed] });
            }

            case 'channel': {
                const channel = interaction.options.getChannel('channel');
                updateGuildData(interaction.guild.id, 'leveling', { channelId: channel.id });
                const embed = new EmbedBuilder()
                    .setColor(client.config.successColor)
                    .setDescription(`✅ قناة إشعارات اللفل أب: ${channel}`)
                    .setTimestamp();
                return interaction.reply({ embeds: [embed] });
            }

            case 'notify': {
                const mode = interaction.options.getString('mode');
                updateGuildData(interaction.guild.id, 'leveling', { notifyMode: mode });
                const modeText = { channel: '📢 قناة محددة', same: '💬 نفس القناة', dm: '📩 رسالة خاصة' };
                const embed = new EmbedBuilder()
                    .setColor(client.config.successColor)
                    .setDescription(`✅ طريقة الإشعار: **${modeText[mode]}**`)
                    .setTimestamp();
                return interaction.reply({ embeds: [embed] });
            }

            case 'xprate': {
                const min = interaction.options.getInteger('min');
                const max = interaction.options.getInteger('max');
                if (min > max) {
                    return interaction.reply({
                        embeds: [new EmbedBuilder().setColor(client.config.errorColor).setDescription('❌ الحد الأدنى لازم يكون أقل من الأقصى!')],
                        flags: MessageFlags.Ephemeral,
                    });
                }
                updateGuildData(interaction.guild.id, 'leveling', { xpMin: min, xpMax: max });
                const embed = new EmbedBuilder()
                    .setColor(client.config.successColor)
                    .setDescription(`✅ نطاق الـ XP: **${min}** — **${max}** لكل رسالة`)
                    .setTimestamp();
                return interaction.reply({ embeds: [embed] });
            }

            case 'cooldown': {
                const seconds = interaction.options.getInteger('seconds');
                updateGuildData(interaction.guild.id, 'leveling', { cooldown: seconds });
                const embed = new EmbedBuilder()
                    .setColor(client.config.successColor)
                    .setDescription(`✅ الكولداون: **${seconds} ثانية**`)
                    .setTimestamp();
                return interaction.reply({ embeds: [embed] });
            }

            case 'message': {
                const text = interaction.options.getString('text');
                updateGuildData(interaction.guild.id, 'leveling', { levelUpMessage: text });
                const embed = new EmbedBuilder()
                    .setColor(client.config.successColor)
                    .setTitle('✅ تم تحديث رسالة اللفل أب')
                    .setDescription(`**الرسالة:**\n${text}`)
                    .addFields({ name: '📝 المتغيرات', value: '`{user}` `{username}` `{level}` `{server}`' })
                    .setTimestamp();
                return interaction.reply({ embeds: [embed] });
            }

            case 'levelrole': {
                const level = interaction.options.getInteger('level');
                const role = interaction.options.getRole('role');
                const guildData = getGuildData(interaction.guild.id);
                const config = guildData.leveling || {};
                const roles = config.levelRoles || [];

                // تحقق إذا موجود
                const existing = roles.findIndex(r => r.level === level);
                if (existing !== -1) {
                    roles[existing].roleId = role.id;
                } else {
                    roles.push({ level, roleId: role.id });
                }
                roles.sort((a, b) => a.level - b.level);

                updateGuildData(interaction.guild.id, 'leveling', { levelRoles: roles });

                const embed = new EmbedBuilder()
                    .setColor(client.config.successColor)
                    .setDescription(`✅ عند الوصول لـ **المستوى ${level}** → يحصل على ${role}`)
                    .setTimestamp();
                return interaction.reply({ embeds: [embed] });
            }

            case 'settings': {
                const guildData = getGuildData(interaction.guild.id);
                const c = guildData.leveling || {};
                const ch = c.channelId ? `<#${c.channelId}>` : '`غير محدد`';
                const modeText = { channel: '📢 قناة محددة', same: '💬 نفس القناة', dm: '📩 خاص' };
                const rolesText = (c.levelRoles || []).length > 0
                    ? c.levelRoles.map(r => `مستوى **${r.level}** → <@&${r.roleId}>`).join('\n')
                    : '`لا يوجد`';

                const embed = new EmbedBuilder()
                    .setColor(client.config.embedColor)
                    .setTitle('⚙️ إعدادات نظام المستويات')
                    .addFields(
                        { name: 'الحالة', value: c.enabled ? '✅ مفعّل' : '❌ معطّل', inline: true },
                        { name: 'القناة', value: ch, inline: true },
                        { name: 'الإشعار', value: modeText[c.notifyMode] || '💬 نفس القناة', inline: true },
                        { name: 'XP/رسالة', value: `**${c.xpMin || 15}** — **${c.xpMax || 25}**`, inline: true },
                        { name: 'الكولداون', value: `**${c.cooldown || 60}** ثانية`, inline: true },
                        { name: '🎭 أدوار المستويات', value: rolesText },
                        { name: '📝 رسالة اللفل أب', value: `\`\`\`${c.levelUpMessage || 'افتراضي'}\`\`\`` },
                    )
                    .setTimestamp();
                return interaction.reply({ embeds: [embed] });
            }
        }
    },
};
