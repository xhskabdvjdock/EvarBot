const { Events } = require('discord.js');
const { cleanState } = require('../utils/musicPlayer');

module.exports = {
    name: Events.VoiceStateUpdate,
    execute(oldState, newState) {
        // If the bot itself updated its voice state
        if (oldState.member?.id === oldState.client.user.id) {
            // If the bot left the voice channel
            if (oldState.channelId && !newState.channelId) {
                cleanState(oldState.guild.id);
            }
        }
    },
};
