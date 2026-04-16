const { Events, EmbedBuilder } = require('discord.js');
const { sendLog } = require('../utils/logger');

module.exports = {
    name: Events.GuildMemberAdd,
    once: false,

    async execute(member, client) {
        const accountAge = Math.floor(member.user.createdTimestamp / 1000);
        const memberCount = member.guild.memberCount;

        const embed = new EmbedBuilder()
            .setColor('#43b581')
            .setTitle('📥 عضو جديد!')
            .setDescription(`${member} انضم للسيرفر`)
            .addFields(
                { name: '👤 العضو', value: `${member.user.tag}`, inline: true },
                { name: '🆔 الآيدي', value: `\`${member.id}\``, inline: true },
                { name: '📅 إنشاء الحساب', value: `<t:${accountAge}:R>`, inline: true },
                { name: '👥 عدد الأعضاء', value: `${memberCount}`, inline: true },
            )
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .setTimestamp();

        // تحذير إذا الحساب جديد (أقل من 7 أيام)
        const ageMs = Date.now() - member.user.createdTimestamp;
        if (ageMs < 7 * 24 * 60 * 60 * 1000) {
            embed.addFields({ name: '⚠️ تنبيه', value: '🆕 حساب جديد! (أقل من 7 أيام)' });
        }

        await sendLog(member.guild, 'memberJoin', embed);
    },
};
