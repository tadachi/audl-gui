const crypto = require('crypto');
// this usually takes a few seconds
export function work(limit = 100000) {
    let start = Date.now();
    let n = 0;
    while (n < limit) {
        console.log(crypto.randomBytes(2048));
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
            resolve(true);
        })
    })
};

