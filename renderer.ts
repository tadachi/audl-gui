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
import { getInfo, YTAudioFileMeta } from "./audl";


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
            color: '#67D5FF',
            trailColor: '#eee',
            trailWidth: 1,
            svgStyle: { width: '100%', height: '100%' },
            from: { color: '#67D5FF' }, // lightblue
            to: { color: '#36EA0D' } // lightgreen
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

function YTDownloadAudioCustom(, url: string, file_name: string, config: any = {}): Promise<any> {
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

// let Versions = new Vue({
//     el: '#Versions',
//     data: {
//         node_version: process.versions.node,
//         chrome_version: process.versions.chrome,
//         electron_version: process.versions.electron,
//         vue_version: Vue.version
//     }
// });

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
    received: number = 0;
    thumbnail_url: string;
    prog: Progress = null;

    constructor(
        id: string,

        audioUrl: string,
        youtubeUrl: string,
        ext: string,
        title: string,
        locFile: string,
        size: string | number,
        encoding: string,
        bitrate: string,
        thumbnail_url: string,
        prog: Progress = null) {

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

    setProgress(prog: Progress) {
        this.prog = prog;
    }
}

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
        UPDATE(state, payload): void {
            const i = payload.index;
            if (payload.received) {
                console.log(payload.received);
                state.files[i].received = payload.received;
            }
            if (payload.prog) {
                state.files[i].prog = payload.prog;
            }
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

let Files = new Vue({
    el: '#Files',
    data: {
        urls: `https://www.youtube.com/watch?v=gXv57X7N510
https://www.youtube.com/watch?v=9bZkp7q19f0
https://www.youtube.com/watch?v=DzivgKuhNl4`,
        files: store.state.files,
        default_folder: store.state.folders.default_folder,
    },
    methods: {
        addUrls(): void {
            let batch_urls = this.urls.split('\n');
            let promises_headers = [];
            let promises_meta = [];

            for (let i = 0; i < batch_urls.length; i++) {
                promises_meta.push(getInfo(batch_urls[i]));
            }

            let e = 0;
            Promise.map(promises_meta, (info) => {
                const audio_file_meta = new YTAudioFileMeta(info);
                const formats = audio_file_meta.formats;

                const div: string = shortid.generate();
                const audioUrl: string = formats['140'].url;
                const youtubeUrl: string = batch_urls[e];
                const ext: string = '.m4a';
                const title: string = info.title.replace(/[^a-z]+/gi, '_').toLowerCase(); // music_title.
                const locFile = path.join(this.default_folder, (title + ext)); // C://User/Desktop/music_title.m4a
                const encoding: string = formats['140'].audioEncoding.toString();
                const bitrate: string = formats['140'].audioBitrate.toString();
                const thumbnail_url: string = info.thumbnail_url;

                headerFileSize(audioUrl).then((size) => {
                    const data = new AudlFileMeta(
                        div, audioUrl, youtubeUrl, ext, title, locFile, size, encoding, bitrate, thumbnail_url
                    )
                    store.commit('ADD_URLS', { data });

                }).then(() => {
                    // Add progress bar after DOM is updated with nextTick();
                    Vue.nextTick(() => {
                        let prog = new Progress('#' + div);
                        store.commit('UPDATE', { index: e, prog: prog })
                        prog.finish();
                        e++;
                    })
                })
            }, { concurrency: 1 }).error((err) => {
                console.log(err);
            });;
        },
        startDownload(index): void {
            const file: AudlFileMeta = this.files[index];


            file.prog.finish();
            store.commit('SET_FILE_DOWNLOADED', { index });
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

Files.addUrls();

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
        {{file.encoding}}<br />
        {{file.bitrate}}<br />
        {{file.thumbnail_url}}<br />
        {{file.downloaded}}<br />
        {{file.received}} / {{file.size}}<br />
        ___________
        </div>
    </div>
    `
})