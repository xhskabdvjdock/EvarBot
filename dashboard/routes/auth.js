const express = require('express');
const axios = require('axios');
const router = express.Router();

const DISCORD_API = 'https://discord.com/api/v10';

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

    try {
        // الحصول على التوكن
        const tokenRes = await axios.post(`${DISCORD_API}/oauth2/token`, new URLSearchParams({
            client_id: process.env.CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: process.env.CALLBACK_URL || 'http://localhost:3000/auth/callback',
            scope: 'identify guilds',
        }), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        const { access_token, token_type } = tokenRes.data;

        // جلب معلومات المستخدم
        const userRes = await axios.get(`${DISCORD_API}/users/@me`, {
            headers: { Authorization: `${token_type} ${access_token}` },
        });

        // جلب السيرفرات
        const guildsRes = await axios.get(`${DISCORD_API}/users/@me/guilds`, {
            headers: { Authorization: `${token_type} ${access_token}` },
        });

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
        console.error('❌ خطأ في OAuth2:', err.response?.data || err.message);
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
