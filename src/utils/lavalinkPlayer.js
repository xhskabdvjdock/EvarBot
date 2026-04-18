const { EmbedBuilder } = require('discord.js');
const { Rest } = require('lavacord');
// lavacord v2 ships wrappers under dist (e.g. dist/discord.js.js)
const { Manager } = require('lavacord/dist/discord.js');
const { getGlobalData } = require('./globalConfig');

let manager = null;
let ready = false;
let lastError = null;
let lastReadyAt = null;
let configSource = 'global';

function toBool(value, fallback = false) {
    if (value === undefined || value === null || value === '') return fallback;
    return /^(1|true|yes|on)$/i.test(String(value).trim());
}

// لكل سيرفر: queue بسيطة
const state = new Map(); // guildId -> { player, queue, current, repeatMode, volume, paused, textChannelId }

const RepeatMode = {
    OFF: 0,
    TRACK: 1,
    QUEUE: 2,
};

function getNodes() {
    // أولوية 1: متغيرات البيئة (Render)
    const envHost = String(
        process.env.LAVALINK_HOST ||
        process.env.LAVALINK_NODE_HOST ||
        process.env.LAVALINK_SERVER_HOST ||
        ''
    ).trim();
    const envPassword = String(
        process.env.LAVALINK_PASSWORD ||
        process.env.LAVALINK_PASS ||
        process.env.LAVALINK_SERVER_PASSWORD ||
        ''
    ).trim();
    const envPort = Number(
        process.env.LAVALINK_PORT ||
        process.env.LAVALINK_NODE_PORT ||
        process.env.LAVALINK_SERVER_PORT ||
        2333
    );
    const envSecure = toBool(
        process.env.LAVALINK_SECURE ?? process.env.LAVALINK_SSL,
        envPort === 443
    );

    if (envHost && envPassword) {
        configSource = 'env';
        return [
            {
                id: process.env.LAVALINK_ID || 'env-node',
                host: envHost,
                port: envPort,
                password: envPassword,
                secure: envSecure,
            },
        ];
    }

    // أولوية 2: التخزين المحلي (الداشبورد)
    if (envHost && !envPassword) {
        console.warn('[Lavalink] LAVALINK_HOST موجود لكن كلمة المرور غير موجودة. سيتم استخدام إعدادات الداشبورد المحلية.');
    }
    const g = getGlobalData();
    const nodes = g?.lavalink?.nodes || [];
    configSource = 'global';
    return nodes.map((n, idx) => ({
        id: n.id || `node${idx + 1}`,
        host: n.host,
        port: n.port,
        password: n.password,
        secure: Boolean(n.secure),
    }));
}

function validateNodes(nodes) {
    if (!Array.isArray(nodes) || nodes.length < 1) {
        throw new Error('Lavalink nodes غير معرّفة. حدّثها من الداشبورد.');
    }
    const bad = nodes.find((n) => !n.host || !n.password || !Number.isFinite(Number(n.port)));
    if (bad) {
        throw new Error('بيانات Lavalink ناقصة (host/port/password).');
    }
    const placeholder = nodes.find((n) => /example\.com/i.test(String(n.host)));
    if (placeholder) {
        throw new Error('Lavalink host ما زال placeholder (example.com). غيّره من الداشبورد.');
    }
}

function mapLavalinkError(err) {
    const msg = String(err?.message || err || '');
    if (/Unexpected server response:\s*400/i.test(msg)) {
        return 'الخادم رفض اتصال WebSocket (400). تأكد من Secure/Port الصحيحين وأن العقدة Lavalink v4 فعلية.';
    }
    if (/didn'?t respond to \/version/i.test(msg)) {
        return 'الخادم لا يعيد إصدار Lavalink صالح من /version. غالبًا العنوان ليس Lavalink أو Password/Proxy غير صحيح.';
    }
    if (/ENOTFOUND|getaddrinfo/i.test(msg)) {
        return 'فشل DNS في الوصول إلى Host. تحقق من عنوان الخادم.';
    }
    if (/ECONNREFUSED|connect ECONNREFUSED/i.test(msg)) {
        return 'تم رفض الاتصال بالخادم. تحقق من المنفذ أو حالة الخادم.';
    }
    return msg;
}

async function initLavalink(client) {
    if (manager) return manager;
    const nodes = getNodes();
    validateNodes(nodes);
    const first = nodes[0];
    console.log(`[Lavalink] Config source: ${configSource} | node: ${first.host}:${first.port} | secure=${first.secure}`);
    manager = new Manager(client, nodes);

    manager.on('ready', (node) => {
        ready = true;
        lastError = null;
        lastReadyAt = new Date().toISOString();
        console.log(`[Lavalink] Node ready: ${node.id}`);
    });
    manager.on('disconnect', (code, reason, node) => {
        console.warn(`[Lavalink] Node disconnected: ${node?.id || 'unknown'} ${reason} (${code})`);
    });
    manager.on('error', (error, node) => {
        console.error(`[Lavalink] Node error: ${node?.id || 'unknown'}`, error);
    });

    // track end handling
    manager.on('playerTrackEnd', async (player, event) => {
        const guildId = player.guildId;
        const st = state.get(guildId);
        if (!st) return;
        const reason = event?.reason;
        if (reason === 'replaced' || reason === 'stopped' || reason === 'cleanup') return;

        const finishedTrack = st.current;

        if (st.repeatMode === RepeatMode.TRACK && finishedTrack) {
            await playEncoded(guildId, finishedTrack.encoded, true);
            return;
        }

        if (st.repeatMode === RepeatMode.QUEUE && finishedTrack) {
            st.queue.push(finishedTrack);
        }

        st.current = null;
        await playNext(guildId);
    });

    try {
        await manager.connect();
        return manager;
    } catch (err) {
        lastError = mapLavalinkError(err);
        manager = null;
        ready = false;
        throw err;
    }
}

async function reinitLavalink(client) {
    // اعادة التهيئة بعد تغيير nodes من الداشبورد
    try {
        if (manager) {
            for (const [guildId, st] of state.entries()) {
                try { await manager.leave(guildId); } catch { }
                state.delete(guildId);
            }
            try { manager.removeAllListeners(); } catch { }
        }
    } finally {
        manager = null;
        ready = false;
    }
    return await initLavalink(client);
}

function getQueue(guildId) {
    const st = state.get(guildId);
    if (!st) return null;
    return {
        channelId: st.player?.channelId || null,
        repeatMode: st.repeatMode,
        volume: st.volume,
        paused: st.paused,
        currentTrack: st.current,
        tracks: st.queue.slice(),
        size: st.queue.length,
    };
}

function getLavalinkStatus() {
    const nodes = getNodes();
    return {
        source: configSource,
        configured: nodes.length > 0,
        ready,
        managerReady: Boolean(manager),
        lastError,
        lastReadyAt,
        nodes: nodes.map((n) => ({
            id: n.id,
            host: n.host,
            port: n.port,
            secure: n.secure,
        })),
    };
}

async function ensurePlayer(client, guildId, voiceChannelId, textChannelId) {
    if (!manager) {
        try {
            await initLavalink(client);
        } catch (err) {
            const mapped = mapLavalinkError(err);
            lastError = mapped;
            throw new Error(`Lavalink غير متاح: ${mapped}`);
        }
    }
    if (!ready) {
        // لا نمنع التشغيل، لكن هذا يساعد لو كان node لم يعلن ready بعد
    }

    let st = state.get(guildId);
    if (!st) {
        st = {
            player: null,
            queue: [],
            current: null,
            repeatMode: RepeatMode.OFF,
            volume: 80,
            paused: false,
            textChannelId: textChannelId || null,
        };
        state.set(guildId, st);
    }

    st.textChannelId = textChannelId || st.textChannelId;

    if (!st.player) {
        st.player = await manager.join({
            guild: guildId,
            channel: voiceChannelId,
        });
        await st.player.setVolume(st.volume);
    }
    return st;
}

async function resolveTracks(player, query) {
    const isUrl = /^https?:\/\//i.test(query);
    const identifier = isUrl ? query : `ytsearch:${query}`;
    const res = await Rest.load(player.node, identifier);
    
    // Support Lavalink v4
    if (res.loadType === 'track') return [res.data];
    if (res.loadType === 'playlist') return res.data.tracks || [];
    if (res.loadType === 'search') return res.data || [];
    
    // Support Lavalink v3
    if (res.loadType === 'TRACK_LOADED') return [res.data || res.tracks?.[0]].filter(Boolean);
    if (res.loadType === 'PLAYLIST_LOADED') return res.tracks || res.data?.tracks || [];
    if (res.loadType === 'SEARCH_RESULT') return res.tracks || res.data || [];
    
    return [];
}

async function playEncoded(guildId, encoded, replace = false) {
    const st = state.get(guildId);
    if (!st?.player) return;
    await st.player.play(encoded, { noReplace: !replace });
    st.paused = false;
}

async function playNext(guildId) {
    const st = state.get(guildId);
    if (!st?.player) return;
    const next = st.queue.shift();
    if (!next) {
        // اترك الروم بعد مدة؟ نتركها بسيطة الآن
        return;
    }
    st.current = next;
    await playEncoded(guildId, next.encoded, true);
}

async function play(client, guildId, voiceChannelId, textChannel, query, requestedBy) {
    const st = await ensurePlayer(client, guildId, voiceChannelId, textChannel?.id);
    const tracks = await resolveTracks(st.player, query);
    const first = tracks[0];
    if (!first) throw new Error('لا توجد نتائج لهذا البحث');

    // نحول بيانات لواجهة موحدة للـ commands
    const normalized = tracks.map((t) => ({
        encoded: t.encoded || t.track, // t.track for v3 compat
        title: t.info?.title || 'Unknown',
        url: t.info?.uri || null,
        author: t.info?.author || null,
        durationMs: t.info?.length || 0,
        requestedBy,
    }));

    // أضف الكل للقائمة
    for (const t of normalized) st.queue.push(t);

    // إذا لا يوجد تشغيل حالي، ابدأ
    if (!st.current) {
        await playNext(guildId);
        // رسالة تشغيل
        const now = st.current;
        if (now && textChannel) {
            textChannel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#5865f2')
                        .setTitle('Now playing')
                        .setDescription(now.url ? `[${now.title}](${now.url})` : now.title)
                        .addFields(
                            { name: 'Author', value: now.author || 'Unknown', inline: true },
                            { name: 'Requested by', value: `${requestedBy}`, inline: true },
                        ),
                ],
            }).catch(() => { });
        }
    } else if (textChannel) {
        textChannel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor('#43b581')
                    .setTitle('Added to queue')
                    .setDescription(nowLine(normalized[0])),
            ],
        }).catch(() => { });
    }

    return { track: normalized[0], count: normalized.length };
}

function nowLine(t) {
    return t.url ? `[${t.title}](${t.url})` : t.title;
}

async function stop(guildId) {
    const st = state.get(guildId);
    if (!st?.player) return false;
    st.queue = [];
    st.current = null;
    await st.player.stop();
    try { await manager.leave(guildId); } catch { }
    st.player = null;
    return true;
}

async function skip(guildId) {
    const st = state.get(guildId);
    if (!st?.player) return false;
    await st.player.stop(); // سيؤدي لـ trackEnd ثم playNext
    return true;
}

async function pause(guildId, value) {
    const st = state.get(guildId);
    if (!st?.player) return false;
    await st.player.pause(Boolean(value));
    st.paused = Boolean(value);
    return true;
}

async function setVolume(guildId, volume) {
    const st = state.get(guildId);
    if (!st?.player) return false;
    st.volume = volume;
    await st.player.setVolume(volume);
    return true;
}

async function seek(guildId, ms) {
    const st = state.get(guildId);
    if (!st?.player) return false;
    await st.player.seek(ms);
    return true;
}

function setRepeatMode(guildId, mode) {
    const st = state.get(guildId);
    if (!st) return false;
    st.repeatMode = mode;
    return true;
}

function shuffle(guildId) {
    const st = state.get(guildId);
    if (!st || st.queue.length < 2) return false;
    for (let i = st.queue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [st.queue[i], st.queue[j]] = [st.queue[j], st.queue[i]];
    }
    return true;
}

function cleanState(guildId) {
    const st = state.get(guildId);
    if (!st) return;
    st.queue = [];
    st.current = null;
    state.delete(guildId);
}

module.exports = {
    initLavalink,
    reinitLavalink,
    getLavalinkStatus,
    getQueue,
    RepeatMode,
    play,
    stop,
    skip,
    pause,
    setVolume,
    seek,
    setRepeatMode,
    shuffle,
    cleanState,
};

