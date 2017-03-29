// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

import audl = require("./audl");
import * as SVG from 'svg.js';
import * as ProgressBar from 'progressbar.js';
import fs = require('fs');
import request = require('request');
import shortid = require('shortid');
import electron = require('electron');
import path = require('path');
import Vue = require('./node_modules/vue/dist/vue');
import Vuex = require('./node_modules/vuex/dist/vuex');
import { mapState } from 'vuex'
Vue.use(Vuex);
const { dialog } = electron.remote;
const { app } = electron.remote;
const BASEPATH = app.getAppPath();

class Progress {
    config: any;
    _div: string;
    bar: any;
    ticks: number;

    constructor(div: string) {
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
                },
            },
            from: { color: '#FFEA82' },
            to: { color: '#ED6A5A' }
        }
        this.bar = new ProgressBar.Line(this._div, this.config);
    }
    tick(t?: number): void {
        if (t >= 1)
            this.bar.aniamte(1);

        if (t) {
            this.bar.animate(t);
            return;
        }

        if (this.ticks <= 1.0) {
            this.ticks += 0.01
            this.bar.animate(this.ticks);  // Number from 0.0 to 1.0
        }
        return;
    }

    finish(): void {
        this.ticks = 1.0
        this.bar.aniamte(this.ticks);
    }
}

/**
 * Promise based download file method
 */
function downloadFile(config) {
    return new Promise(function (resolve, reject) {
        // Save variable to know progress
        let received_bytes = 0;
        let total_bytes = 0;

        const req = request({
            method: 'GET',
            uri: config.remoteFile
        });

        let out = fs.createWriteStream(config.localFile);
        req.pipe(out);

        req.on('response', function (data) {
            // Change the total bytes value to get progress later.
            total_bytes = parseInt(data.headers['content-length']);
        });

        req.on('error', (err) => {
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
        } else {
            req.on('data', function (chunk) {
                // Update the received bytes.
                received_bytes += chunk.length;
            });
        }
        if (config.hasOwnProperty("onFinish")) {
            req.on('end', function () {
                resolve();
            });
        } else { // Finish.
            req.on('end', function () {
                resolve();
            })
        }
    });
}

let Versions = new Vue({
    el: '#Versions',
    data: {
        node_version: process.versions.node,
        chrome_version: process.versions.chrome,
        electron_version: process.versions.electron,
        vue_version: Vue.version
    }
});

const store = new Vuex.Store({
    state: {
        files: [],
        folders: { default_folder: BASEPATH }
    },
    mutations: {
        ADD_FILE(state, payload): void {
            const file = {
                id: payload.id,
                remFile: payload.remFile,
                locFile: payload.locFile,
                file: path.join(payload.default_folder, payload.locFile),
                location: state.default_folder,
                error0: null
            }
            state.files.push(file);
            console.log(state.files);
        },
        EDIT_FILE(state, payload): void {
            const i = payload.index;
            state.files[i].error0 = payload.e;
        },
        CLEAR_FILE(state, payload): void {
            state.files.splice(payload.index, 1);
        },
        CLEAR_ALL_FILES(state): void {
            state.files.splice(0, state.files.length);
            console.log(state.files);
        },
        CHANGE_DEFAULT_FOLDER(state, payload): void {
            state.folders = { default_folder: payload.new_default_folder };
            console.log(state.folders.default_folder);
        }
    }
});

let Files = new Vue({
    el: '#Files',
    data: {
        files: store.state.files,
        default_folder: store.state.folders.default_folder
    },
    methods: {
        addFile(): void {
            const div = shortid.generate();
            const remFile = "hhttp://download.thinkbroadband.com/5MB.zip"
            const locFile = "/dia.zip"
            store.commit('ADD_FILE',
                {
                    id: div,
                    remFile: remFile,
                    locFile: locFile,
                    default_folder: this.default_folder
                }
            );
            const i = this.files.length - 1;
            // Update Vue render.
            this.$nextTick(() => {
                let prog = new Progress('#' + div);

                let config = {
                    remoteFile: remFile,
                    localFile: locFile,
                    onProgress: (received, total) => {
                        let tick = (received / total).toFixed(2);
                        prog.tick();
                    },
                    onFinish: () => {
                        prog.finish();
                    }
                }
                downloadFile(config).then(() => {

                }).catch((e) => {
                    store.commit('EDIT_FILE', { index: i, e: e.message });
                });
            })
        },
        clearFile(index): void {
            store.commit('CLEAR_FILE', { index })
        },
        clearAllFiles(): void {
            store.commit('CLEAR_ALL_FILES');
        },
        changeDefaultFolder(): void {
            // Show a dialog to change default download folder.
            let new_default_folder = dialog.showOpenDialog({ properties: ['openFile', 'openDirectory', 'multiSelections'] })[0];
            // Just grab the first value.
            if (new_default_folder[0])
                this.default_folder = new_default_folder;
            store.commit('CHANGE_DEFAULT_FOLDER', { new_default_folder });
        }
    }
});

// let url: string = 'https://www.youtube.com/watch?v=dPbL4Y8KsSM';

// audl.getInfo(url).then((info) => {
//     let audio_file_meta = new audl.YTAudioFileMeta(info);
//     let title = info.title.replace(/[^a-z]+/gi, '_').toLowerCase(); // music_title.
//     let formats = audio_file_meta.formats;
//     let itag_info = [];

//     function push(itag) {
//         itag_info.push({
//             title: title,
//             itag: formats[itag].itag.toString(),
//             encoding: formats[itag].audioEncoding.toString(),
//             bitrate: formats[itag].audioBitrate.toString(),
//         })
//     }

//     for (let itag in formats) {
//         let found = false;
//         if (itag === '139') push(itag)
//         if (itag === '140') push(itag)
//         if (itag === '141') push(itag)
//     }

//     // console.log()
//     // console.table(itag_info);
// }).error((err) => {
//     // console.log(err);
// });