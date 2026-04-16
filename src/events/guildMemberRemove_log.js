const { Events, EmbedBuilder } = require('discord.js');
const { sendLog } = require('../utils/logger');

module.exports = {
    name: Events.GuildMemberRemove,
    once: false,

    async execute(member, client) {
        const joinedAt = member.joinedTimestamp ? Math.floor(member.joinedTimestamp / 1000) : null;
        const roles = member.roles.cache
            .filter(r => r.id !== member.guild.id)
            .map(r => `${r}`)
            .slice(0, 10);

        const embed = new EmbedBuilder()
            .setColor('#ed4245')
            .setTitle('📤 عضو غادر')
            .setDescription(`${member.user.tag} غادر السيرفر`)
            .addFields(
                { name: '👤 العضو', value: `${member.user.tag}`, inline: true },
                { name: '🆔 الآيدي', value: `\`${member.id}\``, inline: true },
                { name: '📅 دخل', value: joinedAt ? `<t:${joinedAt}:R>` : '`غير معروف`', inline: true },
                { name: '👥 العدد الحالي', value: `${member.guild.memberCount}`, inline: true },
            )
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .setTimestamp();

        if (roles.length > 0) {
            embed.addFields({ name: '🎭 أدواره', value: roles.join(' ') });
        }

        await sendLog(member.guild, 'memberLeave', embed);
    },
};
