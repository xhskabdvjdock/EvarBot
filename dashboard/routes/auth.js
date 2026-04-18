const express = require('express');
const axios = require('axios');
const router = express.Router();

const DISCORD_API = 'https://discord.com/api/v10';
const MAX_RETRIES = 5;
const CALLBACK_COOLDOWN_MS = Number(process.env.OAUTH_CALLBACK_COOLDOWN_MS || 15000);
const DISCORD_REQ_MIN_INTERVAL_MS = Number(process.env.OAUTH_MIN_INTERVAL_MS || 1200);
const callbackCooldownByIp = new Map();
let lastDiscordReqAt = 0;

function getClientIp(req) {
    const fwd = req.headers['x-forwarded-for'];
    if (typeof fwd === 'string' && fwd.trim()) {
        return fwd.split(',')[0].trim();
    }
    return req.ip || 'unknown';
}

function isInCooldown(req) {
    const ip = getClientIp(req);
    const now = Date.now();
    const until = callbackCooldownByIp.get(ip) || 0;
    if (until > now) return true;
    callbackCooldownByIp.set(ip, now + CALLBACK_COOLDOWN_MS);
    return false;
}

function getRetryDelayMs(attempt, retryAfterSeconds) {
    const serverDelay = Number(retryAfterSeconds || 0) * 1000;
    const backoff = Math.min(30000 * (2 ** attempt), 120000);
    return Math.max(serverDelay, backoff);
}

async function discordRequest(fn, label) {
    let lastError;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            const elapsed = Date.now() - lastDiscordReqAt;
            const waitMs = DISCORD_REQ_MIN_INTERVAL_MS - elapsed;
            if (waitMs > 0) {
                await new Promise((resolve) => setTimeout(resolve, waitMs));
            }
            lastDiscordReqAt = Date.now();
            return await fn();
        } catch (err) {
            lastError = err;
            const data = err?.response?.data || {};
            const status = err?.response?.status;
            const retryable = status === 429 || data?.retryable === true;
            if (!retryable || attempt === MAX_RETRIES) break;

            const delayMs = getRetryDelayMs(attempt, data?.retry_after);
            console.warn(`⚠️ OAuth2 ${label}: rate limited (attempt ${attempt + 1}/${MAX_RETRIES + 1}), retry in ${Math.round(delayMs / 1000)}s`);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
    }
    throw lastError;
}

// رابط تسجيل الدخول
router.get('/login', (req, res) => {
    const clientId = process.env.CLIENT_ID;
    const callbackUrl = encodeURIComponent(process.env.CALLBACK_URL || 'http://localhost:3000/auth/callback');
    const scope = encodeURIComponent('identify guilds');

    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${callbackUrl}&response_type=code&scope=${scope}`;
    res.redirect(authUrl);
});

// معالجة الـ Callback
router.get('/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.redirect('/');
    if (isInCooldown(req)) {
        return res.redirect('/?error=rate_limited');
    }

    try {
        // الحصول على التوكن
        const tokenRes = await discordRequest(
            () => axios.post(`${DISCORD_API}/oauth2/token`, new URLSearchParams({
                client_id: process.env.CLIENT_ID,
                client_secret: process.env.CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: process.env.CALLBACK_URL || 'http://localhost:3000/auth/callback',
                scope: 'identify guilds',
            }), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            }),
            'token'
        );

        const { access_token, token_type } = tokenRes.data;

        // جلب معلومات المستخدم
        const userRes = await discordRequest(
            () => axios.get(`${DISCORD_API}/users/@me`, {
                headers: { Authorization: `${token_type} ${access_token}` },
            }),
            'users/@me'
        );

        // جلب السيرفرات
        const guildsRes = await discordRequest(
            () => axios.get(`${DISCORD_API}/users/@me/guilds`, {
                headers: { Authorization: `${token_type} ${access_token}` },
            }),
            'users/@me/guilds'
        );

        // فلترة السيرفرات اللي عنده صلاحية إدارتها
        const manageableGuilds = guildsRes.data.filter(g => {
            const perms = BigInt(g.permissions);
            return (perms & BigInt(0x20)) === BigInt(0x20); // MANAGE_GUILD
        });

        // حفظ في السيشن
        req.session.user = userRes.data;
        req.session.guilds = manageableGuilds;
        req.session.token = access_token;

        res.redirect('/dashboard');
    } catch (err) {
        const status = err?.response?.status;
        const data = err?.response?.data || {};
        console.error('❌ خطأ في OAuth2:', data || err.message);
        if (status === 429 || data?.retryable === true) {
            return res.redirect('/?error=rate_limited');
        }
        res.redirect('/?error=auth_failed');
    }
});

// تسجيل الخروج
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// جلب بيانات المستخدم
router.get('/user', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Not logged in' });
    res.json({
        user: req.session.user,
        guilds: req.session.guilds,
    });
});

module.exports = router;
