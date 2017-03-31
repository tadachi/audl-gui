"use strict";
exports.__esModule = true;
var ytdl = require("ytdl-core");
var Promise = require("bluebird");
var fs = require("fs");
var path = require("path");
// Return a promise to get youtube info such as itag, quality, bitrate.
function getInfo(url) {
    return new Promise(function (resolve, reject) {
        ytdl.getInfo(url, function (err, info) {
            if (info)
                resolve(info);
            if (err)
                reject(err);
        });
    });
}
exports.getInfo = getInfo;
// Return a promise to download youtube audio content. Downloads to the same directory audl was run in.
function YTdownloadAsAudio(url, directory) {
    if (directory === void 0) { directory = ""; }
    return new Promise(function (resolve, reject) {
        ytdl.getInfo(url, function (err, info) {
            var audio_file_meta = new YTAudioFileMeta(info);
            var file_type = '.m4a';
            // Remove unneeded characters and replace with underscores for readability and make it file friendly.
            var file_name = audio_file_meta.title.replace(/[^a-z]+/gi, '_').toLowerCase() + file_type; // music_title.m4a
            file_name = path.join(directory, file_name);
            var write_stream = fs.createWriteStream(file_name);
            var audio = ytdl(url, { quality: 140 });
            audio.pipe(write_stream);
            audio.on('response', function (res) {
                // Show progress while it's downloading.
            });
            audio.on('finish', function () {
                resolve(true);
            });
            audio.on('error', function () {
                reject(false);
            });
        });
    });
}
exports.YTdownloadAsAudio = YTdownloadAsAudio;
var YTAudioFileFormat = (function () {
    function YTAudioFileFormat(data) {
        this.itag = Number(data.itag);
        this.container = data.container;
        this.audioEncoding = data.audioEncoding;
        this.audioBitrate = data.audioBitrate;
        this.url = data.url;
    }
    return YTAudioFileFormat;
}());
exports.YTAudioFileFormat = YTAudioFileFormat;
var YTAudioFileMeta = (function () {
    function YTAudioFileMeta(data) {
        this.title = data.title;
        this.author = data.author;
        this.length_seconds = Number(data.length_seconds);
        this.description = data.description;
        this.view_count = Number(data.view_count);
        this.url = data.url;
        this.formats = {};
        for (var _i = 0, _a = data.formats; _i < _a.length; _i++) {
            var format = _a[_i];
            this.formats[format.itag] = format;
        }
    }
    return YTAudioFileMeta;
}());
exports.YTAudioFileMeta = YTAudioFileMeta;
