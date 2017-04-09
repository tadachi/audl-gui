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
import { getInfo, YTAudioFileMeta, valid_youtube_match } from "./audl";


// Vue
import Vue = require('./node_modules/vue/dist/vue');
import Vuex = require('./node_modules/vuex/dist/vuex');
import { mapState } from 'vuex'
Vue.use(Vuex);

// Electron
import electron = require('electron');
const { dialog } = electron.remote;
const { app } = electron.remote;
const { shell } = electron.remote;
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
            strokeWidth: 2,
            easing: 'easeInOut',
            color: '#67D5FF', //lightblue
            trailColor: '#eee',
            trailWidth: 0,
            svgStyle: { width: '100%', height: '100%' },
            from: { color: '#67D5FF' }, // lightblue
            to: { color: '#36EA0D' }, // lightgreen
            warnings: true,
        }
        this.bar = new ProgressBar.Line(this._div, this.config);
    }
    tick(t?: number): void {
        if (t >= 1) {
            this.bar.animate(1.00);
            return
        }
        if (t) {
            this.bar.animate(t);
            return;
        }
        if (this.ticks <= 1.0) {
            this.ticks += 0.01;
            this.bar.animate(this.ticks);  // Number from 0.0 to 1.0
        }
        return;
    }

    finish(): void {
        this.ticks = 1.00;
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

function YTDownloadAudioCustom(url: string, file_name: string, config: any = {}): Promise<any> {
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
            config.onFinish();
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
    received: number | string = 0;
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
        files: new Array<AudlFileMeta>(),
        urls: ["https://www.youtube.com/watch?v=9bZkp7q19f0", "https://www.youtube.com/watch?v=DzivgKuhNl4", null, null, null]
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
                state.files[i].received = payload.received;
            }
            if (payload.prog) {
                state.files[i].prog = payload.prog;
            }
        },
        ADD_URL(state, payload): void {
            state.urls.push(payload.value);
        },
        SET_URLS(state, payload): void {
            state.urls = payload.urls;
        },
        UPDATE_URL(state, payload): void {
            const i = payload.index;
            state.urls[i] = payload.value;
        },
        REMOVE_URL(state, payload): void {
            state.urls.splice(payload.index, 1);
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
        urls: store.state.urls,
        files: store.state.files,
        default_folder: store.state.folders.default_folder,
        batch: "", // This will be set with computed in the created() lifecycle hook.
        batch_error: null
    },
    created() {
        this.batch = this.formatted_urls;
    },
    computed: { // computed does not like () => {}, use function() {} 
        formatted_urls: function () {
            let batch_text: string = ""
            for (let string of store.state.urls) {
                if (string)
                    batch_text = batch_text + string + '\n'
            }
            return batch_text;
        }
    },

    methods: {
        addInput(): void {
            store.commit('ADD_URL', { value: "" });
            this.urls = store.state.urls;
        },
        removeInput(index): void {
            store.commit('REMOVE_URL', { index: index });
            this.urls = store.state.urls;

        },
        updateUrl(index, value) {
            store.commit('UPDATE_URL', { index: index, value: value });
            this.urls = store.state.urls;
            this.syncInputToBatch();
        },
        updateBatch(value) {
            let clean_urls = value.toString().split(/[,\n\r]+/).filter(v => v != ""); // Split on , \n \r, and filter out empty strings
            // Make sure there is at least one input. Always have one element.
            if (clean_urls.length <= 0) {
                clean_urls = [""];
            }
            store.commit('SET_URLS', { urls: clean_urls });
            this.urls = store.state.urls;
        },
        syncInputToBatch() {
            let batch_text: string = ""
            for (let string of this.urls) {
                if (string)
                    batch_text = batch_text + string + '\n'
            }
            this.batch = batch_text;
        },
        addUrls(): void {
            let promises_headers = [];
            let promises_meta = [];
            
            for (let i = 0; i < this.urls.length; i++) {
                // Check if valid youtube url.
                if (this.urls[i] != null && this.urls[i] != "")
                    promises_meta.push(getInfo(this.urls[i]));
            }

            Promise.map(promises_meta, (info) => {

                const audio_file_meta = new YTAudioFileMeta(info);
                const formats = audio_file_meta.formats;
                const div: string = shortid.generate();
                const audioUrl: string = formats['140'].url;
                const youtubeUrl: string = info.video_url;
                const ext: string = '.m4a';
                const title: string = info.title.replace(/[^a-z]+/gi, '_').toLowerCase(); // music_title.
                const locFile = path.join(this.default_folder, (title + ext)); // C://User/Desktop/music_title.m4a
                const encoding: string = formats['140'].audioEncoding.toString();
                const bitrate: string = formats['140'].audioBitrate.toString();
                const thumbnail_url: string = info.thumbnail_url;

                headerFileSize(audioUrl).then((size) => {
                    size = bytes(size, 'MB');
                    const data = new AudlFileMeta(
                        div, audioUrl, youtubeUrl, ext, title, locFile, size, encoding, bitrate, thumbnail_url
                    )
                    store.commit('ADD_URLS', { data });

                }).then(() => {
                    // Add progress bar after DOM is updated with nextTick();
                    Vue.nextTick(() => {
                        // let prog = new Progress('#' + div);
                        // store.commit('UPDATE', { index: (this.files.length-1), prog: prog })
                        // this.e++;
                    })
                });

            }, { concurrency: 1 }).error((err) => {
                console.log(err);
            });
        },
        startDownload(index): void {
            store.commit('SET_FILE_DOWNLOADED', { index: index });
            const file: AudlFileMeta = this.files[index];

            let config = {
                localFile: file.locFile,
                onProgress: (received, total) => {
                    Vue.nextTick(() => {
                        store.commit('UPDATE', { index: index, received: bytes(received, 'MB') });
                        // this.files[index].prog.tick();
                    });
                },
                onFinish: () => {
                    Vue.nextTick(() => {
                        // this.files[index].prog.finish();
                    });
                }
            }

            YTDownloadAudioCustom(file.youtubeUrl, file.locFile, config).catch((e) => {
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
        },
        showInFolder(index): void {
            const item = shell.showItemInFolder(this.files[index].locFile);
        }
    }
});

// Files.addUrls();

const Debug = new Vue({
    el: '#debug',
    data: {
        state: store.state,
        node_version: process.versions.node,
        chrome_version: process.versions.chrome,
        electron_version: process.versions.electron,
        vue_version: Vue.version
    },
    template:
    `
<div class="debug">
    <div>
        <pre>
{{state.folders.default_folder}}
Node: {{node_version}}
Chrome: {{chrome_version}}
Vue: {{vue_version}}
        </pre>
    </div>
    <div v-for="(url, index) in state.urls">
{{index}} {{url}}  
    </div>
    <div v-for="(file,index) in state.files">
        <pre>
{{index}} 
#{{file.id}}
{{file.title}}
{{file.youtubeUrl}}
{{file.locFile}}
{{file.encoding}}
{{file.bitrate}}
{{file.thumbnail_url}}
{{file.downloaded}}
{{file.received}} / {{file.size}}
{{file.error0}} 
        </pre>
    </div>
</div>
    `
})