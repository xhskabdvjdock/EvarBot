const { Events, EmbedBuilder } = require('discord.js');
const { sendLog } = require('../utils/logger');

module.exports = {
    name: Events.GuildMemberUpdate,
    once: false,

    async execute(oldMember, newMember, client) {
        // تغيير أدوار فقط
        const oldRoles = oldMember.roles.cache;
        const newRoles = newMember.roles.cache;

        const addedRoles = newRoles.filter(r => !oldRoles.has(r.id));
        const removedRoles = oldRoles.filter(r => !newRoles.has(r.id));

        if (addedRoles.size === 0 && removedRoles.size === 0) return;

        const embed = new EmbedBuilder()
            .setColor('#5865f2')
            .setTitle('🎭 تغيير أدوار')
            .addFields(
                { name: '👤 العضو', value: `${newMember} (${newMember.user.tag})`, inline: true },
                { name: '📅 الوقت', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
            )
            .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
            .setTimestamp();

        if (addedRoles.size > 0) {
            embed.addFields({ name: '✅ أدوار مضافة', value: addedRoles.map(r => `${r}`).join(' ') });
        }
        if (removedRoles.size > 0) {
            embed.addFields({ name: '❌ أدوار محذوفة', value: removedRoles.map(r => `${r}`).join(' ') });
        }

        await sendLog(newMember.guild, 'memberRoleUpdate', embed);
    },
};
