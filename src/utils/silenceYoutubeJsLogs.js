'use strict';

/**
 * يخفض ضوضاء youtubei.js ([YOUTUBEJS][Text] …) قبل تحميل أي مكتبة تحتفظ بمرجع قديم لـ console.
 * يُستدعى مرة واحدة من أول سطر في src/index.js بعد dotenv.
 */
let installed = false;

function shouldDrop(args) {
    return args.some((a) => typeof a === 'string' && a.includes('[YOUTUBEJS][Text]'));
}

function install() {
    if (installed) return;
    installed = true;

    for (const name of ['log', 'warn', 'info', 'debug', 'error']) {
        const orig = console[name].bind(console);
        console[name] = (...args) => {
            if (shouldDrop(args)) return;
            orig(...args);
        };
    }

    const origErrWrite = process.stderr.write.bind(process.stderr);
    process.stderr.write = (chunk, encoding, cb) => {
        let enc = encoding;
        let callback = cb;
        if (typeof encoding === 'function') {
            callback = encoding;
            enc = undefined;
        }
        const s = Buffer.isBuffer(chunk)
            ? chunk.toString(typeof enc === 'string' ? enc : 'utf8')
            : typeof chunk === 'string'
              ? chunk
              : '';
        if (s.includes('[YOUTUBEJS][Text]')) {
            if (typeof callback === 'function') callback();
            return true;
        }
        if (typeof encoding === 'function') {
            return origErrWrite(chunk, callback);
        }
        return origErrWrite(chunk, encoding, cb);
    };
}

module.exports = { install };
