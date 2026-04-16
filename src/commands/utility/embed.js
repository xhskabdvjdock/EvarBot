const { SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
    ChannelType,
    MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('📨 إنشاء إمبد مخصص')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)

        // ═══ إرسال ═══
        .addSubcommand(sub =>
            sub.setName('send')
                .setDescription('إرسال إمبد مخصص')
                .addChannelOption(opt =>
                    opt.setName('channel').setDescription('القناة').setRequired(true)
                        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
                .addStringOption(opt =>
                    opt.setName('title').setDescription('العنوان').setRequired(false))
                .addStringOption(opt =>
                    opt.setName('description').setDescription('الوصف').setRequired(false))
                .addStringOption(opt =>
                    opt.setName('color').setDescription('اللون HEX (مثل: #5865f2)').setRequired(false))
                .addStringOption(opt =>
                    opt.setName('thumbnail').setDescription('صورة مصغرة URL').setRequired(false))
                .addStringOption(opt =>
                    opt.setName('image').setDescription('صورة كبيرة URL').setRequired(false))
                .addStringOption(opt =>
                    opt.setName('author').setDescription('اسم الكاتب').setRequired(false))
                .addStringOption(opt =>
                    opt.setName('author_icon').setDescription('أيقونة الكاتب URL').setRequired(false))
                .addStringOption(opt =>
                    opt.setName('footer').setDescription('نص الفوتر').setRequired(false))
                .addStringOption(opt =>
                    opt.setName('footer_icon').setDescription('أيقونة الفوتر URL').setRequired(false))
                .addStringOption(opt =>
                    opt.setName('url').setDescription('رابط العنوان').setRequired(false))
                .addBooleanOption(opt =>
                    opt.setName('timestamp').setDescription('إضافة التاريخ؟').setRequired(false))
                .addStringOption(opt =>
                    opt.setName('fields').setDescription('حقول (name|value|inline;;name|value)').setRequired(false)))

        // ═══ تعديل ═══
        .addSubcommand(sub =>
            sub.setName('edit')
                .setDescription('تعديل إمبد موجود (بنفس خيارات send)')
                .addStringOption(opt =>
                    opt.setName('message_id').setDescription('آيدي الرسالة').setRequired(true))
                .addChannelOption(opt =>
                    opt.setName('channel').setDescription('القناة').setRequired(true)
                        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
                .addStringOption(opt =>
                    opt.setName('title').setDescription('العنوان الجديد').setRequired(false))
                .addStringOption(opt =>
                    opt.setName('description').setDescription('الوصف الجديد').setRequired(false))
                .addStringOption(opt =>
                    opt.setName('color').setDescription('اللون HEX').setRequired(false))
                .addStringOption(opt =>
                    opt.setName('thumbnail').setDescription('صورة مصغرة URL').setRequired(false))
                .addStringOption(opt =>
                    opt.setName('image').setDescription('صورة كبيرة URL').setRequired(false))
                .addStringOption(opt =>
                    opt.setName('author').setDescription('اسم الكاتب').setRequired(false))
                .addStringOption(opt =>
                    opt.setName('footer').setDescription('نص الفوتر').setRequired(false))
                .addBooleanOption(opt =>
                    opt.setName('timestamp').setDescription('إضافة التاريخ؟').setRequired(false))
                .addStringOption(opt =>
                    opt.setName('fields').setDescription('حقول (name|value|inline;;name|value)').setRequired(false))),

    async execute(interaction, client) {
        const sub = interaction.options.getSubcommand();
        if (sub === 'send') return handleSend(interaction, client);
        if (sub === 'edit') return handleEdit(interaction, client);
    },
};

function buildEmbed(interaction) {
    const embed = new EmbedBuilder();

    const title = interaction.options.getString('title');
    const desc = interaction.options.getString('description');
    const color = interaction.options.getString('color');
    const thumbnail = interaction.options.getString('thumbnail');
    const image = interaction.options.getString('image');
    const author = interaction.options.getString('author');
    const authorIcon = interaction.options.getString('author_icon');
    const footer = interaction.options.getString('footer');
    const footerIcon = interaction.options.getString('footer_icon');
    const url = interaction.options.getString('url');
    const timestamp = interaction.options.getBoolean('timestamp');
    const fields = interaction.options.getString('fields');

    if (!title && !desc) return null;

    if (title) embed.setTitle(title);
    if (desc) embed.setDescription(desc.replace(/\\n/g, '\n'));
    if (color) {
        try { embed.setColor(color); } catch { embed.setColor('#5865f2'); }
    } else {
        embed.setColor('#5865f2');
    }
    if (thumbnail) embed.setThumbnail(thumbnail);
    if (image) embed.setImage(image);
    if (author) {
        const authorData = { name: author };
        if (authorIcon) authorData.iconURL = authorIcon;
        embed.setAuthor(authorData);
    }
    if (footer) {
        const footerData = { text: footer };
        if (footerIcon) footerData.iconURL = footerIcon;
        embed.setFooter(footerData);
    }
    if (url) embed.setURL(url);
    if (timestamp) embed.setTimestamp();

    // حقول: name|value|inline;;name|value
    if (fields) {
        const fieldList = fields.split(';;');
        for (const f of fieldList) {
            const parts = f.split('|');
            if (parts.length >= 2) {
                embed.addFields({
                    name: parts[0].trim(),
                    value: parts[1].trim().replace(/\\n/g, '\n'),
                    inline: parts[2]?.trim().toLowerCase() === 'true',
                });
            }
        }
    }

    return embed;
}

async function handleSend(interaction, client) {
    const channel = interaction.options.getChannel('channel');
    const embed = buildEmbed(interaction);

    if (!embed) {
        return interaction.reply({
            embeds: [new EmbedBuilder().setColor('#ed4245').setDescription('❌ لازم تحط عنوان أو وصف على الأقل!')],
            flags: MessageFlags.Ephemeral,
        });
    }

    try {
        const msg = await channel.send({ embeds: [embed] });
        await interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor('#43b581')
                .setDescription(`✅ تم إرسال الإمبد في ${channel}!\n🆔 آيدي الرسالة: \`${msg.id}\``)],
            flags: MessageFlags.Ephemeral,
        });
    } catch (err) {
        await interaction.reply({
            embeds: [new EmbedBuilder().setColor('#ed4245').setDescription(`❌ فشل الإرسال: ${err.message}`)],
            flags: MessageFlags.Ephemeral,
        });
    }
}

async function handleEdit(interaction, client) {
    const channel = interaction.options.getChannel('channel');
    const messageId = interaction.options.getString('message_id');
    const embed = buildEmbed(interaction);

    if (!embed) {
        return interaction.reply({
            embeds: [new EmbedBuilder().setColor('#ed4245').setDescription('❌ لازم تحط عنوان أو وصف على الأقل!')],
            flags: MessageFlags.Ephemeral,
        });
    }

    try {
        const msg = await channel.messages.fetch(messageId);
        if (msg.author.id !== interaction.client.user.id) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor('#ed4245').setDescription('❌ أقدر أعدّل بس رسائل البوت!')],
                flags: MessageFlags.Ephemeral,
            });
        }

        await msg.edit({ embeds: [embed] });
        await interaction.reply({
            embeds: [new EmbedBuilder().setColor('#43b581').setDescription('✅ تم تعديل الإمبد بنجاح!')],
            flags: MessageFlags.Ephemeral,
        });
    } catch (err) {
        await interaction.reply({
            embeds: [new EmbedBuilder().setColor('#ed4245').setDescription(`❌ فشل التعديل: ما لقيت الرسالة أو ما عندي صلاحية.`)],
            flags: MessageFlags.Ephemeral,
        });
    }
}
