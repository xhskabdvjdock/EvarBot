const { Events, EmbedBuilder } = require('discord.js');
const { getGuildData, saveGuildData } = require('../utils/database');
const { chat } = require('../utils/gemini');

// تخزين مؤقت للكولداون
const cooldowns = new Map();

module.exports = {
    name: Events.MessageCreate,
    once: false,

    async execute(message, client) {
        // تجاهل البوتات والـ DM
        if (message.author.bot || !message.guild) return;

        const guildData = getGuildData(message.guild.id);

        // ══════ AI Auto-Reply ══════
        const aiConfig = guildData.ai;
        if (aiConfig?.enabled && aiConfig?.channelId === message.channel.id) {
            try {
                await message.channel.sendTyping();

                const response = await chat(
                    message.author.id,
                    message.content,
                    aiConfig.persona,
                    message.guild.name,
                );

                // تقسيم إذا طويل
                if (response.length <= 2000) {
                    await message.reply({ content: response });
                } else {
                    const chunks = [];
                    let remaining = response;
                    while (remaining.length > 0) {
                        chunks.push(remaining.slice(0, 2000));
                        remaining = remaining.slice(2000);
                    }
                    await message.reply({ content: chunks[0] });
                    for (let i = 1; i < chunks.length; i++) {
                        await message.channel.send(chunks[i]);
                    }
                }
            } catch (err) {
                console.error('❌ AI auto-reply error:', err.message);
            }
            return; // ما نكمل للـ XP في قناة الـ AI
        }

        // ══════ Leveling System ══════
        const config = guildData.leveling;

        // إذا المستويات مو مفعلة
        if (!config || !config.enabled) return;

        // تحقق من القنوات المتجاهلة
        if (config.ignoredChannels?.includes(message.channel.id)) return;

        // كولداون
        const cooldownKey = `${message.guild.id}-${message.author.id}`;
        const now = Date.now();
        const cooldownTime = (config.cooldown || 60) * 1000;

        if (cooldowns.has(cooldownKey)) {
            const lastXp = cooldowns.get(cooldownKey);
            if (now - lastXp < cooldownTime) return;
        }
        cooldowns.set(cooldownKey, now);

        // إعداد بيانات الـ XP
        if (!guildData.levels) guildData.levels = {};
        if (!guildData.levels[message.author.id]) {
            guildData.levels[message.author.id] = {
                xp: 0,
                level: 0,
                totalXp: 0,
                messages: 0,
            };
        }

        const userData = guildData.levels[message.author.id];
        const xpMin = config.xpMin || 15;
        const xpMax = config.xpMax || 25;
        const xpGain = Math.floor(Math.random() * (xpMax - xpMin + 1)) + xpMin;

        userData.xp += xpGain;
        userData.totalXp += xpGain;
        userData.messages += 1;

        // حساب المستوى المطلوب
        const xpNeeded = calculateXpNeeded(userData.level);

        // لفل أب!
        if (userData.xp >= xpNeeded) {
            userData.xp -= xpNeeded;
            userData.level += 1;

            // إشعار لفل أب
            await sendLevelUpNotification(message, client, config, userData);

            // أدوار المستوى
            await assignLevelRoles(message.member, config, userData.level);
        }

        saveGuildData(message.guild.id, guildData);
    },
};

/**
 * حساب الـ XP المطلوب للمستوى التالي
 * الصيغة: 5 * (level^2) + 50 * level + 100
 */
function calculateXpNeeded(level) {
    return 5 * Math.pow(level, 2) + 50 * level + 100;
}

/**
 * إرسال إشعار لفل أب
 */
async function sendLevelUpNotification(message, client, config, userData) {
    let msgText = config.levelUpMessage || '🎉 مبروك {user}! وصلت **المستوى {level}**!';
    msgText = msgText
        .replace(/{user}/g, `<@${message.author.id}>`)
        .replace(/{username}/g, message.author.username)
        .replace(/{level}/g, userData.level)
        .replace(/{server}/g, message.guild.name);

    const embed = new EmbedBuilder()
        .setColor('#ffd700')
        .setDescription(msgText)
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true, size: 128 }))
        .setTimestamp();

    try {
        if (config.notifyMode === 'dm') {
            await message.author.send({ embeds: [embed] }).catch(() => { });
        } else if (config.notifyMode === 'channel' && config.channelId) {
            const channel = message.guild.channels.cache.get(config.channelId);
            if (channel) await channel.send({ embeds: [embed] });
        } else {
            // نفس القناة
            await message.channel.send({ embeds: [embed] });
        }
    } catch (err) {
        console.error('❌ خطأ في إشعار اللفل أب:', err.message);
    }
}

/**
 * إعطاء أدوار حسب المستوى
 */
async function assignLevelRoles(member, config, level) {
    if (!config.levelRoles || config.levelRoles.length === 0) return;

    for (const lr of config.levelRoles) {
        if (level >= lr.level) {
            try {
                if (!member.roles.cache.has(lr.roleId)) {
                    await member.roles.add(lr.roleId).catch(() => { });
                }
            } catch (err) { /* ما عنده صلاحية */ }
        }
    }
}

// تصدير دالة حساب الـ XP للاستخدام في أوامر أخرى
module.exports.calculateXpNeeded = calculateXpNeeded;
