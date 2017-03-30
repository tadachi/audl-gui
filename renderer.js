// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
"use strict";
exports.__esModule = true;
var audl = require("./audl");
var ytdl = require("ytdl-core");
var ProgressBar = require("progressbar.js");
var fs = require("fs");
var request = require("request");
var shortid = require("shortid");
var electron = require("electron");
var path = require("path");
var Promise = require("bluebird");
var Vue = require("./node_modules/vue/dist/vue");
var Vuex = require("./node_modules/vuex/dist/vuex");
Vue.use(Vuex);
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
// let prog = new Progress('test');
// let config = {
//     remoteFile: remFile,
//     localFile: locFile,
//     onProgress: (received, total) => {
//         let tick = (received / total).toFixed(2);
//         prog.tick();
//     },
//     onFinish: () => {
//         prog.finish();
//     }
// }
// downloadFile(config).then(() => {
// }).catch((e) => {
// });
function YTDownloadAudioCustom(config, url, file_name) {
    return new Promise(function (resolve, reject) {
        // Save variable to know progress
        var received_bytes = 0;
        var total_bytes = 0;
        var write_stream = fs.createWriteStream(file_name);
        var audio = ytdl(url);
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
        files: [],
        queue: []
    },
    mutations: {
        QUEUE_URLS: function (state, payload) {
            console.log(payload);
            for (var i = 0; i < payload.data.length; i++) {
                state.queue.push(payload.data[i]);
            }
        },
        CLEAR_URL: function (state, payload) {
            state.queue.splice(payload.index, 1);
        },
        CLEAR_ALL_URLS: function (state) {
            state.queue.splice(0, state.queue.length);
        },
        ADD_FILE: function (state, payload) {
            var file = {
                id: payload.id,
                locFile: payload.locFile,
                location: state.default_folder,
                error0: null
            };
            state.files.push(file);
        },
        EDIT_FILE: function (state, payload) {
            var i = payload.index;
            state.files[i].error0 = payload.e;
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
var Files = new Vue({
    el: '#Files',
    data: {
        urls: "https://www.youtube.com/watch?v=gXv57X7N510\nhttps://www.youtube.com/watch?v=9bZkp7q19f0\nhttps://www.youtube.com/watch?v=DzivgKuhNl4",
        files: store.state.files,
        default_folder: store.state.folders.default_folder,
        queue: store.state.queue
    },
    methods: {
        queueUrls: function () {
            var batch_urls = this.urls.split('\n');
            var promises = [];
            var data = [];
            for (var i = 0; i < batch_urls.length; i++) {
                promises.push(audl.getInfo(batch_urls[i]));
            }
            var e = 0;
            Promise.map(promises, function (info) {
                var audio_file_meta = new audl.YTAudioFileMeta(info);
                var title = info.title.replace(/[^a-z]+/gi, '_').toLowerCase(); // music_title.
                var payload = {
                    title: title,
                    url: batch_urls[e]
                };
                console.log(payload);
                data.push(payload);
                // e++;
            }, { concurrency: 1 }).then(function () {
                store.commit('QUEUE_URLS', { data: data });
            }).error(function (err) {
                console.log(err);
            });
            ;
        },
        clearUrl: function (index) {
            store.commit('CLEAR_URL', { index: index });
        },
        clearAllUrls: function () {
            store.commit('CLEAR_ALL_URLS');
        },
        addFile: function (index) {
            var _this = this;
            var title = this.queue[index].title;
            var url = this.queue[index].url;
            var div = shortid.generate();
            var ext = '.m4a';
            var locFile = path.join(this.default_folder, (title + ext));
            // const remFile = "hhttp://download.thinkbroadband.com/5MB.zip"
            // const locFile = "/dia.zip"
            store.commit('ADD_FILE', {
                id: div,
                locFile: locFile,
                default_folder: this.default_folder
            });
            // Update Vue render.
            this.$nextTick(function () {
                var prog = new Progress('#' + div);
                var config = {
                    localFile: locFile,
                    onProgress: function (received, total) {
                        // let tick = (received / total).toFixed(2);
                        prog.tick();
                    },
                    onFinish: function () {
                        prog.finish();
                    }
                };
                YTDownloadAudioCustom(config, url, locFile).then(function () {
                })["catch"](function (e) {
                    var i = _this.files.length - 1;
                    store.commit('EDIT_FILE', { index: i, e: e.message });
                });
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
    template: "\n    <div class=\"debug\">\n        <div>\n            {{state.folders.default_folder}}\n        </div>\n        <br />\n        <div v-for=\"(item,index) in state.queue\">\n        {{index}} {{item.title}} {{item.url}} \n        </div>\n        <br />\n        <div v-for=\"(file,index) in state.files\">\n        {{index}} {{file.file}} \n        </div>\n    </div>\n    "
});
