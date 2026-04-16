const { Events, EmbedBuilder } = require('discord.js');
const { getGuildData } = require('../utils/database');
const { replacePlaceholders } = require('../utils/helpers');

module.exports = {
    name: Events.GuildMemberRemove,
    once: false,

    async execute(member, client) {
        const guildData = getGuildData(member.guild.id);
        const config = guildData.goodbye;

        if (!config.enabled) return;
        if (!config.channelId) return;

        const channel = member.guild.channels.cache.get(config.channelId);
        if (!channel) return;

        const embed = buildGoodbyeEmbed(config, member, member.guild, client);

        try {
            await channel.send({ embeds: [embed] });
        } catch (err) {
            console.error(`❌ خطأ في إرسال رسالة الوداع في ${member.guild.name}:`, err.message);
        }
    },
};

function buildGoodbyeEmbed(config, member, guild, client) {
    const messageText = replacePlaceholders(config.message, member, guild);
    const embed = new EmbedBuilder();

    // اللون
    embed.setColor(config.embedColor || client.config.errorColor);

    // الكاتب (Author)
    if (config.authorText !== null && config.authorText !== undefined) {
        embed.setAuthor({
            name: replacePlaceholders(config.authorText, member, guild),
            iconURL: guild.iconURL({ dynamic: true }),
        });
    } else {
        embed.setAuthor({
            name: 'عضو غادر السيرفر 😢',
            iconURL: guild.iconURL({ dynamic: true }),
        });
    }

    // العنوان
    if (config.titleText) {
        embed.setTitle(replacePlaceholders(config.titleText, member, guild));
    }

    // الوصف
    embed.setDescription(messageText);

    // الصورة المصغرة
    const thumbOption = config.thumbnail || 'user';
    if (thumbOption === 'user') {
        embed.setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }));
    } else if (thumbOption === 'server') {
        const icon = guild.iconURL({ dynamic: true, size: 512 });
        if (icon) embed.setThumbnail(icon);
    } else if (thumbOption === 'custom' && config.thumbnailUrl) {
        embed.setThumbnail(config.thumbnailUrl);
    }

    // الحقول
    if (config.showFields !== false) {
        const joinedAt = member.joinedTimestamp;
        let stayDuration = 'غير معروف';
        if (joinedAt) {
            const days = Math.floor((Date.now() - joinedAt) / (1000 * 60 * 60 * 24));
            if (days < 1) stayDuration = 'أقل من يوم';
            else if (days === 1) stayDuration = 'يوم واحد';
            else if (days < 30) stayDuration = `${days} يوم`;
            else if (days < 365) stayDuration = `${Math.floor(days / 30)} شهر`;
            else stayDuration = `${Math.floor(days / 365)} سنة`;
        }

        embed.addFields(
            { name: '👤 المستخدم', value: member.user.tag, inline: true },
            { name: '🔢 الأعضاء المتبقين', value: `${guild.memberCount}`, inline: true },
            { name: '⏱️ مدة البقاء', value: stayDuration, inline: true },
        );

        // الأدوار
        const roles = member.roles.cache
            .filter(r => r.id !== guild.id)
            .sort((a, b) => b.position - a.position)
            .map(r => r.toString())
            .slice(0, 10);
        if (roles.length > 0) {
            embed.addFields({ name: `🎭 الأدوار (${roles.length})`, value: roles.join(', '), inline: false });
        }
    }

    // البانر
    if (config.bannerUrl) {
        embed.setImage(config.bannerUrl);
    }

    // الفوتر
    if (config.footerText !== null && config.footerText !== undefined) {
        embed.setFooter({
            text: replacePlaceholders(config.footerText, member, guild),
            iconURL: guild.iconURL({ dynamic: true }),
        });
    } else {
        embed.setFooter({
            text: guild.name,
            iconURL: guild.iconURL({ dynamic: true }),
        });
    }

    // الطابع الزمني
    if (config.showTimestamp !== false) {
        embed.setTimestamp();
    }

    return embed;
}
