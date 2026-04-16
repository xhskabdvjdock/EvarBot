const { Player, QueueRepeatMode } = require('discord-player');
const { DefaultExtractors, SoundCloudExtractor } = require('@discord-player/extractor');
const { EmbedBuilder } = require('discord.js');

let player = null;
let youtubeJsConsoleSilenced = false;

/** يخفض ضوضاء youtubei.js عند تحليل نصوص الواجهة (ليس خطأ تشغيل). */
function silenceYoutubeJsTextParserConsole() {
    if (youtubeJsConsoleSilenced) return;
    youtubeJsConsoleSilenced = true;
    const tag = '[YOUTUBEJS][Text]';
    const sub = 'Unable to find matching run for command run';
    for (const method of ['log', 'warn', 'info']) {
        const orig = console[method].bind(console);
        console[method] = (...args) => {
            const head = args[0];
            if (typeof head === 'string' && head.includes(tag) && head.includes(sub)) return;
            orig(...args);
        };
    }
}

async function initPlayer(client) {
    if (player) return player;

    silenceYoutubeJsTextParserConsole();

    player = new Player(client, {
        connectionTimeout: 30_000,
    });

    // Skip SoundCloud extractor to avoid intermittent stream extraction failures.
    await player.extractors.loadMulti(DefaultExtractors.filter((extractor) => extractor !== SoundCloudExtractor));
    try {
        try {
            const { Log } = require('youtubei.js');
            if (typeof Log?.setLevel === 'function' && Log.Level?.NONE !== undefined) {
                Log.setLevel(Log.Level.NONE);
            }
        } catch {
            /* الحزمة قد تكون داخل discord-player-youtubei فقط */
        }

        const { YoutubeiExtractor } = require('discord-player-youtubei');
        await player.extractors.register(YoutubeiExtractor, {
            streamOptions: { useClient: 'WEB' },
            useYoutubeDL: true,
            dlUpdateInterval: 86400000,
            logLevel: 'NONE',
        });
    } catch (error) {
        console.warn('⚠️ youtubei extractor not loaded:', error.message);
    }

    player.events.on('playerStart', (queue, track) => {
        const embed = new EmbedBuilder()
            .setColor('#5865f2')
            .setTitle('🎵 يشتغل الحين')
            .setDescription(`[${track.title}](${track.url})`)
            .addFields(
                { name: '👤 الفنان', value: track.author || 'غير معروف', inline: true },
                { name: '⏱️ المدة', value: track.duration || 'مباشر', inline: true },
                { name: '🔊 طلبه', value: `${track.requestedBy || 'غير معروف'}`, inline: true },
            )
            .setThumbnail(track.thumbnail || null)
            .setTimestamp();

        queue.metadata?.channel?.send({ embeds: [embed] }).catch(() => { });
    });

    player.events.on('audioTrackAdd', (queue, track) => {
        const embed = new EmbedBuilder()
            .setColor('#43b581')
            .setDescription(`✅ **${track.title}** تم إضافته للقائمة\n📊 الموقع: **#${queue.size}**`)
            .setTimestamp();
        queue.metadata?.channel?.send({ embeds: [embed] }).catch(() => { });
    });

    player.events.on('audioTracksAdd', (queue, tracks) => {
        const embed = new EmbedBuilder()
            .setColor('#5865f2')
            .setTitle('📋 تم إضافة قائمة تشغيل!')
            .setDescription(`🎵 ${tracks.length} أغنية`)
            .setTimestamp();
        queue.metadata?.channel?.send({ embeds: [embed] }).catch(() => { });
    });

    player.events.on('emptyQueue', (queue) => {
        const embed = new EmbedBuilder()
            .setColor('#faa61a')
            .setDescription('📭 خلصت القائمة!')
            .setTimestamp();
        queue.metadata?.channel?.send({ embeds: [embed] }).catch(() => { });
    });

    player.events.on('disconnect', (queue) => {
        const embed = new EmbedBuilder()
            .setColor('#ed4245')
            .setDescription('👋 تم قطع الاتصال.')
            .setTimestamp();
        queue.metadata?.channel?.send({ embeds: [embed] }).catch(() => { });
    });

    player.events.on('error', (queue, error) => {
        console.error('❌ Music queue error:', error.message);
        if (queue?.metadata?.channel) {
            const embed = new EmbedBuilder()
                .setColor('#ed4245')
                .setDescription(`❌ خطأ: ${error.message?.slice(0, 200)}`)
                .setTimestamp();
            queue.metadata.channel.send({ embeds: [embed] }).catch(() => { });
        }
    });

    player.events.on('playerError', (queue, error) => {
        console.error('❌ Music player error:', error.message);
        if (queue?.metadata?.channel) {
            queue.metadata.channel.send({
                embeds: [new EmbedBuilder().setColor('#ed4245').setDescription(`❌ خطأ تشغيل: ${error.message?.slice(0, 200)}`)],
            }).catch(() => { });
        }
    });

    console.log('🎵 Music Player (discord-player) جاهز!');
    return player;
}

function getPlayer() {
    return player;
}

function getQueue(guildId) {
    return player?.nodes.get(guildId) || null;
}

module.exports = { initPlayer, getPlayer, getQueue, QueueRepeatMode };
