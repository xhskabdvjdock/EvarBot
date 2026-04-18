const express = require('express');
const router = express.Router();
const { getGuildData, updateGuildData } = require('../../src/utils/database');
const { getGlobalData, updateGlobalData } = require('../../src/utils/globalConfig');

// ميدل وير للتحقق من تسجيل الدخول
function requireAuth(req, res, next) {
    if (!req.session.user) return res.status(401).json({ error: 'غير مسجل الدخول' });
    next();
}

// التحقق إن المستخدم عنده صلاحية على السيرفر
function requireGuildAccess(req, res, next) {
    const guildId = req.params.id;
    const userGuilds = req.session.guilds || [];
    const hasAccess = userGuilds.some(g => g.id === guildId);

    if (!hasAccess) return res.status(403).json({ error: 'ما عندك صلاحية على هذا السيرفر' });
    next();
}

// ══════════════════════ إحصائيات البوت ══════════════════════
router.get('/stats', requireAuth, (req, res) => {
    const client = req.client;
    const uptime = client.uptime;

    const hours = Math.floor(uptime / 3600000);
    const minutes = Math.floor((uptime % 3600000) / 60000);

    res.json({
        servers: client.guilds.cache.size,
        users: client.guilds.cache.reduce((a, g) => a + g.memberCount, 0),
        channels: client.channels.cache.size,
        commands: client.commands.size,
        uptime: `${hours}h ${minutes}m`,
        uptimeMs: uptime,
        ping: client.ws.ping,
    });
});

// ══════════════════════ Lavalink (إعداد عالمي) ══════════════════════
router.get('/lavalink', requireAuth, (req, res) => {
    const g = getGlobalData();
    res.json(g.lavalink || { nodes: [] });
});

router.get('/lavalink/status', requireAuth, (req, res) => {
    try {
        const { getLavalinkStatus } = require('../../src/utils/lavalinkPlayer');
        return res.json({ success: true, status: getLavalinkStatus() });
    } catch (err) {
        return res.status(500).json({ success: false, error: `تعذر جلب الحالة: ${err.message}` });
    }
});

router.post('/lavalink', requireAuth, (req, res) => {
    try {
        const { nodes } = req.body || {};
        if (!Array.isArray(nodes) || nodes.length < 1) {
            return res.status(400).json({ error: 'nodes يجب أن تكون مصفوفة وبها عنصر واحد على الأقل' });
        }

        const cleaned = nodes.map((n, idx) => ({
            id: String(n.id || `node${idx + 1}`),
            host: String(n.host || '').trim(),
            port: Number(n.port || 2333),
            password: String(n.password || ''),
            secure: Boolean(n.secure),
        })).filter(n => n.host && n.password && Number.isFinite(n.port));

        if (cleaned.length < 1) {
            return res.status(400).json({ error: 'يجب تعبئة host/port/password بشكل صحيح' });
        }

        const updated = updateGlobalData('lavalink', { nodes: cleaned });

        // حاول إعادة تهيئة الموسيقى إن كانت موجودة
        try {
            const { reinitLavalink } = require('../../src/utils/lavalinkPlayer');
            reinitLavalink(req.client).catch(() => { });
        } catch { }

        res.json({ success: true, lavalink: updated.lavalink });
    } catch (err) {
        res.status(500).json({ error: 'فشل التحديث: ' + err.message });
    }
});

router.post('/lavalink/test', requireAuth, async (req, res) => {
    try {
        const { node } = req.body || {};
        const host = String(node?.host || '').trim();
        const port = Number(node?.port || 2333);
        const password = String(node?.password || '');
        const secure = Boolean(node?.secure);

        if (!host || !password || !Number.isFinite(port)) {
            return res.status(400).json({ success: false, error: 'الرجاء إدخال host/port/password بشكل صحيح' });
        }

        if (/example\.com/i.test(host)) {
            return res.status(400).json({ success: false, error: 'هذا Host تجريبي. أدخل عنوان Lavalink حقيقي.' });
        }

        const base = `${secure ? 'https' : 'http'}://${host}:${port}`;
        const response = await fetch(`${base}/version`, {
            headers: {
                Authorization: password,
            },
        });

        if (!response.ok) {
            const body = await response.text().catch(() => '');
            return res.status(400).json({
                success: false,
                error: `فشل /version (${response.status}). غالبًا Password أو Secure/Port غير صحيح. ${body ? `الرد: ${body.slice(0, 120)}` : ''}`.trim(),
            });
        }

        const version = (await response.text()).trim();
        if (!/^\d+\.\d+\.\d+/.test(version)) {
            return res.status(400).json({
                success: false,
                error: `الخادم ردّ بـ "${version}" وليس إصدار Lavalink صالح. هذا غالبًا ليس Lavalink أو Proxy غير صحيح.`,
            });
        }

        return res.json({ success: true, version });
    } catch (err) {
        const msg = String(err?.message || err);
        return res.status(400).json({ success: false, error: `فشل الاتصال: ${msg}` });
    }
});

// ══════════════════════ سيرفرات المستخدم ══════════════════════
router.get('/guilds', requireAuth, (req, res) => {
    const client = req.client;
    const userGuilds = req.session.guilds || [];

    // إضافة معلومات إضافية من البوت
    const guilds = userGuilds.map(g => {
        const botGuild = client.guilds.cache.get(g.id);
        return {
            ...g,
            botIn: !!botGuild,
            memberCount: botGuild?.memberCount || 0,
            icon: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : null,
        };
    });

    // السيرفرات اللي فيها البوت أول
    guilds.sort((a, b) => (b.botIn ? 1 : 0) - (a.botIn ? 1 : 0));

    res.json(guilds);
});

// ══════════════════════ معلومات سيرفر معين ══════════════════════
router.get('/guilds/:id', requireAuth, requireGuildAccess, (req, res) => {
    const client = req.client;
    const guild = client.guilds.cache.get(req.params.id);

    if (!guild) return res.status(404).json({ error: 'البوت مو في هذا السيرفر' });

    const channels = guild.channels.cache
        .filter(c => c.type === 0) // نصية فقط
        .map(c => ({ id: c.id, name: c.name }))
        .sort((a, b) => a.name.localeCompare(b.name));

    const roles = guild.roles.cache
        .filter(r => r.id !== guild.id) // بدون @everyone
        .map(r => ({ id: r.id, name: r.name, color: r.hexColor }))
        .sort((a, b) => b.position - a.position);

    res.json({
        id: guild.id,
        name: guild.name,
        icon: guild.iconURL({ dynamic: true, size: 256 }),
        memberCount: guild.memberCount,
        channels,
        roles,
        owner: guild.ownerId,
    });
});

// ══════════════════════ جلب الإعدادات ══════════════════════
router.get('/guilds/:id/settings', requireAuth, requireGuildAccess, (req, res) => {
    const settings = getGuildData(req.params.id);
    res.json(settings);
});

// ══════════════════════ تحديث الإعدادات ══════════════════════
router.post('/guilds/:id/settings/:type', requireAuth, requireGuildAccess, (req, res) => {
    const { id, type } = req.params;
    const data = req.body;

    // أنواع الإعدادات المسموحة
    const allowedTypes = ['welcome', 'goodbye', 'autorole', 'logging', 'leveling', 'tickets', 'ai', 'gifTool'];
    if (!allowedTypes.includes(type)) {
        return res.status(400).json({ error: 'نوع إعداد غير صالح' });
    }

    try {
        const updated = updateGuildData(id, type, data);
        res.json({ success: true, data: updated[type] });
    } catch (err) {
        res.status(500).json({ error: 'فشل التحديث: ' + err.message });
    }
});

// ══════════════════════ إرسال إمبد من الداشبورد ══════════════════════
router.post('/guilds/:id/send-embed', requireAuth, requireGuildAccess, async (req, res) => {
    try {
        const { channelId, embed: data } = req.body;
        const guild = req.client.guilds.cache.get(req.params.id);
        if (!guild) return res.status(404).json({ error: 'السيرفر مو موجود' });

        const channel = guild.channels.cache.get(channelId);
        if (!channel) return res.status(404).json({ error: 'القناة مو موجودة' });

        const { EmbedBuilder } = require('discord.js');
        const embed = new EmbedBuilder();

        if (data.title) embed.setTitle(data.title);
        if (data.description) embed.setDescription(data.description.replace(/\\n/g, '\n'));
        embed.setColor(data.color || '#5865f2');
        if (data.url) embed.setURL(data.url);
        if (data.thumbnail) embed.setThumbnail(data.thumbnail);
        if (data.image) embed.setImage(data.image);
        if (data.author) {
            const ad = { name: data.author };
            if (data.authorIcon) ad.iconURL = data.authorIcon;
            embed.setAuthor(ad);
        }
        if (data.footer) {
            const fd = { text: data.footer };
            if (data.footerIcon) fd.iconURL = data.footerIcon;
            embed.setFooter(fd);
        }
        if (data.timestamp) embed.setTimestamp();
        if (data.fields?.length) {
            for (const f of data.fields) {
                embed.addFields({ name: f.name, value: f.value, inline: !!f.inline });
            }
        }

        await channel.send({ embeds: [embed] });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ══════════════════════ حالة الموسيقى ══════════════════════
router.get('/guilds/:id/music', requireAuth, requireGuildAccess, (req, res) => {
    try {
        const { getPlayer } = require('../../../src/utils/musicPlayer');
        const distube = getPlayer();
        const queue = distube?.getQueue(req.params.id);

        if (!queue) {
            return res.json({ playing: false });
        }

        const song = queue.songs[0];
        const tracks = queue.songs.slice(1, 11);
        const loopModes = { 0: 'مطفي', 1: 'أغنية', 2: 'قائمة' };

        res.json({
            playing: true,
            current: {
                title: song?.name || 'غير معروف',
                author: song?.uploader?.name || 'غير معروف',
                duration: song?.formattedDuration || '0:00',
                thumbnail: song?.thumbnail || '',
                url: song?.url || '',
                requestedBy: song?.user?.tag || 'غير معروف',
            },
            volume: queue.volume,
            paused: queue.paused,
            loop: loopModes[queue.repeatMode] || 'مطفي',
            queueSize: queue.songs.length - 1,
            queue: tracks.map((t, i) => ({
                position: i + 1,
                title: t.name,
                duration: t.formattedDuration,
                author: t.uploader?.name || '',
            })),
        });
    } catch (err) {
        res.json({ playing: false, error: err.message });
    }
});

// ══════════════════════ جلب التحذيرات ══════════════════════
router.get('/guilds/:id/warnings', requireAuth, requireGuildAccess, (req, res) => {
    const settings = getGuildData(req.params.id);
    res.json(settings.warnings || {});
});

// ══════════════════════ حذف تحذير ══════════════════════
router.delete('/guilds/:id/warnings/:userId/:warnId', requireAuth, requireGuildAccess, (req, res) => {
    const { id, userId, warnId } = req.params;
    const settings = getGuildData(id);

    if (!settings.warnings?.[userId]) {
        return res.status(404).json({ error: 'ما في تحذيرات لهذا العضو' });
    }

    const index = settings.warnings[userId].findIndex(w => w.id === warnId);
    if (index === -1) return res.status(404).json({ error: 'التحذير مو موجود' });

    settings.warnings[userId].splice(index, 1);
    updateGuildData(id, 'warnings', settings.warnings);

    res.json({ success: true });
});

// ══════════════════════ ليدربورد المستويات ══════════════════════
router.get('/guilds/:id/leaderboard', requireAuth, requireGuildAccess, async (req, res) => {
    const client = req.client;
    const settings = getGuildData(req.params.id);
    const levels = settings.levels || {};

    const sorted = Object.entries(levels)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => (b.totalXp || 0) - (a.totalXp || 0))
        .slice(0, 50);

    // جلب أسماء المستخدمين
    const leaderboard = await Promise.all(sorted.map(async (entry, i) => {
        let username = 'Unknown';
        let avatar = null;
        try {
            const user = await client.users.fetch(entry.id);
            username = user.displayName || user.username;
            avatar = user.displayAvatarURL({ size: 64 });
        } catch (err) { /* */ }

        const xpNeeded = 5 * Math.pow(entry.level, 2) + 50 * entry.level + 100;
        return {
            rank: i + 1,
            userId: entry.id,
            username,
            avatar,
            level: entry.level,
            xp: entry.xp || 0,
            totalXp: entry.totalXp || 0,
            xpNeeded,
            messages: entry.messages || 0,
        };
    }));

    res.json(leaderboard);
});

// ══════════════════════ التذاكر المفتوحة ══════════════════════
router.get('/guilds/:id/tickets', requireAuth, requireGuildAccess, async (req, res) => {
    const settings = getGuildData(req.params.id);
    const tickets = settings.activeTickets || [];

    const result = await Promise.all(tickets.map(async (t) => {
        let username = t.userTag || 'Unknown';
        try {
            const user = await req.client.users.fetch(t.userId);
            username = user.displayName || user.username;
        } catch (err) { /* */ }

        return {
            channelId: t.channelId,
            userId: t.userId,
            username,
            number: t.number,
            createdAt: t.createdAt,
        };
    }));

    res.json(result);
});

module.exports = router;
