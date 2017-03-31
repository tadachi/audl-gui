// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
"use strict";
exports.__esModule = true;
// Misc
var ytdl = require("ytdl-core");
var ProgressBar = require("progressbar.js");
var fs = require("fs");
var request = require("request");
var shortid = require("shortid");
var path = require("path");
var Promise = require("bluebird");
var bytes = require("bytes");
// Audl
var audl = require("./audl");
// Vue
var Vue = require("./node_modules/vue/dist/vue");
var Vuex = require("./node_modules/vuex/dist/vuex");
Vue.use(Vuex);
// Electron
var electron = require("electron");
var dialog = electron.remote.dialog;
var app = electron.remote.app;
var BASEPATH = app.getAppPath();
var Progress = (function () {
    function Progress(div) {
        this._div = div;
        this.ticks = 0.00; // How far the bar is completed 0.00 to 1.00
        this.config = {
            strokeWidth: 3,
            easing: 'easeInOut',
            color: '#FFEA82',
            trailColor: '#eee',
            trailWidth: 1,
            svgStyle: { width: '100%', height: '100%' },
            text: {
                style: {
                    color: '#999',
                    position: 'absolute',
                    right: '0',
                    top: '30px',
                    padding: 0,
                    margin: 0,
                    transform: null
                }
            },
            from: { color: '#FFEA82' },
            to: { color: '#ED6A5A' }
        };
        this.bar = new ProgressBar.Line(this._div, this.config);
    }
    Progress.prototype.tick = function (t) {
        if (t >= 1) {
            this.bar.animate(1);
            return;
        }
        if (t) {
            this.bar.animate(t);
            return;
        }
        if (this.ticks <= 1.0) {
            this.ticks += 0.01;
            this.bar.animate(this.ticks); // Number from 0.0 to 1.0
        }
        return;
    };
    Progress.prototype.finish = function () {
        this.ticks = 1.0;
        this.bar.animate(this.ticks);
    };
    return Progress;
}());
var Timer = (function () {
    function Timer() {
        this.intervals = [];
    }
    Timer.prototype.addInterval = function (interval) {
        this.intervals.push(interval);
    };
    Timer.prototype.clearInterval = function (index) {
        clearInterval(this.intervals[index]);
    };
    Timer.prototype.clearAllIntervals = function () {
        for (var i = 0; i <= this.intervals.length; i++) {
            clearInterval(this.intervals[i]);
        }
    };
    return Timer;
}());
/**
 * Promise based download file method
 */
function downloadFile(config) {
    return new Promise(function (resolve, reject) {
        // Save variable to know progress
        var received_bytes = 0;
        var total_bytes = 0;
        var req = request({
            method: 'GET',
            uri: config.remoteFile
        });
        var out = fs.createWriteStream(config.localFile);
        req.pipe(out);
        req.on('response', function (data) {
            // Change the total bytes value to get progress later.
            total_bytes = parseInt(data.headers['content-length']);
        });
        req.on('error', function (err) {
            reject(err);
        });
        // Get progress if callback exists
        if (config.hasOwnProperty("onProgress")) {
            req.on('data', function (chunk) {
                // Update the received bytes.
                received_bytes += chunk.length;
                if (received_bytes <= total_bytes) {
                    config.onProgress(received_bytes, total_bytes);
                }
            });
        }
        else {
            req.on('data', function (chunk) {
                // Update the received bytes.
                received_bytes += chunk.length;
            });
        }
        if (config.hasOwnProperty("onFinish")) {
            req.on('end', function () {
                resolve();
            });
        }
        else {
            req.on('end', function () {
                resolve();
            });
        }
    });
}
/**
 * Returns just the file size in bytes.
 */
function headerFileSize(url) {
    var options = {
        method: 'HEAD',
        uri: url
    };
    return new Promise(function (resolve, reject) {
        var req = request(options);
        req.on('response', function (data) {
            var file_size = parseInt(data.headers['content-length']);
            resolve(file_size);
        });
        req.on('error', function (e) {
            reject(e);
        });
        req.on('end', function () {
            resolve(null);
        });
    });
}
function YTDownloadAudioCustom(config, url, file_name) {
    return new Promise(function (resolve, reject) {
        // Save variable to know progress
        var received_bytes = 0;
        var total_bytes = 0;
        var write_stream = fs.createWriteStream(file_name);
        var audio = ytdl(url, { quality: 140 }); // 140 is an itag for 128kb audio quality.
        audio.pipe(write_stream);
        audio.on('response', function (req) {
            // Change the total bytes value to get progress later.
            total_bytes = parseInt(req.headers['content-length']);
            // Get progress if callback exists
            if (config.hasOwnProperty("onProgress")) {
                req.on('data', function (chunk) {
                    // Update the received bytes.
                    received_bytes += chunk.length;
                    console.log(received_bytes + '/' + total_bytes);
                    if (received_bytes <= total_bytes) {
                        config.onProgress(received_bytes, total_bytes);
                    }
                });
            }
            else {
                req.on('data', function (chunk) {
                    // Update the received bytes.
                    received_bytes += chunk.length;
                });
            }
        });
        // Error.
        audio.on('error', function () {
            reject(false);
        });
        // Finish.
        if (config.hasOwnProperty("onFinish")) {
            audio.on('finish', function () {
                resolve(true);
            });
        }
        else {
            audio.on('finish', function () {
                resolve(true);
            });
        }
    });
}
;
var Versions = new Vue({
    el: '#Versions',
    data: {
        node_version: process.versions.node,
        chrome_version: process.versions.chrome,
        electron_version: process.versions.electron,
        vue_version: Vue.version
    }
});
var store = new Vuex.Store({
    state: {
        folders: { default_folder: BASEPATH },
        files: new Array()
    },
    mutations: {
        ADD_URLS: function (state, payload) {
            state.files.push(payload.data);
        },
        SET_FILE_ERROR: function (state, payload) {
            var i = payload.index;
            state.files[i].error0 = payload.e;
        },
        SET_FILE_DOWNLOADED: function (state, payload) {
            var i = payload.index;
            state.files[i].downloaded = true;
        },
        CLEAR_FILE: function (state, payload) {
            state.files.splice(payload.index, 1);
        },
        CLEAR_ALL_FILES: function (state) {
            state.files.splice(0, state.files.length);
        },
        CHANGE_DEFAULT_FOLDER: function (state, payload) {
            state.folders = { default_folder: payload.new_default_folder };
        }
    }
});
// let prog = new Progress('#test');
// let config = {
//     onProgress: (received, total) => {
//         // let tick = parseFloat((received / total).toFixed(2));
//         prog.tick();
//     },
//     onFinish: () => {
//         prog.finish();
//     }
// }
// const test = `C:\\Users\\tadachi\\Desktop\\test.m4a`;
// YTDownloadAudioCustom(config, 'https://www.youtube.com/watch?v=RyoMQg3d5cs', test);
// let timer = new Timer();
// timer.addInterval(setInterval(() => {
// }, 1000));
// timer.addInterval(setInterval(() => {
//     console.log('test2');
// }, 3000));
// setTimeout(() => {
//     timer.clearAllIntervals()
//     console.log('timers cleared');
// }, 7000);
var AudlFileMeta = (function () {
    function AudlFileMeta(id, audioUrl, youtubeUrl, ext, title, locFile, size, encoding, bitrate) {
        // Set later.
        this.downloaded = false;
        this.error0 = "";
        this.id = id;
        this.audioUrl = audioUrl;
        this.youtubeUrl = youtubeUrl;
        w;
        this.ext = ext;
        this.title = title;
        this.locFile = locFile;
        this.size = size;
        this.encoding = encoding;
        this.bitrate = bitrate;
    }
    return AudlFileMeta;
}());
audl.getInfo('https://www.youtube.com/watch?v=gXv57X7N510').then(function (info) {
    var audio_file_meta = new audl.YTAudioFileMeta(info);
    var title = info.title.replace(/[^a-z]+/gi, '_').toLowerCase(); // music_title.
    var formats = audio_file_meta.formats;
    var itag_info = [];
    function push(itag) {
        itag_info.push({
            title: title,
            itag: formats[itag].itag.toString(),
            encoding: formats[itag].audioEncoding.toString(),
            bitrate: formats[itag].audioBitrate.toString(),
            url: formats[itag].url
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
    headerFileSize(itag_info[0].url).then(function (info) {
        console.log(bytes(info, { unit: 'MB' }));
    });
    console.table(itag_info);
});
var Files = new Vue({
    el: '#Files',
    data: {
        urls: "https://www.youtube.com/watch?v=gXv57X7N510\nhttps://www.youtube.com/watch?v=9bZkp7q19f0\nhttps://www.youtube.com/watch?v=DzivgKuhNl4",
        files: store.state.files,
        default_folder: store.state.folders.default_folder
    },
    store: store,
    methods: {
        addUrls: function () {
            var _this = this;
            var batch_urls = this.urls.split('\n');
            var promises_headers = [];
            var promises_meta = [];
            for (var i = 0; i < batch_urls.length; i++) {
                promises_meta.push(audl.getInfo(batch_urls[i]));
            }
            var e = 0;
            Promise.map(promises_meta, function (info) {
                var audio_file_meta = new audl.YTAudioFileMeta(info);
                var formats = audio_file_meta.formats;
                var div = shortid.generate();
                var audioUrl = formats['140'].url;
                var youtubeUrl = batch_urls[e];
                var ext = '.m4a';
                var title = info.title.replace(/[^a-z]+/gi, '_').toLowerCase(); // music_title.
                var locFile = path.join(_this.default_folder, (title + ext)); // C://User/Desktop/music_title.m4a
                var encoding = formats['140'].audioEncoding.toString();
                var bitrate = formats['140'].audioBitrate.toString();
                headerFileSize(audioUrl).then(function (size) {
                    var data = new AudlFileMeta(div, audioUrl, youtubeUrl, ext, title, locFile, size, encoding, bitrate);
                    console.log(data);
                    store.commit('ADD_URLS', { data: data });
                    e++;
                });
            }, { concurrency: 1 }).error(function (err) {
                console.log(err);
            });
            ;
        },
        startDownload: function (index) {
            var file = this.files[index];
            var prog = new Progress('#' + file.id);
            var config = {
                localFile: file.locFile,
                onProgress: function (received, total) {
                    // let tick = (received / total).toFixed(2);
                    prog.tick();
                },
                onFinish: function () {
                    prog.finish();
                }
            };
            YTDownloadAudioCustom(config, file.url, file.locFile).then(function () {
                store.commit('SET_FILE_DOWNLOADED', { index: index });
            })["catch"](function (e) {
                store.commit('SET_FILE_ERROR', { index: index, e: e.message });
            });
        },
        clearFile: function (index) {
            store.commit('CLEAR_FILE', { index: index });
        },
        clearAllFiles: function () {
            store.commit('CLEAR_ALL_FILES');
        },
        changeDefaultFolder: function () {
            // Show a dialog to change default download folder.
            var new_default_folder = dialog.showOpenDialog({ properties: ['openFile', 'openDirectory', 'multiSelections'] })[0];
            // Just grab the first value.
            if (new_default_folder[0])
                this.default_folder = new_default_folder;
            store.commit('CHANGE_DEFAULT_FOLDER', { new_default_folder: new_default_folder });
        }
    }
});
var Debug = new Vue({
    el: '#debug',
    data: {
        state: store.state
    },
    template: "\n    <div class=\"debug\">\n        <div>\n            {{state.folders.default_folder}}\n        </div>\n        <br />\n        <div v-for=\"(file,index) in state.files\">\n        {{index}} {{file.id}}<br />\n        {{file.title}}<br />\n        {{file.youtubeUrl}}<br />\n        {{file.locFile}}<br />\n        {{file.size}}<br />\n        {{file.encoding}}<br />\n        {{file.bitrate}}<br />\n        ___________\n        </div>\n    </div>\n    "
});
