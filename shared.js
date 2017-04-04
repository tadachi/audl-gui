"use strict";
exports.__esModule = true;
var crypto = require('crypto');
// this usually takes a few seconds
function work(limit) {
    if (limit === void 0) { limit = 100000; }
    var start = Date.now();
    var n = 0;
    while (n < limit) {
        console.log(crypto.randomBytes(2048));
        n++;
    }
    return {
        timeElapsed: Date.now() - start
    };
}
exports.work = work;
var ytdl = require("ytdl-core");
var fs = require("fs");
function YTDownloadAudioShared(config, url, file_name) {
    if (config === void 0) { config = null; }
    return new Promise(function (resolve, reject) {
        // Save variable to know progress
        var received_bytes = 0;
        var total_bytes = 0;
        var write_stream = fs.createWriteStream(file_name);
        var audio = ytdl(url, { quality: 140 }); // 140 is an itag for 128kb audio quality.
        audio.pipe(write_stream);
        audio.on('response', function (req) {
            // Change the total bytes value to get progress later.
            // total_bytes = parseInt(req.headers['content-length']);
            // // Get progress if callback exists
            // if (config) {
            //     req.on('data', (chunk) => {
            //         // Update the received bytes.
            //         received_bytes += chunk.length;
            //         console.log(received_bytes + '/' + total_bytes);
            //         if (received_bytes <= total_bytes) {
            //             config.onProgress(received_bytes, total_bytes);
            //         }
            //     });
            // } else {
            req.on('data', function (chunk) {
                // Update the received bytes.
                received_bytes += chunk.length;
                // console.log(received_bytes);
            });
            // }
        });
        // Error.
        audio.on('error', function () {
            reject(false);
        });
        // Done
        audio.on('finish', function () {
            resolve(true);
        });
    });
}
exports.YTDownloadAudioShared = YTDownloadAudioShared;
;
