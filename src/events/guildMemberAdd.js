const { Events, EmbedBuilder } = require('discord.js');
const { getGuildData } = require('../utils/database');
const { replacePlaceholders } = require('../utils/helpers');

module.exports = {
    name: Events.GuildMemberAdd,
    once: false,

    async execute(member, client) {
        const guildData = getGuildData(member.guild.id);
        const config = guildData.welcome;

        if (!config.enabled) return;

        // ——— رسالة الترحيب في القناة ———
        if (config.channelId) {
            const channel = member.guild.channels.cache.get(config.channelId);
            if (channel) {
                const embed = buildWelcomeEmbed(config, member, member.guild, client);

                try {
                    await channel.send({ embeds: [embed] });
                } catch (err) {
                    console.error(`❌ خطأ في إرسال رسالة الترحيب في ${member.guild.name}:`, err.message);
                }
            }
        }

        // ——— رسالة خاصة (DM) ———
        if (config.dmEnabled) {
            const dmText = replacePlaceholders(config.dmMessage, member, member.guild);

            const dmEmbed = new EmbedBuilder()
                .setColor(config.embedColor || client.config.successColor)
                .setTitle(`مرحباً بك في ${member.guild.name}! 💜`)
                .setDescription(dmText)
                .setThumbnail(member.guild.iconURL({ dynamic: true, size: 256 }))
                .setFooter({ text: member.guild.name, iconURL: member.guild.iconURL({ dynamic: true }) })
                .setTimestamp();

            try {
                await member.send({ embeds: [dmEmbed] });
            } catch (err) {
                console.log(`⚠️ ما قدرت أرسل DM لـ ${member.user.tag} (الخاص مقفل)`);
            }
        }
    },
};

function buildWelcomeEmbed(config, member, guild, client) {
    const messageText = replacePlaceholders(config.message, member, guild);
    const embed = new EmbedBuilder();

    // اللون
    embed.setColor(config.embedColor || client.config.successColor);

    // الكاتب (Author)
    if (config.authorText !== null && config.authorText !== undefined) {
        embed.setAuthor({
            name: replacePlaceholders(config.authorText, member, guild),
            iconURL: guild.iconURL({ dynamic: true }),
        });
    } else {
        embed.setAuthor({
            name: 'عضو جديد انضم! 🎉',
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
        const accountAge = Math.floor((Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24));
        const accountAgeText = accountAge < 7 ? '⚠️ حساب جديد!' : `${accountAge} يوم`;
        const createdAt = `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`;

        embed.addFields(
            { name: '👤 المستخدم', value: member.user.tag, inline: true },
            { name: '🔢 رقم العضو', value: `#${guild.memberCount}`, inline: true },
            { name: '📅 عمر الحساب', value: `${accountAgeText} (${createdAt})`, inline: true },
        );
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
            text: `${guild.name} • نتمنى لك وقت ممتع!`,
            iconURL: guild.iconURL({ dynamic: true }),
        });
    }

    // الطابع الزمني
    if (config.showTimestamp !== false) {
        embed.setTimestamp();
    }

    return embed;
}
