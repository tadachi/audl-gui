// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

import audl = require("./audl");
import ytdl = require('ytdl-core');
import * as SVG from 'svg.js';
import * as ProgressBar from 'progressbar.js';
import fs = require('fs');
import request = require('request');
import shortid = require('shortid');
import electron = require('electron');
import path = require('path');
import Promise = require('bluebird');
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
        if (t >= 1) {
            this.bar.animate(1);
            return
        }
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
        this.bar.animate(this.ticks);
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
        let received_bytes = 0;
        let total_bytes = 0;
        let write_stream = fs.createWriteStream(file_name);
        let audio = ytdl(url);
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
            } else {
                req.on('data', function (chunk) {
                    // Update the received bytes.
                    received_bytes += chunk.length;
                });
            }
        });

        // Error.
        audio.on('error', () => {
            reject(false);
        });

        // Finish.
        if (config.hasOwnProperty("onFinish")) {
            audio.on('finish', function () {
                resolve(true);
            });
        } else { // Finish.
            audio.on('finish', function () {
                resolve(true);
            })
        }

    })
};


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
        folders: { default_folder: BASEPATH },
        files: [],
        queue: []
    },

    mutations: {
        QUEUE_URLS(state, payload): void {
            console.log(payload);
            for (let i = 0; i < payload.data.length; i++) {
                state.queue.push(payload.data[i]);
            }
        },
        CLEAR_URL(state, payload): void {
            state.queue.splice(payload.index, 1);
        },
        CLEAR_ALL_URLS(state): void {
            state.queue.splice(0, state.queue.length);
        },
        ADD_FILE(state, payload): void {
            const file = {
                id: payload.id,
                locFile: payload.locFile,
                location: state.default_folder,
                error0: null
            }
            state.files.push(file);
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
        },
        CHANGE_DEFAULT_FOLDER(state, payload): void {
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

let Files = new Vue({
    el: '#Files',
    data: {
        urls: `https://www.youtube.com/watch?v=gXv57X7N510
https://www.youtube.com/watch?v=9bZkp7q19f0
https://www.youtube.com/watch?v=DzivgKuhNl4`,
        files: store.state.files,
        default_folder: store.state.folders.default_folder,
        queue: store.state.queue
    },
    methods: {
        queueUrls(): void {
            let batch_urls = this.urls.split('\n');
            let promises = [];
            let data = [];

            for (let i = 0; i < batch_urls.length; i++) {
                promises.push(audl.getInfo(batch_urls[i]));
            }
            let e = 0;
            Promise.map(promises, (info) => {
                let audio_file_meta = new audl.YTAudioFileMeta(info);
                let title = info.title.replace(/[^a-z]+/gi, '_').toLowerCase(); // music_title.
                let payload = {
                    title: title,
                    url: batch_urls[e]
                }
                console.log(payload);
                data.push(payload);
                // e++;
            }, { concurrency: 1 }).then(() => {
                store.commit('QUEUE_URLS', { data: data });
            }).error((err) => {
                console.log(err);
            });;

        },
        clearUrl(index): void {
            store.commit('CLEAR_URL', { index })
        },
        clearAllUrls(): void {
            store.commit('CLEAR_ALL_URLS');
        },
        addFile(index): void {
            const title = this.queue[index].title;
            const url = this.queue[index].url;
            const div = shortid.generate();
            const ext = '.m4a';
            const locFile = path.join(this.default_folder, (title + ext));
            // const remFile = "hhttp://download.thinkbroadband.com/5MB.zip"
            // const locFile = "/dia.zip"
            store.commit('ADD_FILE',
                {
                    id: div,
                    locFile: locFile,
                    default_folder: this.default_folder
                }
            );

            // Update Vue render.
            this.$nextTick(() => {
                let prog = new Progress('#' + div);

                let config = {
                    localFile: locFile,
                    onProgress: (received, total) => {
                        // let tick = (received / total).toFixed(2);
                        prog.tick();
                    },
                    onFinish: () => {
                        prog.finish();
                    }
                }
                YTDownloadAudioCustom(config, url, locFile).then(() => {

                }).catch((e) => {
                    const i = this.files.length - 1;
                    store.commit('EDIT_FILE', { index: i, e: e.message });
                });
            })
        },
        clearFile(index: number): void {
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

const Debug = new Vue({
    el: '#debug',
    data: {
        state: store.state,
    },
    template:
    `
    <div class="debug">
        <div>
            {{state.folders.default_folder}}
        </div>
        <br />
        <div v-for="(item,index) in state.queue">
        {{index}} {{item.title}} {{item.url}} 
        </div>
        <br />
        <div v-for="(file,index) in state.files">
        {{index}} {{file.file}} 
        </div>
    </div>
    `
})