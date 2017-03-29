// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
"use strict";
exports.__esModule = true;
var ProgressBar = require("progressbar.js");
var fs = require("fs");
var request = require("request");
var shortid = require("shortid");
var electron = require("electron");
var path = require("path");
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
        if (t >= 1)
            this.bar.aniamte(1);
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
        this.bar.aniamte(this.ticks);
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
        urls: [],
        files: [],
        folders: { default_folder: BASEPATH }
    },
    mutations: {
        ADD_FILE: function (state, payload) {
            var file = {
                id: payload.id,
                remFile: payload.remFile,
                locFile: payload.locFile,
                file: path.join(payload.default_folder, payload.locFile),
                location: state.default_folder,
                error0: null
            };
            state.files.push(file);
            console.log(state.files);
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
            console.log(state.files);
        },
        CHANGE_DEFAULT_FOLDER: function (state, payload) {
            state.folders = { default_folder: payload.new_default_folder };
            console.log(state.folders.default_folder);
        }
    }
});
var Debug = new Vue({
    el: '#debug',
    data: {
        files: store.state.files
    },
    template: "\n    <div class=\"debug\">\n        <div v-for=\"(file,index) in files\">\n        {{file.file}} \n        </div>\n    </div>\n    "
});
var Files = new Vue({
    el: '#Files',
    data: {
        files: store.state.files,
        default_folder: store.state.folders.default_folder
    },
    methods: {
        addFile: function () {
            var div = shortid.generate();
            var remFile = "hhttp://download.thinkbroadband.com/5MB.zip";
            var locFile = "/dia.zip";
            store.commit('ADD_FILE', {
                id: div,
                remFile: remFile,
                locFile: locFile,
                default_folder: this.default_folder
            });
            var i = this.files.length - 1;
            // Update Vue render.
            this.$nextTick(function () {
                var prog = new Progress('#' + div);
                var config = {
                    remoteFile: remFile,
                    localFile: locFile,
                    onProgress: function (received, total) {
                        var tick = (received / total).toFixed(2);
                        prog.tick();
                    },
                    onFinish: function () {
                        prog.finish();
                    }
                };
                downloadFile(config).then(function () {
                })["catch"](function (e) {
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
