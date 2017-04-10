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
var audl_1 = require("./audl");
// Vue
var Vue = require("./node_modules/vue/dist/vue");
var Vuex = require("./node_modules/vuex/dist/vuex");
Vue.use(Vuex);
// Electron
var electron = require("electron");
var dialog = electron.remote.dialog;
var app = electron.remote.app;
var shell = electron.remote.shell;
var BASEPATH = app.getAppPath();
var NOT_VALID_YOUTUBE_URL = "Not a Valid Youtube URL.";
var VALID_YOUTUBE_URL = "Valid Youtube URL.";
var Progress = (function () {
    function Progress(div) {
        this._div = div;
        this.ticks = 0.00; // How far the bar is completed 0.00 to 1.00
        this.config = {
            strokeWidth: 2,
            easing: 'easeInOut',
            color: '#67D5FF',
            trailColor: '#eee',
            trailWidth: 0,
            svgStyle: { width: '100%', height: '100%' },
            from: { color: '#67D5FF' },
            to: { color: '#36EA0D' },
            warnings: true
        };
        this.bar = new ProgressBar.Line(this._div, this.config);
    }
    Progress.prototype.tick = function (t) {
        if (t >= 1) {
            this.bar.animate(1.00);
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
        this.ticks = 1.00;
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
            config.onFinish();
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
        files: new Array(),
        urls: ["https://www.youtube.com/watch?v=9bZkp7q19f0", "https://www.youtube.com/watch?v=DzivgKuhNl4", null, null, null]
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
                state.files[i].received = payload.received;
            }
            if (payload.prog) {
                state.files[i].prog = payload.prog;
            }
        },
        ADD_URL: function (state, payload) {
            state.urls.push(payload.value);
        },
        SET_URLS: function (state, payload) {
            state.urls = payload.urls;
        },
        UPDATE_URL: function (state, payload) {
            var i = payload.index;
            state.urls[i] = payload.value;
        },
        REMOVE_URL: function (state, payload) {
            state.urls.splice(payload.index, 1);
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
        urls: store.state.urls,
        files: store.state.files,
        default_folder: store.state.folders.default_folder,
        batch: "",
        line_errors: new Array(store.state.urls.length)
    },
    created: function () {
        this.batch = this.formatted_urls;
        this.validate_urls;
    },
    computed: {
        formatted_urls: function () {
            var batch_text = "";
            for (var _i = 0, _a = store.state.urls; _i < _a.length; _i++) {
                var string = _a[_i];
                if (string)
                    batch_text = batch_text + string + '\n';
            }
            return batch_text;
        },
        validate_urls: function () {
            for (var i = 0; i < this.urls.length; i++) {
                var url = this.urls[i];
                var valid = audl_1.valid_youtube_match(url);
                if (url == null || url == "") {
                    this.line_errors[i] = { msg: "", error: false };
                }
                else if (!valid) {
                    this.line_errors[i] = { msg: NOT_VALID_YOUTUBE_URL, error: true };
                }
                else if (valid) {
                    this.line_errors[i] = { msg: VALID_YOUTUBE_URL, error: false };
                }
            }
        }
    },
    methods: {
        addInput: function () {
            store.commit('ADD_URL', { value: "" });
            this.line_errors.push({ msg: "", error: false });
            this.urls = store.state.urls;
        },
        removeInput: function (index) {
            store.commit('REMOVE_URL', { index: index });
            this.urls = store.state.urls;
            this.line_errors.splice(index, 1);
        },
        updateUrl: function (index, url) {
            var valid = audl_1.valid_youtube_match(url);
            if (url == null || url == "") {
                store.commit('UPDATE_URL', { index: index, value: url });
                this.line_errors[index] = { msg: "", error: false };
            }
            else if (!valid) {
                store.commit('UPDATE_URL', { index: index, value: url });
                this.line_errors[index] = { msg: NOT_VALID_YOUTUBE_URL, error: true };
            }
            else if (valid) {
                store.commit('UPDATE_URL', { index: index, value: url });
                this.line_errors[index] = { msg: VALID_YOUTUBE_URL, error: false };
            }
            this.urls = store.state.urls;
            this.syncInputToBatch();
        },
        updateBatch: function (value) {
            var clean_urls = value.toString().split(/[,\n\r]+/).filter(function (v) { return v != ""; }); // Split on , \n \r, and filter out empty strings
            // Make sure there is at least one input. Always have one element.
            if (clean_urls.length <= 0) {
                clean_urls = [""];
            }
            store.commit('SET_URLS', { urls: clean_urls });
            this.urls = store.state.urls;
            this.line_errors = new Array(this.urls.length);
            this.validate_urls; // Keep this in sync with this.urls
        },
        syncInputToBatch: function () {
            var batch_text = "";
            for (var _i = 0, _a = this.urls; _i < _a.length; _i++) {
                var string = _a[_i];
                if (string)
                    batch_text = batch_text + string + '\n';
            }
            this.batch = batch_text;
        },
        addUrls: function () {
            var _this = this;
            // Error check before we do anything.
            var error = false;
            if (this.urls.length != this.line_errors.length) {
                this.youtube_error = "Number of URLs do not match number of line_errors.";
                return;
            }
            for (var i = 0; i < this.urls.length; i++) {
                var url = this.urls[i];
                if (url === null || url === "" || audl_1.valid_youtube_match(url)) {
                    continue;
                }
                else {
                    this.line_errors[i] = { msg: NOT_VALID_YOUTUBE_URL, error: true };
                    error = true;
                }
            }
            if (error) {
                return;
            } // Error found. 
            var promises_headers = [];
            var promises_meta = [];
            for (var i = 0; i < this.urls.length; i++) {
                var url = this.urls[i];
                console.log(url);
                if (url != undefined && url != null && this.urls[i] != "")
                    promises_meta.push(audl_1.getInfo(url));
            }
            Promise.map(promises_meta, function (info) {
                console.log(info);
                var audio_file_meta = new audl_1.YTAudioFileMeta(info);
                var formats = audio_file_meta.formats;
                var div = shortid.generate();
                var audioUrl = formats['140'].url;
                var youtubeUrl = info.video_url;
                var ext = '.m4a';
                var title = info.title.replace(/[^a-z]+/gi, '_').toLowerCase(); // music_title.
                var locFile = path.join(_this.default_folder, (title + ext)); // C://User/Desktop/music_title.m4a
                var encoding = formats['140'].audioEncoding.toString();
                var bitrate = formats['140'].audioBitrate.toString();
                var thumbnail_url = info.thumbnail_url;
                headerFileSize(audioUrl).then(function (size) {
                    size = bytes(size, 'MB');
                    var data = new AudlFileMeta(div, audioUrl, youtubeUrl, ext, title, locFile, size, encoding, bitrate, thumbnail_url);
                    store.commit('ADD_URLS', { data: data });
                }).then(function () {
                    // Add progress bar after DOM is updated with nextTick();
                    // Vue.nextTick(() => {
                    // let prog = new Progress('#' + div);
                    // store.commit('UPDATE', { index: (this.files.length-1), prog: prog })
                    // this.e++;
                    // })
                });
            }, { concurrency: 1 }).error(function (err) {
                console.log(err);
            });
        },
        startDownload: function (index) {
            store.commit('SET_FILE_DOWNLOADED', { index: index });
            var file = this.files[index];
            var config = {
                localFile: file.locFile,
                onProgress: function (received, total) {
                    Vue.nextTick(function () {
                        store.commit('UPDATE', { index: index, received: bytes(received, 'MB') });
                        // this.files[index].prog.tick();
                    });
                },
                onFinish: function () {
                    Vue.nextTick(function () {
                        // this.files[index].prog.finish();
                    });
                }
            };
            YTDownloadAudioCustom(file.youtubeUrl, file.locFile, config)["catch"](function (e) {
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
        },
        showInFolder: function (index) {
            var item = shell.showItemInFolder(this.files[index].locFile);
        }
    }
});
// Files.addUrls();
var Debug = new Vue({
    el: '#debug',
    data: {
        state: store.state,
        node_version: process.versions.node,
        chrome_version: process.versions.chrome,
        electron_version: process.versions.electron,
        vue_version: Vue.version
    },
    template: "\n<div class=\"debug\">\n    <div>\n        <pre>\n{{state.folders.default_folder}}\nNode: {{node_version}}\nChrome: {{chrome_version}}\nVue: {{vue_version}}\n        </pre>\n    </div>\n    <div v-for=\"(url, index) in state.urls\">\n{{index}} {{url}}  \n    </div>\n    <div v-for=\"(file,index) in state.files\">\n        <pre>\n{{index}} \n#{{file.id}}\n{{file.title}}\n{{file.youtubeUrl}}\n{{file.locFile}}\n{{file.encoding}}\n{{file.bitrate}}\n{{file.thumbnail_url}}\n{{file.downloaded}}\n{{file.received}} / {{file.size}}\n{{file.error0}} \n        </pre>\n    </div>\n</div>\n    "
});
