const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const ANSWERS = [
    { text: '✅ أكيد!', color: '#43b581' },
    { text: '✅ بالتأكيد نعم!', color: '#43b581' },
    { text: '✅ بدون شك!', color: '#43b581' },
    { text: '✅ إيه أكيد!', color: '#43b581' },
    { text: '✅ يمكنك الاعتماد عليه', color: '#43b581' },
    { text: '🤔 على الأغلب...', color: '#faa61a' },
    { text: '🤔 التوقعات جيدة', color: '#faa61a' },
    { text: '🤔 إشارات توقع نعم', color: '#faa61a' },
    { text: '😐 غير واضح... حاول مرة ثانية', color: '#747f8d' },
    { text: '😐 اسأل لاحقاً', color: '#747f8d' },
    { text: '😐 من الأفضل ما أقولك الحين', color: '#747f8d' },
    { text: '😐 ما أقدر أتنبأ الحين', color: '#747f8d' },
    { text: '😐 ركّز واسأل مرة ثانية', color: '#747f8d' },
    { text: '❌ لا تعتمد عليه', color: '#ed4245' },
    { text: '❌ ردي هو لا', color: '#ed4245' },
    { text: '❌ مصادري تقول لا', color: '#ed4245' },
    { text: '❌ مستحيل!', color: '#ed4245' },
    { text: '❌ التوقعات مو زينة', color: '#ed4245' },
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('8ball')
        .setDescription('🎱 اسأل كرة السحر')
        .addStringOption(opt =>
            opt.setName('question').setDescription('سؤالك').setRequired(true)),

    async execute(interaction, client) {
        const question = interaction.options.getString('question');
        const answer = ANSWERS[Math.floor(Math.random() * ANSWERS.length)];

        const embed = new EmbedBuilder()
            .setColor(answer.color)
            .setTitle('🎱 كرة السحر')
            .addFields(
                { name: '❓ السؤال', value: question },
                { name: '🔮 الجواب', value: answer.text },
            )
            .setFooter({ text: `سأل: ${interaction.user.tag}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
