const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const JOKES_AR = [
    { q: 'ليش البرمجي ما يطلع من البيت؟', a: 'عشان عنده bugs كثير! 🐛' },
    { q: 'وش الفرق بين البرمجي والقهوة؟', a: 'القهوة تخلص... البرمجي لا! ☕' },
    { q: 'ليش الكمبيوتر رايح للدكتور؟', a: 'عشان عنده فايروس! 🦠' },
    { q: 'وش قال البوت لليوزر؟', a: 'أنا مو bot... أنا bestie! 🤖💕' },
    { q: 'ليش المبرمج حزين؟', a: 'عشان ما عنده class! 📚' },
    { q: 'وش قال الـ try لـ catch؟', a: 'ما أقدر بدونك! 🥺' },
    { q: 'ليش الـ CSS صعب؟', a: 'عشان كل شي float وما يصير center! 😤' },
    { q: 'كم مبرمج يحتاج تغيير لمبة؟', a: 'ولا واحد... هذي مشكلة هاردوير! 💡' },
    { q: 'ليش المبرمج يفضل الليل؟', a: 'عشان أقل bugs بالظلام! 🌙' },
    { q: 'وش قال الـ git لـ push؟', a: 'لا تجبرني! 😂' },
    { q: 'ليش JavaScript مشهور؟', a: 'عشان undefined behavior طبيعي! 🤷' },
    { q: 'وش أصعب شي بالبرمجة؟', a: 'تسمية المتغيرات! 🏷️' },
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('joke')
        .setDescription('😄 نكتة عشوائية'),

    async execute(interaction, client) {
        const joke = JOKES_AR[Math.floor(Math.random() * JOKES_AR.length)];

        const embed = new EmbedBuilder()
            .setColor('#ffd700')
            .setTitle('😄 نكتة!')
            .setDescription(`**${joke.q}**\n\n||${joke.a}||`)
            .setFooter({ text: 'اضغط على النص المخفي للإجابة! 👆' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
