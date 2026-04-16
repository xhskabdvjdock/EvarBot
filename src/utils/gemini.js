// ═══ Groq AI — مجاني بالكامل وسريع جداً ═══
// احصل على مفتاح من: https://console.groq.com/keys

let apiKey = null;

// ═══ الموديلات المتاحة (مجانية) ═══
const MODELS = [
    'llama-3.3-70b-versatile',   // الأقوى — 70B
    'llama-3.1-8b-instant',      // سريع جداً
    'gemma2-9b-it',              // Google Gemma
];

let currentModelIndex = 0;

// ═══ تهيئة ═══
function initGemini() {
    apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey === 'your-groq-api-key-here') {
        console.log('⚠️ GROQ_API_KEY مو محدد في .env — نظام الذكاء الاصطناعي معطّل');
        console.log('📎 احصل على مفتاح مجاني من: https://console.groq.com/keys');
        return false;
    }

    console.log(`✅ Groq AI جاهز! (مجاني + سريع) الموديلات: ${MODELS.join(' → ')}`);
    return true;
}

// ═══ ذاكرة المحادثات — لكل يوزر ═══
const conversations = new Map();
const MAX_HISTORY = 20;

function getConversation(userId) {
    if (!conversations.has(userId)) {
        conversations.set(userId, []);
    }
    return conversations.get(userId);
}

function addToConversation(userId, role, content) {
    const convo = getConversation(userId);
    convo.push({ role, content });

    while (convo.length > MAX_HISTORY) {
        convo.shift();
    }
}

function clearConversation(userId) {
    conversations.delete(userId);
}

// ═══ إرسال رسالة (مع fallback بين الموديلات) ═══
async function chat(userId, message, persona, guildName) {
    if (!apiKey) {
        return '❌ نظام الذكاء الاصطناعي غير مُهيّأ. تأكد من إعداد `GROQ_API_KEY` في ملف `.env`\n📎 https://console.groq.com/keys';
    }

    const systemPrompt = buildSystemPrompt(persona, guildName);
    const history = getConversation(userId);

    // بناء الرسائل بتنسيق OpenAI
    const messages = [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: message },
    ];

    // جرب كل موديل بالترتيب
    for (let i = 0; i < MODELS.length; i++) {
        const modelIdx = (currentModelIndex + i) % MODELS.length;
        const modelName = MODELS[modelIdx];

        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: modelName,
                    messages,
                    max_tokens: 1000,
                    temperature: 0.8,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMsg = errorData.error?.message || response.statusText;

                // كوتا — جرب الموديل التالي
                if (response.status === 429) {
                    console.log(`🔄 ${modelName} مشغول، جاري تجربة التالي...`);
                    continue;
                }

                // مفتاح خاطئ
                if (response.status === 401) {
                    return '❌ مفتاح API غير صالح. تأكد من `GROQ_API_KEY` في ملف `.env`';
                }

                throw new Error(errorMsg);
            }

            const data = await response.json();
            const reply = data.choices?.[0]?.message?.content;

            if (!reply) throw new Error('No content in response');

            // نجح! حفظ في الذاكرة
            addToConversation(userId, 'user', message);
            addToConversation(userId, 'assistant', reply);
            currentModelIndex = modelIdx;

            return reply;

        } catch (err) {
            console.warn(`⚠️ ${modelName} فشل: ${err.message?.slice(0, 100)}`);
            continue;
        }
    }

    // كل الموديلات فشلت
    return '⏳ كل الموديلات مشغولة! حاول بعد شوي.';
}

// ═══ بناء الشخصية ═══
function buildSystemPrompt(persona, guildName) {
    const defaults = {
        name: 'EvarBot AI',
        personality: 'ودود ومساعد ومحترف',
        language: 'العربية',
        rules: '',
    };

    const p = { ...defaults, ...(persona || {}) };

    let prompt = `أنت "${p.name}" — مساعد ذكاء اصطناعي في سيرفر ديسكورد "${guildName || 'الخادم'}".
شخصيتك: ${p.personality}.
تتحدث بـ${p.language}.
أجب بشكل مختصر ومفيد ولا تزيد عن 2000 حرف.
استخدم الإيموجيات بشكل خفيف لجعل الردود ممتعة.
لا تذكر إنك نموذج لغة أو AI — تصرف كـ"${p.name}".`;

    if (p.rules) {
        prompt += `\nقواعد إضافية: ${p.rules}`;
    }

    return prompt;
}

module.exports = { initGemini, chat, clearConversation, getConversation };
