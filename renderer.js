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
// Audl
var audl_1 = require("./audl");
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
            color: '#67D5FF',
            trailColor: '#eee',
            trailWidth: 1,
            svgStyle: { width: '100%', height: '100%' },
            from: { color: '#67D5FF' },
            to: { color: '#36EA0D' } // lightgreen
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
function YTDownloadAudioCustom(url, file_name, config) {
    if (config === void 0) { config = {}; }
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
// let Versions = new Vue({
//     el: '#Versions',
//     data: {
//         node_version: process.versions.node,
//         chrome_version: process.versions.chrome,
//         electron_version: process.versions.electron,
//         vue_version: Vue.version
//     }
// });
var AudlFileMeta = (function () {
    function AudlFileMeta(id, audioUrl, youtubeUrl, ext, title, locFile, size, encoding, bitrate, thumbnail_url, prog) {
        if (prog === void 0) { prog = null; }
        // Set later.
        this.downloaded = false;
        this.error0 = "";
        this.received = 0;
        this.prog = null;
        this.id = id;
        this.audioUrl = audioUrl;
        this.youtubeUrl = youtubeUrl;
        this.ext = ext;
        this.title = title;
        this.locFile = locFile;
        this.size = size;
        this.encoding = encoding;
        this.bitrate = bitrate;
        this.thumbnail_url = thumbnail_url;
        this.prog = prog;
    }
    AudlFileMeta.prototype.setProgress = function (prog) {
        this.prog = prog;
    };
    return AudlFileMeta;
}());
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
        UPDATE: function (state, payload) {
            var i = payload.index;
            if (payload.received) {
                console.log(payload.received);
                state.files[i].received = payload.received;
            }
            if (payload.prog) {
                state.files[i].prog = payload.prog;
            }
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
var Files = new Vue({
    el: '#Files',
    data: {
        urls: "https://www.youtube.com/watch?v=gXv57X7N510\nhttps://www.youtube.com/watch?v=9bZkp7q19f0\nhttps://www.youtube.com/watch?v=DzivgKuhNl4",
        files: store.state.files,
        default_folder: store.state.folders.default_folder
    },
    methods: {
        addUrls: function () {
            var _this = this;
            var batch_urls = this.urls.split('\n');
            var promises_headers = [];
            var promises_meta = [];
            for (var i = 0; i < batch_urls.length; i++) {
                promises_meta.push(audl_1.getInfo(batch_urls[i]));
            }
            var e = 0;
            Promise.map(promises_meta, function (info) {
                var audio_file_meta = new audl_1.YTAudioFileMeta(info);
                var formats = audio_file_meta.formats;
                var div = shortid.generate();
                var audioUrl = formats['140'].url;
                var youtubeUrl = batch_urls[e];
                var ext = '.m4a';
                var title = info.title.replace(/[^a-z]+/gi, '_').toLowerCase(); // music_title.
                var locFile = path.join(_this.default_folder, (title + ext)); // C://User/Desktop/music_title.m4a
                var encoding = formats['140'].audioEncoding.toString();
                var bitrate = formats['140'].audioBitrate.toString();
                var thumbnail_url = info.thumbnail_url;
                headerFileSize(audioUrl).then(function (size) {
                    var data = new AudlFileMeta(div, audioUrl, youtubeUrl, ext, title, locFile, size, encoding, bitrate, thumbnail_url);
                    store.commit('ADD_URLS', { data: data });
                }).then(function () {
                    // Add progress bar after DOM is updated with nextTick();
                    Vue.nextTick(function () {
                        var prog = new Progress('#' + div);
                        store.commit('UPDATE', { index: e, prog: prog });
                        prog.finish();
                        e++;
                    });
                });
            }, { concurrency: 1 }).error(function (err) {
                console.log(err);
            });
            ;
        },
        startDownload: function (index) {
            var file = this.files[index];
            file.prog.finish();
            store.commit('SET_FILE_DOWNLOADED', { index: index });
            // let config = {
            //     localFile: file.locFile,
            //     onProgress: (received, total) => {
            //         let tick = (received / total).toFixed(2);
            //         store.commit('UPDATE', {index: index, received: received});
            //         prog.tick();
            //     },
            //     onFinish: () => {
            //         prog.finish();
            //     }
            // }
            // YTDownloadAudioCustom(file.youtubeUrl, file.locFile, config).then(() => {
            //     store.commit('SET_FILE_DOWNLOADED', { index: index });
            // }).catch((e) => {
            //     store.commit('SET_FILE_ERROR', { index: index, e: e.message });
            // });
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
Files.addUrls();
var Debug = new Vue({
    el: '#debug',
    data: {
        state: store.state
    },
    template: "\n    <div class=\"debug\">\n        <div>\n            {{state.folders.default_folder}}\n        </div>\n        <br />\n        <div v-for=\"(file,index) in state.files\">\n        {{index}} {{file.id}}<br />\n        {{file.title}}<br />\n        {{file.youtubeUrl}}<br />\n        {{file.locFile}}<br />\n        {{file.encoding}}<br />\n        {{file.bitrate}}<br />\n        {{file.thumbnail_url}}<br />\n        {{file.downloaded}}<br />\n        {{file.received}} / {{file.size}}<br />\n        ___________\n        </div>\n    </div>\n    "
});
