// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

import audl = require("./audl");
import Vue = require('./node_modules/vue/dist/vue');
// import * as Vue from 'vue.js';
import * as SVG from 'svg.js';
import * as ProgressBar from 'progressbar.js';
import fs = require('fs');
import request = require('request');
import shortid = require('shortid');

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

class BigFile {
    remote_file: string; // eg. https://www.google.com/download/.jpg
    local_file: string; // eg. var/local/usr/file

    constructor(
        remote_file,
        local_file) {
    }
}

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

// let prog = new Progress('#container');

// let config = {
//     remoteFile: "http://download.thinkbroadband.com/5MB.zip",
//     localFile: "./dia.zip",
//     onProgress: (received, total) => {
//         let tick = (received / total).toFixed(2);
//         prog.tick();
//     },
//     onFinish: () => {
//         prog.finish();
//     }
// }

// let fileProgress = Vue.component('file', {
//     template: '#file-template',
//     props: [
//         'data'
//     ]

// });

// let row = Vue.component('row', {
//     template: '#row-template',
//     props: [
//         'data'
//     ]
// });

let Files = new Vue({
    el: '#Files',
    data: {
        items: []
    },
    methods: {
        addFile() {
            this.items.push({progress: 'blkeh', file: 't', location: 'l' });
            // this.count += 1;
            // this.items.push({ progress: 0, file: 't', location: 'l', action: 'a' })
            // console.log(this.data);
        },
        removeFile(index) {
            console.log(index);
            this.items.splice(index, 1);
            // this.count -= 1;
            // this.items.pop();
            // console.log(this.data);
        },
        removeAllFiles() {
            this.items = [];
        }
    }
});

// downloadFile(config);

// // Button
// var app5 = new Vue({
//     el: '#app-5',
//     data: {
//         message: 'Hello Vue.js!'
//     },
//     methods: {
//         reverseMessage: function () {
//             this.message = this.message.split('').reverse().join('')
//         }
//     }
// });

// console.log(vm.$data === data) // -> true
// vm.$el === document.getElementById('example') // -> true
// // $watch is an instance method
// vm.$watch('a', function (newVal, oldVal) {
//     // this callback will be called when `vm.a` changes
//     console.log('vm.a changed ' + vm.a)
// })
// data.a = 2;

let url: string = 'https://www.youtube.com/watch?v=dPbL4Y8KsSM';

audl.getInfo(url).then((info) => {
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
        })
    }

    for (let itag in formats) {
        let found = false;
        if (itag === '139') push(itag)
        if (itag === '140') push(itag)
        if (itag === '141') push(itag)
    }

    console.log()
    console.table(itag_info);
}).error((err) => {
    console.log(err);
});


