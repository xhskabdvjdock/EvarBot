const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', '..', 'data');
const globalPath = path.join(dataDir, '_global.json');

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

function getGlobalData() {
    if (!fs.existsSync(globalPath)) {
        const defaults = {
            lavalink: {
                nodes: [
                    {
                        id: 'default',
                        host: 'lavalink.example.com',
                        port: 443,
                        password: 'youshallnotpass',
                        secure: true,
                    },
                ],
            },
        };
        fs.writeFileSync(globalPath, JSON.stringify(defaults, null, 2));
        return defaults;
    }
    return JSON.parse(fs.readFileSync(globalPath, 'utf-8'));
}

function saveGlobalData(data) {
    fs.writeFileSync(globalPath, JSON.stringify(data, null, 2));
}

function updateGlobalData(key, value) {
    const data = getGlobalData();
    data[key] = { ...data[key], ...value };
    saveGlobalData(data);
    return data;
}

module.exports = { getGlobalData, saveGlobalData, updateGlobalData };

