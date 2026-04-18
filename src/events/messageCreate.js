const { Events, EmbedBuilder, AttachmentBuilder, PermissionsBitField } = require('discord.js');
const { getGuildData, saveGuildData } = require('../utils/database');
const { chat } = require('../utils/gemini');
const axios = require('axios');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

// تخزين مؤقت للكولداون
const cooldowns = new Map();

module.exports = {
    name: Events.MessageCreate,
    once: false,

    async execute(message, client) {
        // تجاهل البوتات والـ DM
        if (message.author.bot || !message.guild) return;

        const guildData = getGuildData(message.guild.id);

        // ══════ GIF Tool (Image/Video -> GIF) ══════
        if (await handleGifTool(message, guildData)) {
            return;
        }

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

async function handleGifTool(message, guildData) {
    const cfg = guildData.gifTool;
    if (!cfg?.enabled) return false;
    if (!cfg.channelId || cfg.channelId !== message.channel.id) return false;
    if (!message.attachments?.size) return false;

    if (!hasGifToolAccess(message.member, cfg)) {
        await sendTempMessage(message, '❌ ما عندك صلاحية استخدام أداة التحويل إلى GIF هنا.');
        return true;
    }

    const attachment = message.attachments.find((a) => isSupportedByConfig(a, cfg));
    if (!attachment) {
        await sendTempMessage(message, '❌ الملف غير مسموح. الإعداد الحالي لا يقبل هذا النوع.');
        return true;
    }

    const maxBytes = Math.max(1, Number(cfg.maxFileSizeMb || 20)) * 1024 * 1024;
    if (attachment.size > maxBytes) {
        await sendTempMessage(message, `❌ حجم الملف أكبر من الحد المسموح (${cfg.maxFileSizeMb || 20}MB).`);
        return true;
    }

    const tmpDir = path.join(os.tmpdir(), 'evarbot-gif');
    await fsp.mkdir(tmpDir, { recursive: true });

    const inputExt = getSafeExt(attachment.name || '');
    const inputPath = path.join(tmpDir, `${message.id}-${Date.now()}${inputExt}`);
    const outputPath = path.join(tmpDir, `${message.id}-${Date.now()}.gif`);

    try {
        await downloadFile(attachment.url, inputPath);

        const mediaType = detectMediaType(attachment);
        if (mediaType === 'video') {
            const duration = await getMediaDurationSeconds(inputPath);
            const maxDur = Number(cfg.maxVideoDurationSec || 12);
            if (duration && duration > maxDur) {
                await sendTempMessage(message, `❌ مدة الفيديو أكبر من الحد المسموح (${maxDur} ثانية).`);
                return true;
            }
            await convertVideoToGif(inputPath, outputPath, cfg);
        } else {
            await convertImageToGif(inputPath, outputPath, cfg);
        }

        const gifAttachment = new AttachmentBuilder(outputPath, { name: `${path.parse(attachment.name || 'converted').name}.gif` });
        await message.reply({
            content: `✅ تم التحويل إلى GIF بنجاح بواسطة <@${message.author.id}>`,
            files: [gifAttachment],
        });

        if (cfg.deleteSourceAfterConvert !== false) {
            const canDelete = message.guild.members.me?.permissionsIn(message.channel).has(PermissionsBitField.Flags.ManageMessages);
            if (canDelete) {
                await message.delete().catch(() => { });
            }
        }
    } catch (err) {
        console.error('❌ GIF convert error:', err);
        await sendTempMessage(message, `❌ فشل التحويل إلى GIF: ${String(err.message || err).slice(0, 180)}`);
    } finally {
        await safeUnlink(inputPath);
        await safeUnlink(outputPath);
    }

    return true;
}

function hasGifToolAccess(member, cfg) {
    if (!member) return false;
    const mode = cfg.accessMode || 'everyone';
    if (mode === 'everyone') return true;
    if (mode === 'roles') {
        const roles = cfg.allowedRoleIds || [];
        return roles.some((id) => member.roles.cache.has(id));
    }
    if (mode === 'users') {
        const users = cfg.allowedUserIds || [];
        return users.includes(member.id);
    }
    return false;
}

function detectMediaType(attachment) {
    const ct = (attachment.contentType || '').toLowerCase();
    const name = (attachment.name || '').toLowerCase();
    if (ct.startsWith('video/') || /\.(mp4|mov|webm|mkv|avi|m4v)$/i.test(name)) return 'video';
    return 'image';
}

function isSupportedByConfig(attachment, cfg) {
    const type = detectMediaType(attachment);
    if (cfg.allowedTypes === 'image') return type === 'image';
    if (cfg.allowedTypes === 'video') return type === 'video';
    return type === 'image' || type === 'video';
}

function getSafeExt(filename) {
    const ext = path.extname(filename || '').toLowerCase();
    if (/^\.[a-z0-9]{1,6}$/i.test(ext)) return ext;
    return '.bin';
}

async function downloadFile(url, destPath) {
    const response = await axios.get(url, { responseType: 'stream', timeout: 30000 });
    await new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(destPath);
        response.data.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

async function getMediaDurationSeconds(inputPath) {
    const args = ['-i', inputPath];
    const output = await runFfmpeg(args, true);
    const match = output.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/i);
    if (!match) return null;
    const h = Number(match[1]);
    const m = Number(match[2]);
    const s = Number(match[3]);
    return (h * 3600) + (m * 60) + s;
}

async function convertImageToGif(inputPath, outputPath, cfg) {
    const width = Math.max(120, Number(cfg.outputWidth || 480));
    const fps = Math.max(5, Number(cfg.fps || 15));
    const filter = `fps=${fps},scale='min(${width},iw)':-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer`;
    const args = [
        '-y',
        '-loop', '1',
        '-t', '4',
        '-i', inputPath,
        '-vf', filter,
        outputPath,
    ];
    await runFfmpeg(args);
}

async function convertVideoToGif(inputPath, outputPath, cfg) {
    const width = Math.max(120, Number(cfg.outputWidth || 480));
    const fps = Math.max(5, Number(cfg.fps || 15));
    const maxDur = Math.max(1, Number(cfg.maxVideoDurationSec || 12));
    const filter = `fps=${fps},scale='min(${width},iw)':-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer`;
    const args = [
        '-y',
        '-ss', '0',
        '-t', String(maxDur),
        '-i', inputPath,
        '-vf', filter,
        outputPath,
    ];
    await runFfmpeg(args);
}

async function runFfmpeg(args, allowFailureOutput = false) {
    if (!ffmpegPath) throw new Error('ffmpeg-static غير متوفر');
    return await new Promise((resolve, reject) => {
        const proc = spawn(ffmpegPath, args, { windowsHide: true });
        let stderr = '';
        proc.stderr.on('data', (d) => { stderr += d.toString(); });
        proc.on('error', reject);
        proc.on('close', (code) => {
            if (code === 0 || allowFailureOutput) return resolve(stderr);
            reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-250)}`));
        });
    });
}

async function safeUnlink(filePath) {
    if (!filePath) return;
    await fsp.unlink(filePath).catch(() => { });
}

async function sendTempMessage(message, content) {
    const sent = await message.reply({ content }).catch(() => null);
    if (sent) setTimeout(() => sent.delete().catch(() => { }), 10000);
}

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
