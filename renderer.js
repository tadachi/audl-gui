// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
"use strict";
exports.__esModule = true;
var audl = require("./audl");
require('console.table');
var url = 'https://www.youtube.com/watch?v=dPbL4Y8KsSM';
audl.getInfo(url).then(function (info) {
    var audio_file_meta = new audl.YTAudioFileMeta(info);
    var title = info.title.replace(/[^a-z]+/gi, '_').toLowerCase(); // music_title.
    var formats = audio_file_meta.formats;
    var itag_info = [];
    function push(itag) {
        itag_info.push({
            title: title,
            itag: formats[itag].itag.toString(),
            encoding: formats[itag].audioEncoding.toString(),
            bitrate: formats[itag].audioBitrate.toString()
        });
    }
    for (var itag in formats) {
        var found = false;
        if (itag === '139')
            push(itag);
        if (itag === '140')
            push(itag);
        if (itag === '141')
            push(itag);
    }
    console.log();
    console.table(itag_info);
}).error(function (err) {
    console.log(err);
});
