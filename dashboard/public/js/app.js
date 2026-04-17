// ══════════════════════ API Helper ══════════════════════
async function api(url, options = {}) {
    try {
        const res = await fetch(url, {
            headers: { 'Content-Type': 'application/json' },
            ...options,
        });
        if (res.status === 401) {
            window.location.href = '/';
            return null;
        }
        return await res.json();
    } catch (err) {
        showToast('خطأ في الاتصال بالسيرفر', 'error');
        return null;
    }
}

// ══════════════════════ تحميل بيانات المستخدم ══════════════════════
async function loadUser() {
    const data = await api('/auth/user');
    if (!data) return;

    const { user } = data;
    const avatar = user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`
        : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discriminator || '0') % 5}.png`;

    const avatarEl = document.getElementById('user-avatar');
    const nameEl = document.getElementById('user-name');
    const greetingEl = document.getElementById('greeting-name');

    if (avatarEl) avatarEl.src = avatar;
    if (nameEl) nameEl.textContent = user.global_name || user.username;
    if (greetingEl) greetingEl.textContent = user.global_name || user.username;
}

// ══════════════════════ تحميل الإحصائيات ══════════════════════
async function loadStats() {
    const stats = await api('/api/stats');
    if (!stats) return;

    document.getElementById('stat-servers').textContent = stats.servers;
    document.getElementById('stat-users').textContent = formatNumber(stats.users);
    document.getElementById('stat-ping').textContent = stats.ping + 'ms';
    document.getElementById('stat-uptime').textContent = stats.uptime;
}

// ══════════════════════ Lavalink Settings (Global) ══════════════════════
async function loadLavalink() {
    const cfg = await api('/api/lavalink');
    if (!cfg) return;
    const node = (cfg.nodes && cfg.nodes[0]) ? cfg.nodes[0] : {};
    const host = document.getElementById('ll-host');
    const port = document.getElementById('ll-port');
    const password = document.getElementById('ll-password');
    const secure = document.getElementById('ll-secure');
    const id = document.getElementById('ll-id');
    if (host) host.value = node.host || '';
    if (port) port.value = node.port || 2333;
    if (password) password.value = node.password || '';
    if (secure) secure.value = String(Boolean(node.secure));
    if (id) id.value = node.id || 'default';
    await loadLavalinkStatus();
}

async function saveLavalink() {
    const host = (document.getElementById('ll-host')?.value || '').trim();
    const port = Number(document.getElementById('ll-port')?.value || 2333);
    const password = document.getElementById('ll-password')?.value || '';
    const secure = (document.getElementById('ll-secure')?.value || 'false') === 'true';
    const id = (document.getElementById('ll-id')?.value || 'default').trim();

    const res = await api('/api/lavalink', {
        method: 'POST',
        body: JSON.stringify({
            nodes: [{ id, host, port, password, secure }],
        }),
    });

    if (res?.success) {
        showToast('تم حفظ إعداد Lavalink وتطبيقه', 'success');
        await loadLavalinkStatus();
    } else {
        showToast(res?.error || 'فشل حفظ الإعداد', 'error');
    }
}

async function testLavalink() {
    const host = (document.getElementById('ll-host')?.value || '').trim();
    const port = Number(document.getElementById('ll-port')?.value || 2333);
    const password = document.getElementById('ll-password')?.value || '';
    const secure = (document.getElementById('ll-secure')?.value || 'false') === 'true';
    const id = (document.getElementById('ll-id')?.value || 'default').trim();

    const res = await api('/api/lavalink/test', {
        method: 'POST',
        body: JSON.stringify({
            node: { id, host, port, password, secure },
        }),
    });

    if (!res) return;
    if (res.success) {
        showToast(`اتصال ناجح. إصدار Lavalink: ${res.version}`, 'success');
    } else {
        showToast(res.error || 'فشل اختبار Lavalink', 'error');
    }
    await loadLavalinkStatus();
}

async function loadLavalinkStatus() {
    const wrap = document.getElementById('ll-status');
    if (!wrap) return;
    const res = await api('/api/lavalink/status');
    if (!res?.success) {
        wrap.textContent = `حالة Lavalink: تعذر جلب الحالة (${res?.error || 'unknown'})`;
        wrap.style.color = 'var(--warning)';
        return;
    }
    const s = res.status || {};
    if (s.ready) {
        wrap.textContent = `حالة Lavalink: متصل. آخر جاهزية: ${s.lastReadyAt || 'غير معروف'}`;
        wrap.style.color = 'var(--success)';
    } else {
        const node = (s.nodes && s.nodes[0]) ? `${s.nodes[0].host}:${s.nodes[0].port}` : 'غير مضبوط';
        wrap.textContent = `حالة Lavalink: غير متصل (${node}). آخر خطأ: ${s.lastError || 'لا يوجد'}`;
        wrap.style.color = 'var(--warning)';
    }
}

// ══════════════════════ تحميل السيرفرات ══════════════════════
async function loadGuilds() {
    const guilds = await api('/api/guilds');
    if (!guilds) return;

    const container = document.getElementById('guilds-container');
    if (!container) return;

    if (guilds.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">ما عندك سيرفرات تقدر تديرها</p>';
        return;
    }

    container.innerHTML = guilds.map(g => {
        const iconContent = g.icon
            ? `<img src="${g.icon}?size=128" alt="${g.name}">`
            : g.name.charAt(0).toUpperCase();

        const badge = g.botIn
            ? '<span class="guild-badge badge-active">البوت موجود</span>'
            : '<span class="guild-badge badge-inactive">البوت مو موجود</span>';

        const members = g.botIn ? `${formatNumber(g.memberCount)} عضو` : '';
        const clickAction = g.botIn ? `onclick="window.location.href='/server/${g.id}'"` : '';
        const disabledClass = g.botIn ? '' : 'disabled';

        return `
            <div class="guild-card ${disabledClass}" ${clickAction}>
                <div class="guild-icon">${iconContent}</div>
                <div class="guild-info">
                    <div class="guild-name">${escapeHtml(g.name)}</div>
                    <div class="guild-members">${members}</div>
                </div>
                ${badge}
            </div>
        `;
    }).join('');
}

// ══════════════════════ معلومات السيرفر ══════════════════════
let serverChannels = [];
let serverRoles = [];
let currentSettings = null;

async function loadServerInfo(guildId) {
    const guild = await api(`/api/guilds/${guildId}`);
    if (!guild) return;

    serverChannels = guild.channels;

    const header = document.getElementById('server-header');
    header.innerHTML = `
        <img src="${guild.icon || ''}" alt="${guild.name}" onerror="this.style.display='none'">
        <div class="server-info">
            <h1>${escapeHtml(guild.name)}</h1>
            <p>👥 ${formatNumber(guild.memberCount)} عضو • 📁 ${guild.channels.length} قناة • 🎭 ${guild.roles.length} رول</p>
        </div>
    `;

    // ملئ القوائم المنسدلة بالقنوات
    populateChannelSelect('welcome-channel', guild.channels);
    populateChannelSelect('goodbye-channel', guild.channels);
    populateChannelSelect('leveling-channel', guild.channels, 'نفس القناة');
    populateChannelSelect('ai-channel', guild.channels, '— بدون قناة (معطّل) —');
    populateChannelSelect('logging-channel', guild.channels, 'اختر قناة...');

    // حفظ الرولات وملء قائمة الأدوار
    serverRoles = guild.roles || [];
    const arSelect = document.getElementById('autorole-select');
    if (arSelect) {
        arSelect.innerHTML = '<option value="">اختر رول...</option>';
        serverRoles.forEach(r => {
            arSelect.innerHTML += `<option value="${r.id}">${escapeHtml(r.name)}</option>`;
        });
    }

    // ملء قائمة قناة الإمبد
    populateChannelSelect('eb-channel', guild.channels, 'اختر قناة...');
}

function populateChannelSelect(selectId, channels, defaultText) {
    const select = document.getElementById(selectId);
    if (!select) return;

    const currentVal = select.value;
    select.innerHTML = `<option value="">${defaultText || 'اختر قناة...'}</option>`;
    channels.forEach(ch => {
        select.innerHTML += `<option value="${ch.id}"># ${escapeHtml(ch.name)}</option>`;
    });
    if (currentVal) select.value = currentVal;
}

// ══════════════════════ تحميل الإعدادات ══════════════════════
async function loadServerSettings(guildId) {
    const settings = await api(`/api/guilds/${guildId}/settings`);
    if (!settings) return;

    currentSettings = JSON.parse(JSON.stringify(settings));

    // ترحيب
    const w = settings.welcome || {};
    setChecked('welcome-enabled', w.enabled);
    setValue('welcome-channel', w.channelId || '');
    setValue('welcome-color', w.embedColor || '#2b2d31');
    setText('welcome-color-hex', w.embedColor || '#2b2d31');
    setChecked('welcome-fields', w.showFields !== false);
    setChecked('welcome-timestamp', w.showTimestamp !== false);
    setChecked('welcome-dm', w.dmEnabled);
    setValue('welcome-message', w.message || '');
    setValue('welcome-dm-message', w.dmMessage || '');
    setValue('welcome-title', w.titleText || '');
    setValue('welcome-author', w.authorText || '');
    setValue('welcome-footer', w.footerText || '');
    setValue('welcome-thumbnail', w.thumbnail || 'user');
    setValue('welcome-banner', w.bannerUrl || '');

    // وداع
    const g = settings.goodbye || {};
    setChecked('goodbye-enabled', g.enabled);
    setValue('goodbye-channel', g.channelId || '');
    setValue('goodbye-color', g.embedColor || '#2b2d31');
    setText('goodbye-color-hex', g.embedColor || '#2b2d31');
    setChecked('goodbye-fields', g.showFields !== false);
    setChecked('goodbye-timestamp', g.showTimestamp !== false);
    setValue('goodbye-message', g.message || '');
    setValue('goodbye-title', g.titleText || '');
    setValue('goodbye-author', g.authorText || '');
    setValue('goodbye-footer', g.footerText || '');
    setValue('goodbye-thumbnail', g.thumbnail || 'user');
    setValue('goodbye-banner', g.bannerUrl || '');

    // مستويات
    const l = settings.leveling || {};
    setChecked('leveling-enabled', l.enabled);
    setValue('leveling-channel', l.channelId || '');
    setValue('leveling-notify', l.notifyMode || 'channel');
    setValue('leveling-xpmin', l.xpMin || 15);
    setValue('leveling-xpmax', l.xpMax || 25);
    setValue('leveling-cooldown', l.cooldown || 60);
    setValue('leveling-message', l.levelUpMessage || '');

    // تذاكر
    const t = settings.tickets || {};
    setChecked('tickets-enabled', t.enabled);
    setValue('tickets-max', t.maxTickets || 1);
    setValue('tickets-mode', t.panelMode || 'buttons');
    setValue('tickets-panel-title', t.panelTitle || '');
    setValue('tickets-panel-desc', t.panelDescription || '');
    setValue('tickets-panel-color', t.panelColor || '#5865f2');
    setValue('tickets-panel-image', t.panelImage || '');
    setValue('tickets-panel-thumbnail', t.panelThumbnail || '');

    // عرض أنواع التذاكر
    renderTicketCategories(t.categories || []);

    // ذكاء اصطناعي
    const ai = settings.ai || {};
    setChecked('ai-enabled', ai.enabled);
    setValue('ai-channel', ai.channelId || '');
    const p = ai.persona || {};
    setValue('ai-name', p.name || '');
    setValue('ai-personality', p.personality || '');
    setValue('ai-language', p.language || 'العربية');
    setValue('ai-rules', p.rules || '');

    // تسجيلات
    const log = settings.logging || {};
    setChecked('logging-enabled', log.enabled);
    setValue('logging-channel', log.channelId || '');
    const ev = log.events || {};
    setChecked('log-messageDelete', ev.messageDelete !== false);
    setChecked('log-messageEdit', ev.messageEdit !== false);
    setChecked('log-memberJoin', ev.memberJoin !== false);
    setChecked('log-memberLeave', ev.memberLeave !== false);
    setChecked('log-memberRoleUpdate', ev.memberRoleUpdate !== false);
    setChecked('log-memberBan', ev.memberBan !== false);
    setChecked('log-channelCreate', ev.channelCreate !== false);
    setChecked('log-channelDelete', ev.channelDelete !== false);

    // أدوار تلقائية
    const ar = settings.autorole || {};
    setChecked('autorole-enabled', ar.enabled !== false);
    renderAutoRoles(ar.roles || []);
}

// ══════════════════════ حفظ الإعدادات ══════════════════════
let hasChanges = false;

function markChanged() {
    hasChanges = true;
    const bar = document.getElementById('save-bar');
    if (bar) bar.classList.add('visible');
}

function resetChanges() {
    hasChanges = false;
    const bar = document.getElementById('save-bar');
    if (bar) bar.classList.remove('visible');
    loadServerSettings(guildId);
}

async function saveSettings() {
    const gid = window.guildId || window.location.pathname.split('/').pop();

    // جمع بيانات الترحيب
    const welcomeData = {
        enabled: getChecked('welcome-enabled'),
        channelId: getValue('welcome-channel') || null,
        embedColor: getValue('welcome-color'),
        showFields: getChecked('welcome-fields'),
        showTimestamp: getChecked('welcome-timestamp'),
        dmEnabled: getChecked('welcome-dm'),
        message: getValue('welcome-message'),
        dmMessage: getValue('welcome-dm-message'),
        titleText: getValue('welcome-title') || null,
        authorText: getValue('welcome-author') || null,
        footerText: getValue('welcome-footer') || null,
        thumbnail: getValue('welcome-thumbnail'),
        bannerUrl: getValue('welcome-banner') || null,
    };

    // جمع بيانات الوداع
    const goodbyeData = {
        enabled: getChecked('goodbye-enabled'),
        channelId: getValue('goodbye-channel') || null,
        embedColor: getValue('goodbye-color'),
        showFields: getChecked('goodbye-fields'),
        showTimestamp: getChecked('goodbye-timestamp'),
        message: getValue('goodbye-message'),
        titleText: getValue('goodbye-title') || null,
        authorText: getValue('goodbye-author') || null,
        footerText: getValue('goodbye-footer') || null,
        thumbnail: getValue('goodbye-thumbnail'),
        bannerUrl: getValue('goodbye-banner') || null,
    };

    // جمع بيانات المستويات
    const levelingData = {
        enabled: getChecked('leveling-enabled'),
        channelId: getValue('leveling-channel') || null,
        notifyMode: getValue('leveling-notify'),
        xpMin: parseInt(getValue('leveling-xpmin')) || 15,
        xpMax: parseInt(getValue('leveling-xpmax')) || 25,
        cooldown: parseInt(getValue('leveling-cooldown')) || 60,
        levelUpMessage: getValue('leveling-message'),
    };

    // إرسال
    const [wRes, gRes, lRes] = await Promise.all([
        api(`/api/guilds/${gid}/settings/welcome`, {
            method: 'POST',
            body: JSON.stringify(welcomeData),
        }),
        api(`/api/guilds/${gid}/settings/goodbye`, {
            method: 'POST',
            body: JSON.stringify(goodbyeData),
        }),
        api(`/api/guilds/${gid}/settings/leveling`, {
            method: 'POST',
            body: JSON.stringify(levelingData),
        }),
        api(`/api/guilds/${gid}/settings/tickets`, {
            method: 'POST',
            body: JSON.stringify({
                enabled: getChecked('tickets-enabled'),
                maxTickets: parseInt(getValue('tickets-max')) || 1,
                panelMode: getValue('tickets-mode'),
                panelTitle: getValue('tickets-panel-title') || null,
                panelDescription: getValue('tickets-panel-desc') || null,
                panelColor: getValue('tickets-panel-color'),
                panelImage: getValue('tickets-panel-image') || null,
                panelThumbnail: getValue('tickets-panel-thumbnail') || null,
                categories: collectCategories(),
            }),
        }),
        api(`/api/guilds/${gid}/settings/ai`, {
            method: 'POST',
            body: JSON.stringify({
                enabled: getChecked('ai-enabled'),
                channelId: getValue('ai-channel') || null,
                persona: {
                    name: getValue('ai-name') || 'EvarBot AI',
                    personality: getValue('ai-personality') || 'ودود ومساعد ومحترف',
                    language: getValue('ai-language') || 'العربية',
                    rules: getValue('ai-rules') || '',
                },
            }),
        }),
        api(`/api/guilds/${gid}/settings/logging`, {
            method: 'POST',
            body: JSON.stringify({
                enabled: getChecked('logging-enabled'),
                channelId: getValue('logging-channel') || null,
                events: {
                    messageDelete: getChecked('log-messageDelete'),
                    messageEdit: getChecked('log-messageEdit'),
                    memberJoin: getChecked('log-memberJoin'),
                    memberLeave: getChecked('log-memberLeave'),
                    memberRoleUpdate: getChecked('log-memberRoleUpdate'),
                    memberBan: getChecked('log-memberBan'),
                    channelCreate: getChecked('log-channelCreate'),
                    channelDelete: getChecked('log-channelDelete'),
                },
            }),
        }),
        api(`/api/guilds/${gid}/settings/autorole`, {
            method: 'POST',
            body: JSON.stringify({
                enabled: getChecked('autorole-enabled'),
                roles: collectAutoRoles(),
            }),
        }),
    ]);

    if (wRes?.success && gRes?.success && lRes?.success) {
        showToast('✅ تم حفظ الإعدادات بنجاح!', 'success');
        hasChanges = false;
        document.getElementById('save-bar').classList.remove('visible');
    } else {
        showToast('❌ فشل حفظ الإعدادات', 'error');
    }
}

// ══════════════════════ التحذيرات ══════════════════════
async function loadWarnings(guildId) {
    const warnings = await api(`/api/guilds/${guildId}/warnings`);
    if (!warnings) return;

    const container = document.getElementById('warnings-container');
    if (!container) return;

    const userIds = Object.keys(warnings);
    if (userIds.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">✅ ما في أي تحذيرات</p>';
        return;
    }

    let html = '';
    for (const userId of userIds) {
        const userWarns = warnings[userId];
        if (!userWarns || userWarns.length === 0) continue;

        html += `<div style="margin-bottom: 16px; padding: 16px; background: var(--bg-glass); border-radius: var(--radius); border: 1px solid var(--border);">`;
        html += `<div style="font-weight: 600; margin-bottom: 12px; font-size: 15px;">👤 المستخدم: ${userId}</div>`;

        for (const w of userWarns) {
            const date = new Date(w.date).toLocaleDateString('ar-SA');
            html += `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--border);">
                    <div>
                        <div style="font-size: 14px;">⚠️ ${escapeHtml(w.reason)}</div>
                        <div style="font-size: 12px; color: var(--text-secondary);">👮 ${escapeHtml(w.moderatorTag)} • ${date} • <code>${w.id}</code></div>
                    </div>
                    <button class="btn btn-danger btn-sm" onclick="deleteWarning('${guildId}', '${userId}', '${w.id}')">حذف</button>
                </div>
            `;
        }
        html += '</div>';
    }

    container.innerHTML = html;
}

async function deleteWarning(guildId, userId, warnId) {
    const res = await api(`/api/guilds/${guildId}/warnings/${userId}/${warnId}`, { method: 'DELETE' });
    if (res?.success) {
        showToast('✅ تم حذف التحذير', 'success');
        loadWarnings(guildId);
    } else {
        showToast('❌ فشل حذف التحذير', 'error');
    }
}

// ══════════════════════ Tabs ══════════════════════
function switchTab(tabName) {
    // تحديث التابات
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.tab[data-tab="${tabName}"]`).classList.add('active');

    // تحديث البانلات
    document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(`panel-${tabName}`).classList.add('active');
}

// ══════════════════════ ليدربورد ══════════════════════
async function loadLeaderboard(guildId) {
    const data = await api(`/api/guilds/${guildId}/leaderboard`);
    const container = document.getElementById('leaderboard-container');
    if (!container) return;

    if (!data || data.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">ما في أحد في الليدربورد بعد</p>';
        return;
    }

    const medals = ['🥇', '🥈', '🥉'];
    container.innerHTML = data.map(u => {
        const medal = medals[u.rank - 1] || `#${u.rank}`;
        const progress = Math.floor((u.xp / u.xpNeeded) * 100);
        const barFilled = Math.round(progress / 5);
        const bar = '█'.repeat(barFilled) + '░'.repeat(20 - barFilled);

        return `
            <div style="display: flex; align-items: center; gap: 14px; padding: 12px; margin-bottom: 8px; background: var(--bg-glass); border-radius: var(--radius); border: 1px solid var(--border);">
                <span style="font-size: 20px; min-width: 30px; text-align: center;">${medal}</span>
                <img src="${u.avatar || ''}" alt="" style="width: 36px; height: 36px; border-radius: 50%; background: var(--bg-card);" onerror="this.style.display='none'">
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 600; font-size: 14px;">${escapeHtml(u.username)}</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">⭐ ${u.level} • ✨ ${u.totalXp.toLocaleString()} XP • 💬 ${u.messages}</div>
                </div>
            </div>
        `;
    }).join('');
}

// ══════════════════════ التذاكر المفتوحة ══════════════════════
async function loadActiveTickets(guildId) {
    const data = await api(`/api/guilds/${guildId}/tickets`);
    const container = document.getElementById('active-tickets-container');
    if (!container) return;

    if (!data || data.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">✅ ما في تذاكر مفتوحة</p>';
        return;
    }

    container.innerHTML = data.map(t => {
        const date = new Date(t.createdAt).toLocaleDateString('ar-SA');
        return `
            <div style="display: flex; align-items: center; gap: 14px; padding: 12px; margin-bottom: 8px; background: var(--bg-glass); border-radius: var(--radius); border: 1px solid var(--border);">
                <span style="font-size: 20px;">🎫</span>
                <div style="flex: 1;">
                    <div style="font-weight: 600; font-size: 14px;">تذكرة #${t.number}</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">👤 ${escapeHtml(t.username)} • 📅 ${date}</div>
                </div>
            </div>
        `;
    }).join('');
}

// ══════════════════════ أنواع التذاكر ══════════════════════
function renderTicketCategories(categories) {
    const container = document.getElementById('ticket-categories-container');
    if (!container) return;
    container.innerHTML = '';

    if (!categories || categories.length === 0) return;

    categories.forEach((c, i) => {
        container.appendChild(createCategoryCard(c, i));
    });
}

function createCategoryCard(cat, index) {
    const card = document.createElement('div');
    card.className = 'ticket-cat-card';
    card.dataset.index = index;
    card.style.cssText = 'padding: 16px; margin-bottom: 10px; background: var(--bg-glass); border-radius: var(--radius); border: 1px solid var(--border);';

    card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <span style="font-weight: 700; font-size: 15px;">${cat.emoji || '🎫'} ${escapeHtml(cat.label || 'نوع جديد')}</span>
            <button type="button" onclick="removeTicketCategory(this)" style="background: rgba(237,66,69,0.15); color: #ed4245; border: none; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 13px; transition: all 0.2s;" onmouseover="this.style.background='rgba(237,66,69,0.3)'" onmouseout="this.style.background='rgba(237,66,69,0.15)'">🗑️ حذف</button>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>
                <label style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px; display: block;">🆔 آيدي (إنجليزي)</label>
                <input type="text" class="input-text cat-id" value="${escapeHtml(cat.id || '')}" placeholder="support" oninput="markChanged()" style="width: 100%;">
            </div>
            <div>
                <label style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px; display: block;">📛 الاسم</label>
                <input type="text" class="input-text cat-label" value="${escapeHtml(cat.label || '')}" placeholder="دعم فني" oninput="updateCatHeader(this); markChanged()" style="width: 100%;">
            </div>
            <div>
                <label style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px; display: block;">😀 إيموجي</label>
                <input type="text" class="input-text cat-emoji" value="${cat.emoji || ''}" placeholder="🔧" oninput="updateCatHeader(this); markChanged()" style="width: 100%;">
            </div>
            <div>
                <label style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px; display: block;">🎨 لون الزر</label>
                <select class="select-custom cat-style" onchange="markChanged()" style="width: 100%;">
                    <option value="Primary" ${cat.style === 'Primary' ? 'selected' : ''}>🔵 أزرق</option>
                    <option value="Secondary" ${cat.style === 'Secondary' ? 'selected' : ''}>⚪ رمادي</option>
                    <option value="Success" ${cat.style === 'Success' ? 'selected' : ''}>🟢 أخضر</option>
                    <option value="Danger" ${cat.style === 'Danger' ? 'selected' : ''}>🔴 أحمر</option>
                </select>
            </div>
        </div>
        <div style="margin-top: 10px;">
            <label style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px; display: block;">📝 وصف قصير</label>
            <input type="text" class="input-text cat-desc" value="${escapeHtml(cat.description || '')}" placeholder="محتاج مساعدة تقنية؟" oninput="markChanged()" style="width: 100%;">
        </div>
        <div style="margin-top: 10px;">
            <label style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px; display: block;">👋 رسالة الترحيب ({user} {username})</label>
            <textarea class="input-text cat-welcome" placeholder="أهلاً {user}! اشرح مشكلتك.." oninput="markChanged()" style="width: 100%; min-height: 60px;">${escapeHtml(cat.welcomeMessage || '')}</textarea>
        </div>
    `;
    return card;
}

function addTicketCategory() {
    const container = document.getElementById('ticket-categories-container');
    if (!container) return;
    const index = container.querySelectorAll('.ticket-cat-card').length;
    const newCat = { id: '', label: '', emoji: '', style: 'Primary', description: '', welcomeMessage: '' };
    container.appendChild(createCategoryCard(newCat, index));
    markChanged();
    container.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function removeTicketCategory(btn) {
    const card = btn.closest('.ticket-cat-card');
    if (card) { card.remove(); markChanged(); }
}

function updateCatHeader(input) {
    const card = input.closest('.ticket-cat-card');
    if (!card) return;
    const emoji = card.querySelector('.cat-emoji').value || '🎫';
    const label = card.querySelector('.cat-label').value || 'نوع جديد';
    card.querySelector('span[style*="font-weight"]').textContent = `${emoji} ${label}`;
}

function collectCategories() {
    const cards = document.querySelectorAll('.ticket-cat-card');
    const categories = [];
    cards.forEach(card => {
        const id = card.querySelector('.cat-id')?.value?.trim().toLowerCase().replace(/\s+/g, '-');
        const label = card.querySelector('.cat-label')?.value?.trim();
        if (!id || !label) return;
        categories.push({
            id,
            label,
            emoji: card.querySelector('.cat-emoji')?.value?.trim() || '🎫',
            style: card.querySelector('.cat-style')?.value || 'Primary',
            description: card.querySelector('.cat-desc')?.value?.trim() || '',
            color: '#5865f2',
            welcomeMessage: card.querySelector('.cat-welcome')?.value?.trim() || '',
        });
    });
    return categories;
}
// ══════════════════════ أدوار تلقائية ══════════════════════
function renderAutoRoles(roleIds) {
    const container = document.getElementById('autorole-list');
    if (!container) return;
    container.innerHTML = '';
    roleIds.forEach(roleId => {
        const roleName = serverRoles.find(r => r.id === roleId)?.name || roleId;
        const pill = document.createElement('div');
        pill.dataset.roleId = roleId;
        pill.style.cssText = 'display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; margin: 4px; background: var(--bg-glass); border: 1px solid var(--border); border-radius: 20px; font-size: 13px;';
        pill.innerHTML = `🎭 ${escapeHtml(roleName)} <button type="button" onclick="removeAutoRole('${roleId}')" style="background: none; border: none; color: #ed4245; cursor: pointer; font-size: 16px; padding: 0 2px;">✕</button>`;
        container.appendChild(pill);
    });
}

function addAutoRole() {
    const select = document.getElementById('autorole-select');
    const roleId = select.value;
    if (!roleId) return;

    const container = document.getElementById('autorole-list');
    if (container.querySelector(`[data-role-id="${roleId}"]`)) return;

    const roleName = serverRoles.find(r => r.id === roleId)?.name || roleId;
    const pill = document.createElement('div');
    pill.dataset.roleId = roleId;
    pill.style.cssText = 'display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; margin: 4px; background: var(--bg-glass); border: 1px solid var(--border); border-radius: 20px; font-size: 13px;';
    pill.innerHTML = `🎭 ${escapeHtml(roleName)} <button type="button" onclick="removeAutoRole('${roleId}')" style="background: none; border: none; color: #ed4245; cursor: pointer; font-size: 16px; padding: 0 2px;">✕</button>`;
    container.appendChild(pill);
    select.value = '';
    markChanged();
}

function removeAutoRole(roleId) {
    const pill = document.querySelector(`[data-role-id="${roleId}"]`);
    if (pill) { pill.remove(); markChanged(); }
}

function collectAutoRoles() {
    return Array.from(document.querySelectorAll('#autorole-list [data-role-id]')).map(el => el.dataset.roleId);
}

// ══════════════════════ Embed Builder ══════════════════════
function updateEmbedPreview() {
    const preview = document.getElementById('embed-preview');
    const color = document.getElementById('eb-color').value;
    preview.style.borderLeftColor = color;

    // Author
    const authorName = document.getElementById('eb-author').value;
    const authorIcon = document.getElementById('eb-author-icon').value;
    const authorEl = document.getElementById('ep-author');
    const authorIconEl = document.getElementById('ep-author-icon');
    const authorNameEl = document.getElementById('ep-author-name');
    if (authorName) {
        authorEl.style.display = 'flex';
        authorNameEl.textContent = authorName;
        if (authorIcon) { authorIconEl.src = authorIcon; authorIconEl.style.display = 'block'; }
        else authorIconEl.style.display = 'none';
    } else { authorEl.style.display = 'none'; }

    // Title
    const title = document.getElementById('eb-title').value;
    const titleEl = document.getElementById('ep-title');
    const url = document.getElementById('eb-url').value;
    if (title) {
        titleEl.style.display = 'block';
        titleEl.innerHTML = url ? `<a href="${escapeHtml(url)}" style="color: #00aff4; text-decoration: none;">${escapeHtml(title)}</a>` : escapeHtml(title);
    } else { titleEl.style.display = 'none'; }

    // Description
    const desc = document.getElementById('eb-desc').value;
    const descEl = document.getElementById('ep-desc');
    if (desc) { descEl.style.display = 'block'; descEl.textContent = desc; }
    else { descEl.style.display = 'none'; }

    // Thumbnail
    const thumb = document.getElementById('eb-thumb').value;
    const thumbEl = document.getElementById('ep-thumb');
    if (thumb) { thumbEl.src = thumb; thumbEl.style.display = 'block'; }
    else { thumbEl.style.display = 'none'; }

    // Image
    const image = document.getElementById('eb-image').value;
    const imageEl = document.getElementById('ep-image');
    if (image) { imageEl.src = image; imageEl.style.display = 'block'; }
    else { imageEl.style.display = 'none'; }

    // Fields
    const fieldsContainer = document.getElementById('ep-fields');
    fieldsContainer.innerHTML = '';
    document.querySelectorAll('.eb-field-row').forEach(row => {
        const name = row.querySelector('.eb-field-name').value;
        const value = row.querySelector('.eb-field-value').value;
        const inline = row.querySelector('.eb-field-inline').checked;
        if (name || value) {
            const div = document.createElement('div');
            div.style.cssText = inline ? '' : 'grid-column: 1 / -1;';
            div.innerHTML = `<div style="font-weight: 700; color: #fff; font-size: 13px; margin-bottom: 2px;">${escapeHtml(name)}</div><div style="color: #dcddde; font-size: 13px;">${escapeHtml(value)}</div>`;
            fieldsContainer.appendChild(div);
        }
    });

    // Footer
    const footer = document.getElementById('eb-footer').value;
    const footerIcon = document.getElementById('eb-footer-icon').value;
    const timestamp = document.getElementById('eb-timestamp').checked;
    const footerEl = document.getElementById('ep-footer');
    const footerIconEl = document.getElementById('ep-footer-icon');
    const footerTextEl = document.getElementById('ep-footer-text');
    const tsEl = document.getElementById('ep-timestamp');
    if (footer || timestamp) {
        footerEl.style.display = 'flex';
        footerTextEl.textContent = footer || '';
        tsEl.textContent = timestamp ? (footer ? ' • ' : '') + new Date().toLocaleString('ar-SA') : '';
        if (footerIcon) { footerIconEl.src = footerIcon; footerIconEl.style.display = 'block'; }
        else footerIconEl.style.display = 'none';
    } else { footerEl.style.display = 'none'; }
}

function addEmbedField() {
    const list = document.getElementById('eb-fields-list');
    const div = document.createElement('div');
    div.className = 'eb-field-row';
    div.style.cssText = 'display: flex; gap: 8px; margin-bottom: 8px; align-items: center;';
    div.innerHTML = `
        <input type="text" class="input-text eb-field-name" placeholder="اسم الحقل" style="flex: 1;" oninput="updateEmbedPreview()">
        <input type="text" class="input-text eb-field-value" placeholder="القيمة" style="flex: 1;" oninput="updateEmbedPreview()">
        <label style="display: flex; align-items: center; gap: 4px; font-size: 12px; white-space: nowrap; color: var(--text-secondary);">
            <input type="checkbox" class="eb-field-inline" onchange="updateEmbedPreview()"> Inline
        </label>
        <button type="button" onclick="this.parentElement.remove(); updateEmbedPreview();" style="background: none; border: none; color: #ed4245; cursor: pointer; font-size: 18px;">✕</button>
    `;
    list.appendChild(div);
}

function collectEmbedData() {
    const data = {
        title: document.getElementById('eb-title').value || '',
        description: document.getElementById('eb-desc').value || '',
        color: document.getElementById('eb-color').value || '#5865f2',
        url: document.getElementById('eb-url').value || '',
        thumbnail: document.getElementById('eb-thumb').value || '',
        image: document.getElementById('eb-image').value || '',
        author: document.getElementById('eb-author').value || '',
        authorIcon: document.getElementById('eb-author-icon').value || '',
        footer: document.getElementById('eb-footer').value || '',
        footerIcon: document.getElementById('eb-footer-icon').value || '',
        timestamp: document.getElementById('eb-timestamp').checked,
        fields: [],
    };
    document.querySelectorAll('.eb-field-row').forEach(row => {
        const name = row.querySelector('.eb-field-name').value.trim();
        const value = row.querySelector('.eb-field-value').value.trim();
        if (name && value) {
            data.fields.push({ name, value, inline: row.querySelector('.eb-field-inline').checked });
        }
    });
    return data;
}

async function sendEmbed() {
    const channelId = document.getElementById('eb-channel').value;
    if (!channelId) return showToast('❌ اختر قناة!', 'error');
    const data = collectEmbedData();
    if (!data.title && !data.description) return showToast('❌ لازم تحط عنوان أو وصف!', 'error');

    const gid = new URLSearchParams(window.location.search).get('id');
    const res = await api(`/api/guilds/${gid}/send-embed`, {
        method: 'POST',
        body: JSON.stringify({ channelId, embed: data }),
    });
    if (res?.success) showToast('✅ تم إرسال الإمبد!', 'success');
    else showToast('❌ فشل الإرسال: ' + (res?.error || 'خطأ'), 'error');
}

// ══════════════════════ Music Status ══════════════════════
async function loadMusicStatus() {
    const gid = new URLSearchParams(window.location.search).get('id') || window.location.pathname.split('/').pop();
    const container = document.getElementById('music-status');
    if (!container) return;

    container.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-secondary);">⏳ جاري التحميل...</div>';

    const data = await api(`/api/guilds/${gid}/music`);
    if (!data || !data.playing) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: var(--text-secondary);">
                <div style="font-size: 48px; margin-bottom: 12px;">🔇</div>
                <p>ما في شي يشتغل حالياً</p>
                <p style="font-size: 12px; margin-top: 8px;">استخدم <strong>/play</strong> في الديسكورد لتشغيل أغنية</p>
                <button class="btn" onclick="loadMusicStatus()" style="margin-top: 12px; padding: 8px 20px;">🔄 تحديث</button>
            </div>`;
        return;
    }

    const c = data.current;
    const vol = data.volume || 50;
    const volBars = Math.round(vol / 10);
    const volBar = '█'.repeat(volBars) + '░'.repeat(10 - volBars);

    let queueHtml = '';
    if (data.queue?.length) {
        queueHtml = `<div style="margin-top: 12px;"><strong>📋 القائمة (${data.queueSize})</strong>` +
            data.queue.map(t => `<div style="padding: 6px 0; border-bottom: 1px solid var(--border); font-size: 13px;">${t.position}. ${escapeHtml(t.title)} <span style="color: var(--text-secondary);">• ${t.duration}</span></div>`).join('') +
            `</div>`;
    }

    container.innerHTML = `
        <div style="display: flex; gap: 16px; align-items: flex-start;">
            ${c.thumbnail ? `<img src="${c.thumbnail}" style="width: 120px; height: 120px; border-radius: 8px; object-fit: cover;">` : ''}
            <div style="flex: 1;">
                <div style="font-size: 18px; font-weight: 700; margin-bottom: 4px;">${escapeHtml(c.title)}</div>
                <div style="color: var(--text-secondary); margin-bottom: 8px;">👤 ${escapeHtml(c.author)} • ⏱️ ${c.duration}</div>
                <div style="display: flex; gap: 16px; font-size: 13px; color: var(--text-secondary);">
                    <span>🔊 ${vol}% <code>${volBar}</code></span>
                    <span>🔁 ${data.loop}</span>
                    <span>${data.paused ? '⏸️ متوقف' : '▶️ يشتغل'}</span>
                </div>
                <div style="font-size: 12px; color: var(--text-secondary); margin-top: 6px;">🔊 طلبه: ${escapeHtml(c.requestedBy)}</div>
            </div>
        </div>
        ${queueHtml}
        <button class="btn" onclick="loadMusicStatus()" style="margin-top: 12px; padding: 8px 20px;">🔄 تحديث</button>
    `;
}

// ══════════════════════ Toast ══════════════════════
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = { success: '✅', error: '❌', warning: '⚠️' };
    toast.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(30px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ══════════════════════ Helpers ══════════════════════
function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num?.toString() || '0';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function setChecked(id, val) {
    const el = document.getElementById(id);
    if (el) el.checked = !!val;
}

function getChecked(id) {
    const el = document.getElementById(id);
    return el ? el.checked : false;
}

function setValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
}

function getValue(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
}

function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}
