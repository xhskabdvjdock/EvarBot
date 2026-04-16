const fs = require('fs');
const path = require('path');

module.exports = (client) => {
    const commandsPath = path.join(__dirname, '..', 'commands');

    // قراءة كل المجلدات داخل commands
    const commandFolders = fs.readdirSync(commandsPath);

    for (const folder of commandFolders) {
        const folderPath = path.join(commandsPath, folder);

        // تأكد إنه مجلد مو ملف
        if (!fs.statSync(folderPath).isDirectory()) continue;

        const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const command = require(path.join(folderPath, file));

            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
                console.log(`✅ تم تحميل الأمر: /${command.data.name}`);
            } else {
                console.log(`⚠️ الأمر ${file} ناقص data أو execute!`);
            }
        }
    }

    console.log(`📦 تم تحميل ${client.commands.size} أمر بنجاح!`);
};
