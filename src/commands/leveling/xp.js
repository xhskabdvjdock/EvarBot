const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { getGuildData, saveGuildData } = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('xp')
        .setDescription('⚙️ إدارة XP الأعضاء')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

        .addSubcommand(sub =>
            sub.setName('add')
                .setDescription('إضافة XP لعضو')
                .addUserOption(opt => opt.setName('user').setDescription('العضو').setRequired(true))
                .addIntegerOption(opt => opt.setName('amount').setDescription('كمية الـ XP').setRequired(true).setMinValue(1)),
        )
        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('إزالة XP من عضو')
                .addUserOption(opt => opt.setName('user').setDescription('العضو').setRequired(true))
                .addIntegerOption(opt => opt.setName('amount').setDescription('كمية الـ XP').setRequired(true).setMinValue(1)),
        )
        .addSubcommand(sub =>
            sub.setName('set')
                .setDescription('تحديد مستوى عضو')
                .addUserOption(opt => opt.setName('user').setDescription('العضو').setRequired(true))
                .addIntegerOption(opt => opt.setName('level').setDescription('المستوى').setRequired(true).setMinValue(0)),
        )
        .addSubcommand(sub =>
            sub.setName('reset')
                .setDescription('إعادة تعيين XP عضو أو الكل')
                .addUserOption(opt => opt.setName('user').setDescription('العضو (اتركه فاضي لإعادة تعيين الكل)').setRequired(false)),
        ),

    async execute(interaction, client) {
        const sub = interaction.options.getSubcommand();
        const guildData = getGuildData(interaction.guild.id);

        if (!guildData.levels) guildData.levels = {};

        switch (sub) {
            case 'add': {
                const user = interaction.options.getUser('user');
                const amount = interaction.options.getInteger('amount');

                if (!guildData.levels[user.id]) {
                    guildData.levels[user.id] = { xp: 0, level: 0, totalXp: 0, messages: 0 };
                }
                guildData.levels[user.id].xp += amount;
                guildData.levels[user.id].totalXp += amount;

                // تحقق من اللفل أب
                let leveledUp = false;
                while (guildData.levels[user.id].xp >= xpNeeded(guildData.levels[user.id].level)) {
                    guildData.levels[user.id].xp -= xpNeeded(guildData.levels[user.id].level);
                    guildData.levels[user.id].level += 1;
                    leveledUp = true;
                }

                saveGuildData(interaction.guild.id, guildData);

                const embed = new EmbedBuilder()
                    .setColor(client.config.successColor)
                    .setDescription(`✅ تم إضافة **${amount} XP** لـ ${user}${leveledUp ? `\n🎉 وصل **المستوى ${guildData.levels[user.id].level}**!` : ''}`)
                    .setTimestamp();
                return interaction.reply({ embeds: [embed] });
            }

            case 'remove': {
                const user = interaction.options.getUser('user');
                const amount = interaction.options.getInteger('amount');

                if (!guildData.levels[user.id]) {
                    return interaction.reply({
                        embeds: [errorEmbed(client, 'هذا العضو ما عنده XP!')],
                        flags: MessageFlags.Ephemeral,
                    });
                }

                guildData.levels[user.id].xp = Math.max(0, guildData.levels[user.id].xp - amount);
                guildData.levels[user.id].totalXp = Math.max(0, guildData.levels[user.id].totalXp - amount);
                saveGuildData(interaction.guild.id, guildData);

                const embed = new EmbedBuilder()
                    .setColor(client.config.warnColor)
                    .setDescription(`⚠️ تم إزالة **${amount} XP** من ${user}`)
                    .setTimestamp();
                return interaction.reply({ embeds: [embed] });
            }

            case 'set': {
                const user = interaction.options.getUser('user');
                const level = interaction.options.getInteger('level');

                if (!guildData.levels[user.id]) {
                    guildData.levels[user.id] = { xp: 0, level: 0, totalXp: 0, messages: 0 };
                }

                // حساب إجمالي XP للمستوى المحدد
                let totalXp = 0;
                for (let i = 0; i < level; i++) {
                    totalXp += xpNeeded(i);
                }

                guildData.levels[user.id].level = level;
                guildData.levels[user.id].xp = 0;
                guildData.levels[user.id].totalXp = totalXp;
                saveGuildData(interaction.guild.id, guildData);

                const embed = new EmbedBuilder()
                    .setColor(client.config.successColor)
                    .setDescription(`✅ تم تحديد مستوى ${user} إلى **المستوى ${level}**`)
                    .setTimestamp();
                return interaction.reply({ embeds: [embed] });
            }

            case 'reset': {
                const user = interaction.options.getUser('user');

                if (user) {
                    delete guildData.levels[user.id];
                    saveGuildData(interaction.guild.id, guildData);

                    const embed = new EmbedBuilder()
                        .setColor(client.config.warnColor)
                        .setDescription(`🔄 تم إعادة تعيين XP لـ ${user}`)
                        .setTimestamp();
                    return interaction.reply({ embeds: [embed] });
                } else {
                    guildData.levels = {};
                    saveGuildData(interaction.guild.id, guildData);

                    const embed = new EmbedBuilder()
                        .setColor(client.config.errorColor)
                        .setDescription('🔄 تم إعادة تعيين XP **جميع الأعضاء**!')
                        .setTimestamp();
                    return interaction.reply({ embeds: [embed] });
                }
            }
        }
    },
};

function xpNeeded(level) {
    return 5 * Math.pow(level, 2) + 50 * level + 100;
}

function errorEmbed(client, message) {
    return new EmbedBuilder()
        .setColor(client.config.errorColor)
        .setDescription(`❌ ${message}`)
        .setTimestamp();
}
