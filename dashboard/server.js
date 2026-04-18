const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');

let FileStore = null;
try {
    FileStore = require('session-file-store')(session);
} catch (err) {
    console.warn('[Dashboard] session-file-store غير متوفر. سيتم استخدام MemoryStore مؤقتًا.');
}

function startDashboard(client) {
    const app = express();
    // Render وغيرها من الاستضافات يضعون المنفذ العام في PORT
    const PORT = Number(process.env.PORT || process.env.DASHBOARD_PORT || 3000);
    const isHosted = process.env.RENDER === 'true' || process.env.NODE_ENV === 'production';

    app.set('trust proxy', 1);

    // Middleware
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    const sessionConfig = {
        secret: process.env.SESSION_SECRET || 'evarbot-secret-key-change-me',
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 1000 * 60 * 60 * 24 * 7, // 7 أيام
            secure: isHosted,
            sameSite: 'lax',
        },
    };

    if (FileStore) {
        sessionConfig.store = new FileStore({
            path: path.join(__dirname, '..', 'data', 'sessions'),
            retries: 1,
            ttl: 60 * 60 * 24 * 7,
        });
    }

    app.use(session(sessionConfig));

    // تمرير الكلاينت لكل الطلبات
    app.use((req, res, next) => {
        req.client = client;
        next();
    });

    // الملفات الثابتة
    app.use(express.static(path.join(__dirname, 'public')));

    app.get('/health', (req, res) => {
        res.status(200).type('text/plain').send('ok');
    });

    // الراوتات
    app.use('/auth', authRoutes);
    app.use('/api', apiRoutes);

    // الصفحة الرئيسية
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    app.get('/dashboard', (req, res) => {
        if (!req.session.user) return res.redirect('/');
        res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
    });

    app.get('/server/:id', (req, res) => {
        if (!req.session.user) return res.redirect('/');
        res.sendFile(path.join(__dirname, 'public', 'server.html'));
    });

    const callbackUrl = process.env.CALLBACK_URL || '';
    if (process.env.RENDER === 'true' && /localhost|127\.0\.0\.1/i.test(callbackUrl)) {
        console.warn(
            '[Dashboard] CALLBACK_URL يشير إلى localhost بينما التشغيل على Render. عيّن CALLBACK_URL إلى: ' +
                'https://YOUR-SERVICE.onrender.com/auth/callback (ونفس الرابط في Discord → OAuth2 → Redirects).'
        );
    }
    if (callbackUrl) {
        console.log(`[Dashboard] OAuth redirect (يجب أن يطابق Discord Portal): ${callbackUrl}`);
    }

    // تشغيل السيرفر (0.0.0.0 مطلوب على بعض الاستضافات)
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🌐 الداشبورد يستمع على المنفذ ${PORT}`);
        console.log(
            '[Dashboard] تسجيل الدخول يتم من المتصفح: بعد الموافقة في Discord يفتح المتصفح عنوان CALLBACK_URL. البوت لا يحتاج أن "يتصل" بـ localhost؛ جهازك أو عنوان الاستضافة هو من يفتح الرابط.'
        );
    });

    return app;
}

module.exports = { startDashboard };
