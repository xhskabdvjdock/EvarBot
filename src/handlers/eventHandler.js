const fs = require('fs');
const path = require('path');

module.exports = (client) => {
    const eventsPath = path.join(__dirname, '..', 'events');
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {
        const eventModule = require(path.join(eventsPath, file));

        // دعم ملفات تصدّر مصفوفة (أكثر من حدث)
        const events = Array.isArray(eventModule) ? eventModule : [eventModule];

        for (const event of events) {
            if (!event.name) continue;

            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args, client));
            } else {
                client.on(event.name, (...args) => event.execute(...args, client));
            }

            console.log(`🎯 تم تحميل الحدث: ${event.name}`);
        }
    }
};
