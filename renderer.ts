// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

import audl = require("./audl");
require('console.table');

let url: string = 'https://www.youtube.com/watch?v=dPbL4Y8KsSM';


audl.getInfo(url).then((info) => {
    let audio_file_meta = new audl.YTAudioFileMeta(info);
    let title = info.title.replace(/[^a-z]+/gi, '_').toLowerCase(); // music_title.
    let formats = audio_file_meta.formats;
    let itag_info = [];

    function push(itag) {
        itag_info.push({
            title: title,
            itag: formats[itag].itag.toString(),
            encoding: formats[itag].audioEncoding.toString(),
            bitrate: formats[itag].audioBitrate.toString(),
        })
    }

    for (let itag in formats) {
        let found = false;
        if (itag === '139') push(itag)
        if (itag === '140') push(itag)
        if (itag === '141') push(itag)
    }

    console.log()
    console.table(itag_info);
}).error((err) => {
    console.log(err);
});