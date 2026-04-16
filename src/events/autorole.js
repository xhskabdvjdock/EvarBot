const { Events } = require('discord.js');
const { getGuildData } = require('../utils/database');

module.exports = {
    name: Events.GuildMemberAdd,
    once: false,

    async execute(member, client) {
        const guildData = getGuildData(member.guild.id);
        const config = guildData.autorole;

        if (!config?.enabled || !config?.roles?.length) return;

        for (const roleId of config.roles) {
            try {
                const role = member.guild.roles.cache.get(roleId);
                if (role && !member.roles.cache.has(roleId)) {
                    await member.roles.add(role).catch(() => { });
                }
            } catch (err) {
                // صامت — الرول ممكن انحذف أو ما عنده صلاحية
            }
        }
    },
};
