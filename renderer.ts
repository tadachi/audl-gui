// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

// Misc
import ytdl = require('ytdl-core');
import * as ProgressBar from 'progressbar.js';
import fs = require('fs');
import request = require('request');
import shortid = require('shortid');
import path = require('path');
import Promise = require('bluebird');
import bytes = require('bytes');

// Audl
import audl = require("./audl");

// Vue
import Vue = require('./node_modules/vue/dist/vue');
import Vuex = require('./node_modules/vuex/dist/vuex');
import { mapState } from 'vuex'
Vue.use(Vuex);

// Electron
import electron = require('electron');
const { dialog } = electron.remote;
const { app } = electron.remote;
const BASEPATH: string = app.getAppPath();

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

class Timer {
    intervals;

    constructor() {
        this.intervals = [];
    }

    addInterval(interval) {
        this.intervals.push(interval);
    }

    clearInterval(index) {
        clearInterval(this.intervals[index]);
    }

    clearAllIntervals() {
        for (let i = 0; i <= this.intervals.length; i++) {
            clearInterval(this.intervals[i]);
        }
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

        req.on('response', (data) => {
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
            req.on('data', (chunk) => {
                // Update the received bytes.
                received_bytes += chunk.length;
            });
        }
        if (config.hasOwnProperty("onFinish")) {
            req.on('end', () => {
                resolve();
            });
        } else { // Finish.
            req.on('end', () => {
                resolve();
            })
        }
    });
}

/** 
 * Returns just the file size in bytes.
 */
function headerFileSize(url: string): Promise<any> {
    let options: any = {
        method: 'HEAD',
        uri: url,
    }
    return new Promise((resolve, reject) => {
        let req: any = request(options);

        req.on('response', function (data) {
            const file_size = parseInt(data.headers['content-length']);
            resolve(file_size);
        })

        req.on('error', (e) => {
            reject(e);
        });

        req.on('end', () => {
            resolve(null);
        })
    });
}

function YTDownloadAudioCustom(config: any, url: string, file_name: string): void {
    return new Promise((resolve, reject) => {
        // Save variable to know progress
        let received_bytes: number = 0;
        let total_bytes: number = 0;
        let write_stream = fs.createWriteStream(file_name);
        let audio = ytdl(url, { quality: 140 }); // 140 is an itag for 128kb audio quality.
        audio.pipe(write_stream);
        audio.on('response', (req) => {
            // Change the total bytes value to get progress later.
            total_bytes = parseInt(req.headers['content-length']);
            // Get progress if callback exists
            if (config.hasOwnProperty("onProgress")) {
                req.on('data', (chunk) => {
                    // Update the received bytes.
                    received_bytes += chunk.length;
                    console.log(received_bytes + '/' + total_bytes);
                    if (received_bytes <= total_bytes) {
                        config.onProgress(received_bytes, total_bytes);
                    }
                });
            } else {
                req.on('data', (chunk) => {
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
            audio.on('finish', () => {
                resolve(true);
            });
        } else { // Finish.
            audio.on('finish', () => {
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

const store: any = new Vuex.Store({
    state: {
        folders: { default_folder: BASEPATH },
        files: new Array<AudlFileMeta>()
    },

    mutations: {
        ADD_URLS(state, payload): void {
            state.files.push(payload.data);
        },
        SET_FILE_ERROR(state, payload): void {
            const i = payload.index;
            state.files[i].error0 = payload.e;
        },
        SET_FILE_DOWNLOADED(state, payload): void {
            const i = payload.index;
            state.files[i].downloaded = true;
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

class AudlFileMeta {
    id: string;
    audioUrl: string;
    youtubeUrl: string;
    ext: string;
    title: string;
    locFile: string;
    size: string | number;
    encoding: string;
    bitrate: string;
    // Set later.
    downloaded: boolean = false;
    error0: string = "";

    constructor(
        id: string,
        audioUrl: string,
        youtubeUrl: string,
        ext: string,
        title: string,
        locFile: string,
        size: string | number,
        encoding: string,
        bitrate: string) {

        this.id = id;
        this.audioUrl = audioUrl;
        this.youtubeUrl = youtubeUrl;w
        this.ext = ext;
        this.title = title;
        this.locFile = locFile;
        this.size = size;
        this.encoding = encoding;
        this.bitrate = bitrate;
    }
}


audl.getInfo('https://www.youtube.com/watch?v=gXv57X7N510').then((info) => {
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
            url: formats[itag].url
        })
    }

    for (let itag in formats) {
        let found = false;
        if (itag === '139') push(itag)
        if (itag === '140') push(itag)
        if (itag === '141') push(itag)
    }
    headerFileSize(itag_info[0].url).then((info) => {
        console.log(bytes(info, { unit: 'MB' }));
    });
    console.table(itag_info);
})

let Files = new Vue({
    el: '#Files',
    data: {
        urls: `https://www.youtube.com/watch?v=gXv57X7N510
https://www.youtube.com/watch?v=9bZkp7q19f0
https://www.youtube.com/watch?v=DzivgKuhNl4`,
        files: store.state.files,
        default_folder: store.state.folders.default_folder,
    },
    store,
    methods: {
        addUrls(): void {
            let batch_urls = this.urls.split('\n');
            let promises_headers = [];
            let promises_meta = [];

            for (let i = 0; i < batch_urls.length; i++) {
                promises_meta.push(audl.getInfo(batch_urls[i]));
            }

            let e = 0;
            Promise.map(promises_meta, (info) => {
                const audio_file_meta = new audl.YTAudioFileMeta(info);
                const formats = audio_file_meta.formats;

                const div: string = shortid.generate();
                const audioUrl: string = formats['140'].url;
                const youtubeUrl: string = batch_urls[e];
                const ext: string = '.m4a';
                const title: string = info.title.replace(/[^a-z]+/gi, '_').toLowerCase(); // music_title.
                const locFile = path.join(this.default_folder, (title + ext)); // C://User/Desktop/music_title.m4a
                const encoding: string = formats['140'].audioEncoding.toString();
                const bitrate: string = formats['140'].audioBitrate.toString();

                headerFileSize(audioUrl).then((size) => {
                    const data = new AudlFileMeta(
                        div, audioUrl, youtubeUrl, ext, title, locFile, size, encoding, bitrate
                    )
                    console.log(data);
                    store.commit('ADD_URLS', { data });
                    e++;
                })
            }, { concurrency: 1 }).error((err) => {
                console.log(err);
            });;
        },
        startDownload(index): void {
            const file: AudlFileMeta = this.files[index];

            let prog = new Progress('#' + file.id);
            let config = {
                localFile: file.locFile,
                onProgress: (received, total) => {
                    // let tick = (received / total).toFixed(2);
                    prog.tick();
                },
                onFinish: () => {
                    prog.finish();
                }
            }

            YTDownloadAudioCustom(config, file.url, file.locFile).then(() => {
                store.commit('SET_FILE_DOWNLOADED', { index: index });
            }).catch((e) => {
                store.commit('SET_FILE_ERROR', { index: index, e: e.message });
            });
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
        <div v-for="(file,index) in state.files">
        {{index}} {{file.id}}<br />
        {{file.title}}<br />
        {{file.youtubeUrl}}<br />
        {{file.locFile}}<br />
        {{file.size}}<br />
        {{file.encoding}}<br />
        {{file.bitrate}}<br />
        ___________
        </div>
    </div>
    `
})