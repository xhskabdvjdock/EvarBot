const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const SUBREDDITS = ['memes', 'dankmemes', 'me_irl', 'wholesomememes', 'ProgrammerHumor'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('meme')
        .setDescription('😂 ميم عشوائي من Reddit'),

    async execute(interaction, client) {
        await interaction.deferReply();

        try {
            const sub = SUBREDDITS[Math.floor(Math.random() * SUBREDDITS.length)];
            const res = await fetch(`https://meme-api.com/gimme/${sub}`);
            const data = await res.json();

            if (!data.url) throw new Error('No meme found');

            const embed = new EmbedBuilder()
                .setColor('#ff4500')
                .setTitle(`😂 ${data.title}`)
                .setURL(data.postLink)
                .setImage(data.url)
                .setFooter({ text: `👍 ${data.ups} • r/${data.subreddit} • طلبه ${interaction.user.tag}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            await interaction.editReply({ content: '❌ ما قدرت أجيب ميم! حاول مرة ثانية.' });
        }
    },
};
