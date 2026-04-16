/**
 * استبدال المتغيرات في الرسالة بقيمها الحقيقية
 * @param {string} text - النص مع المتغيرات
 * @param {object} member - عضو الديسكورد
 * @param {object} guild - السيرفر
 * @returns {string} النص بعد الاستبدال
 */
function replacePlaceholders(text, member, guild) {
    return text
        .replace(/{user}/g, `<@${member.id}>`)
        .replace(/{username}/g, member.user?.username || member.username || 'Unknown')
        .replace(/{displayname}/g, member.displayName || member.user?.username || 'Unknown')
        .replace(/{server}/g, guild.name)
        .replace(/{count}/g, guild.memberCount.toString())
        .replace(/{id}/g, member.id)
        .replace(/{tag}/g, member.user?.tag || member.tag || 'Unknown');
}

module.exports = { replacePlaceholders };
