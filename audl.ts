import ytdl = require('ytdl-core');
import Promise = require('bluebird');
import fs = require('fs');

// Return a promise to get youtube info such as itag, quality, bitrate.
export function getInfo(url): Promise<any> {
    return new Promise(function (resolve, reject) {
        ytdl.getInfo(url, function (err, info) {
            if (info) resolve(info)
            if (err) reject(err);
        })
    })
}

// Return a promise to download youtube audio content.
export function YTdownloadAsAudio(url): Promise<any> {
    return new Promise(function (resolve, reject) {
        ytdl.getInfo(url, function (err, info) {
            let audio_file_meta = new YTAudioFileMeta(info);
            let file_type = '.m4a';
            // Remove unneeded characters and replace with underscores for readability and make it file friendly.
            let file_name = audio_file_meta.title.replace(/[^a-z]+/gi, '_').toLowerCase() + file_type; // music_title.m4a
            let write_stream = fs.createWriteStream(file_name);
            let audio = ytdl(url, { quality: 140 })
            audio.pipe(write_stream);
            audio.on('response', function (res) {
                // Show progress while it's downloading.
            });
            audio.on('finish', () => {
                resolve(true);
            });
            audio.on('error', () => {
                reject(false);
            });

        })
    });

}

interface AudioFileFormatsInterface {
    itag: number;
    container: string;
    audioEncoding: string;
    audioBitrate: string;
    url: string;
}

interface AudioFileMetaInterface {
    title: string;
    author: string;
    length_seconds: number;
    description: string;
    view_count: number;
    formats: any;
}

export class YTAudioFileFormat implements AudioFileFormatsInterface {
    itag: number;
    container: string;
    audioEncoding: string;
    audioBitrate: string;
    url: string;

    constructor(data: any) {
        this.itag = Number(data.itag);
        this.container = data.container;
        this.audioEncoding = data.audioEncoding;
        this.audioBitrate = data.audioBitrate;
        this.url = data.url;
    }
}

export class YTAudioFileMeta implements AudioFileMetaInterface {
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