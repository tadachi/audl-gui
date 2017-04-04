"use strict";
exports.__esModule = true;
var crypto = require('crypto');
function work(limit) {
    if (limit === void 0) { limit = 100000; }
    var start = Date.now();
    var n = 0;
    while (n < limit) {
        // console.log(crypto.randomBytes(2048));
        n++;
    }
    return {
        timeElapsed: Date.now() - start
    };
}
var ytdl = require("ytdl-core");
var fs = require("fs");
function YTDownloadAudioShared(config, url, file_name) {
    if (config === void 0) { config = null; }
    return new Promise(function (resolve, reject) {
        var start = Date.now();
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
            console.log(Date.now() - start);
            resolve(true);
        });
    });
}
exports.YTDownloadAudioShared = YTDownloadAudioShared;
;
function YTdownloadAsAudio(url) {
    return new Promise(function (resolve, reject) {
        ytdl.getInfo(url, function (err, info) {
            var start = Date.now();
            var audio_file_meta = new YTAudioFileMeta(info);
            var file_type = '.m4a';
            // Remove unneeded characters and replace with underscores for readability and make it file friendly.
            var file_name = audio_file_meta.title.replace(/[^a-z]+/gi, '_').toLowerCase() + file_type; // music_title.m4a
            var write_stream = fs.createWriteStream(file_name);
            var audio = ytdl(url, { quality: 140 });
            audio.pipe(write_stream);
            audio.on('response', function (res) {
                var dataRead = 0;
                var totalSize = parseInt(res.headers['content-length']);
                var options = {
                    complete: '\u001b[42m \u001b[0m',
                    incomplete: '\u001b[41m \u001b[0m',
                    width: 20,
                    total: totalSize
                };
                //Example download youtube audio and save as .m4a with a progressbar.
                // let bar = new ProgressBar(` downloading [:bar] :percent :etas :current/:total - ${file_name}`, options);
                res.on('data', function (data) {
                    var chunk = data.length;
                    // bar.tick(chunk)
                });
            });
            audio.on('finish', function () {
                console.log(Date.now() - start);
                resolve(true);
            });
            audio.on('error', function () {
                reject(false);
            });
        });
    });
}
var url = 'https://www.youtube.com/watch?v=gXv57X7N510';
ytdl.getInfo(url, function (err, info) {
    var start = Date.now();
    var audio_file_meta = new YTAudioFileMeta(info);
    var file_type = '.m4a';
    // Remove unneeded characters and replace with underscores for readability and make it file friendly.
    var file_name = audio_file_meta.title.replace(/[^a-z]+/gi, '_').toLowerCase() + file_type; // music_title.m4a
    console.log(file_name);
    console.log(Date.now() - start);
    var write_stream = fs.createWriteStream(file_name);
    var audio = ytdl(url, { quality: 140 });
    audio.pipe(write_stream);
    audio.on('response', function (res) {
        var dataRead = 0;
        var totalSize = parseInt(res.headers['content-length']);
        var options = {
            complete: '\u001b[42m \u001b[0m',
            incomplete: '\u001b[41m \u001b[0m',
            width: 20,
            total: totalSize
        };
        //Example download youtube audio and save as .m4a with a progressbar.
        // let bar = new ProgressBar(` downloading [:bar] :percent :etas :current/:total - ${file_name}`, options);
        res.on('data', function (data) {
            var chunk = data.length;
            // bar.tick(chunk)
        });
    });
    audio.on('finish', function () {
        console.log(Date.now() - start);
    });
    audio.on('error', function () {
    });
});
var YTAudioFileMeta = (function () {
    function YTAudioFileMeta(data) {
        this.title = data.title;
        this.author = data.author;
        this.length_seconds = Number(data.length_seconds);
        this.description = data.description;
        this.view_count = Number(data.view_count);
        this.formats = {};
        for (var _i = 0, _a = data.formats; _i < _a.length; _i++) {
            var format = _a[_i];
            this.formats[format.itag] = format;
        }
    }
    return YTAudioFileMeta;
}());
