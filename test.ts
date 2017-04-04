const crypto = require('crypto');
function work(limit = 100000) {
    let start = Date.now();
    let n = 0;
    while (n < limit) {
        // console.log(crypto.randomBytes(2048));
        n++;
    }
    return {
        timeElapsed: Date.now() - start,
    };
}

import ytdl = require('ytdl-core');
import fs = require('fs');

export function YTDownloadAudioShared(config: any = null, url: string, file_name: string): Promise<any> {

    return new Promise((resolve, reject) => {
        let start = Date.now();
        // Save variable to know progress
        let received_bytes: number = 0;
        let total_bytes: number = 0;
        let write_stream = fs.createWriteStream(file_name);
        let audio = ytdl(url, { quality: 140 }); // 140 is an itag for 128kb audio quality.
        audio.pipe(write_stream);
        audio.on('response', (req) => {
            // Change the total bytes value to get progress later.
            // total_bytes = parseInt(req.headers['content-length']);
            // // Get progress if callback exists
            // if (config) {
            //     req.on('data', (chunk) => {
            //         // Update the received bytes.
            //         received_bytes += chunk.length;
            //         console.log(received_bytes + '/' + total_bytes);
            //         if (received_bytes <= total_bytes) {
            //             config.onProgress(received_bytes, total_bytes);
            //         }
            //     });
            // } else {
            req.on('data', (chunk) => {
                // Update the received bytes.
                received_bytes += chunk.length;
                // console.log(received_bytes);
            });
            // }
        });

        // Error.
        audio.on('error', () => {
            reject(false);
        });

        // Done
        audio.on('finish', () => {
            console.log(Date.now() - start);
            resolve(true);
        })
    })
};

function YTdownloadAsAudio(url) {
    return new Promise(function (resolve, reject) {
        ytdl.getInfo(url, function (err, info) {
            let start = Date.now();
            let audio_file_meta = new YTAudioFileMeta(info);
            let file_type = '.m4a';
            // Remove unneeded characters and replace with underscores for readability and make it file friendly.
            let file_name = audio_file_meta.title.replace(/[^a-z]+/gi, '_').toLowerCase() + file_type; // music_title.m4a
            let write_stream = fs.createWriteStream(file_name);
            let audio = ytdl(url, { quality: 140 })
            audio.pipe(write_stream);
            audio.on('response', function (res) {
                let dataRead = 0;
                let totalSize = parseInt(res.headers['content-length']);
                let options = {
                    complete: '\u001b[42m \u001b[0m', // Green.
                    incomplete: '\u001b[41m \u001b[0m', // Red.
                    width: 20,
                    total: totalSize
                }
                //Example download youtube audio and save as .m4a with a progressbar.
                // let bar = new ProgressBar(` downloading [:bar] :percent :etas :current/:total - ${file_name}`, options);

                res.on('data', function (data) {
                    let chunk = data.length;
                    // bar.tick(chunk)
                })
            });
            audio.on('finish', () => {
                console.log(Date.now() - start);
                resolve(true);
            });
            audio.on('error', () => {
                reject(false);
            });

        })
    });

}
let url = 'https://www.youtube.com/watch?v=gXv57X7N510';
ytdl.getInfo(url, function (err, info) {
    let start = Date.now();
    let audio_file_meta = new YTAudioFileMeta(info);
    let file_type = '.m4a';
    // Remove unneeded characters and replace with underscores for readability and make it file friendly.
    let file_name = audio_file_meta.title.replace(/[^a-z]+/gi, '_').toLowerCase() + file_type; // music_title.m4a
    console.log(file_name);
    console.log(Date.now() - start);
    let write_stream = fs.createWriteStream(file_name);
    let audio = ytdl(url, { quality: 140 })
    audio.pipe(write_stream);
    audio.on('response', function (res) {
        let dataRead = 0;
        let totalSize = parseInt(res.headers['content-length']);
        let options = {
            complete: '\u001b[42m \u001b[0m', // Green.
            incomplete: '\u001b[41m \u001b[0m', // Red.
            width: 20,
            total: totalSize
        }
        //Example download youtube audio and save as .m4a with a progressbar.
        // let bar = new ProgressBar(` downloading [:bar] :percent :etas :current/:total - ${file_name}`, options);

        res.on('data', function (data) {
            let chunk = data.length;
            // bar.tick(chunk)
        })
    });
    audio.on('finish', () => {
        console.log(Date.now() - start);
    });
    audio.on('error', () => {
    });

})

// YTDownloadAudioShared(null, 'https://www.youtube.com/watch?v=gXv57X7N510', 'testie').then((result) => {
//     console.log(result);
// });

// YTdownloadAsAudio('https://www.youtube.com/watch?v=gXv57X7N510')

interface AudioFileMetaInterface {
    title: string;
    author: string;
    length_seconds: number;
    description: string;
    view_count: number;
    formats: any;
}

class YTAudioFileMeta implements AudioFileMetaInterface {
    title: string;
    author: string;
    length_seconds: number;
    description: string;
    view_count: number;
    formats: any;

    constructor(data: any) {
        this.title = data.title;
        this.author = data.author;
        this.length_seconds = Number(data.length_seconds);
        this.description = data.description;
        this.view_count = Number(data.view_count);
        this.formats = {};
        for (let format of data.formats) {
            this.formats[format.itag] = format;
        }
    }
}
