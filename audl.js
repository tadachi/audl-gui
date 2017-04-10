"use strict";
exports.__esModule = true;
var ytdl = require("ytdl-core");
var Promise = require("bluebird");
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
function valid_youtube_match(url) {
    if (!url) {
        return false;
    }
    var youtube_valid_regexp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|\?v=)([^#\&\?]*).*/;
    var match = url.match(youtube_valid_regexp);
    if (match && match[2].length == 11) {
        return true;
    }
    else {
        return false;
    }
}
exports.valid_youtube_match = valid_youtube_match;
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
