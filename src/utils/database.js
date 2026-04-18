const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', '..', 'data');

// تأكد إن مجلد data موجود
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

/**
 * قراءة بيانات سيرفر معين
 * @param {string} guildId - آيدي السيرفر
 * @returns {object} بيانات السيرفر
 */
function getGuildData(guildId) {
    const filePath = path.join(dataDir, `${guildId}.json`);

    if (!fs.existsSync(filePath)) {
        const defaultData = {
            welcome: {
                enabled: false,
                channelId: null,
                message: 'أهلاً وسهلاً {user} في **{server}**! 🎉\nأنت العضو رقم **#{count}**',
                dmEnabled: false,
                dmMessage: 'أهلاً فيك في **{server}**! نتمنى لك وقت ممتع 💜',
                embedColor: '#2b2d31',
                bannerUrl: null,
                titleText: null,
                authorText: null,
                footerText: null,
                thumbnail: 'user',
                thumbnailUrl: null,
                showFields: true,
                showTimestamp: true,
            },
            goodbye: {
                enabled: false,
                channelId: null,
                message: 'للأسف **{username}** غادر السيرفر 😢\nنتمنى يرجع قريب!',
                embedColor: '#2b2d31',
                bannerUrl: null,
                titleText: null,
                authorText: null,
                footerText: null,
                thumbnail: 'user',
                thumbnailUrl: null,
                showFields: true,
                showTimestamp: true,
            },
            leveling: {
                enabled: false,
                channelId: null,
                xpMin: 15,
                xpMax: 25,
                cooldown: 60,
                notifyMode: 'channel',
                levelUpMessage: '🎉 مبروك {user}! وصلت **المستوى {level}**!',
                levelRoles: [],
                ignoredChannels: [],
            },
            tickets: {
                enabled: false,
                categoryId: null,
                staffRoleId: null,
                transcriptChannelId: null,
                maxTickets: 1,
                panelMode: 'buttons',
                panelTitle: '🎫 نظام التذاكر',
                panelDescription: 'اختر نوع التذكرة المناسب لطلبك.\nفريق الدعم بيرد عليك بأسرع وقت!',
                panelColor: '#5865f2',
                panelImage: null,
                panelThumbnail: null,
                categories: [
                    {
                        id: 'support',
                        label: 'دعم فني',
                        emoji: '🔧',
                        color: '#5865f2',
                        style: 'Primary',
                        description: 'محتاج مساعدة تقنية؟',
                        welcomeMessage: 'أهلاً {user}! 👋\nفريق الدعم الفني بيساعدك. اشرح مشكلتك بالتفصيل.',
                    },
                ],
            },
            ai: {
                enabled: false,
                channelId: null,
                persona: {
                    name: 'EvarBot AI',
                    personality: 'ودود ومساعد ومحترف',
                    language: 'العربية',
                    rules: '',
                },
            },
            logging: {
                enabled: false,
                channelId: null,
                events: {
                    messageDelete: true,
                    messageEdit: true,
                    memberJoin: true,
                    memberLeave: true,
                    memberRoleUpdate: true,
                    memberBan: true,
                    channelCreate: true,
                    channelDelete: true,
                },
            },
            autorole: {
                enabled: true,
                roles: [],
            },
            gifTool: {
                enabled: false,
                channelId: null,
                allowedTypes: 'both', // image | video | both
                maxFileSizeMb: 20,
                maxVideoDurationSec: 12,
                outputWidth: 480,
                fps: 15,
                accessMode: 'everyone', // everyone | roles | users
                allowedRoleIds: [],
                allowedUserIds: [],
                deleteSourceAfterConvert: true,
            },
            reactionRoles: [],
        };
        saveGuildData(guildId, defaultData);
        return defaultData;
    }

    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

/**
 * حفظ بيانات سيرفر
 * @param {string} guildId - آيدي السيرفر
 * @param {object} data - البيانات
 */
function saveGuildData(guildId, data) {
    const filePath = path.join(dataDir, `${guildId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 * تحديث جزء معين من بيانات السيرفر
 * @param {string} guildId - آيدي السيرفر
 * @param {string} key - المفتاح (مثل 'welcome' أو 'goodbye')
 * @param {object} value - القيمة الجديدة
 */
function updateGuildData(guildId, key, value) {
    const data = getGuildData(guildId);
    data[key] = { ...data[key], ...value };
    saveGuildData(guildId, data);
    return data;
}

module.exports = { getGuildData, saveGuildData, updateGuildData };
