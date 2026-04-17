const {
    initLavalink,
    reinitLavalink,
    getQueue: getLLQueue,
    RepeatMode,
    play: llPlay,
    stop: llStop,
    skip: llSkip,
    pause: llPause,
    setVolume: llSetVolume,
    seek: llSeek,
    setRepeatMode: llSetRepeatMode,
    shuffle: llShuffle,
} = require('./lavalinkPlayer');

async function initPlayer(client) {
    return await initLavalink(client);
}

function getQueue(guildId) {
    return getLLQueue(guildId);
}

module.exports = {
    initPlayer,
    reinitLavalink,
    getQueue,
    QueueRepeatMode: RepeatMode,
    llPlay,
    llStop,
    llSkip,
    llPause,
    llSetVolume,
    llSeek,
    llSetRepeatMode,
    llShuffle,
};
