import ytdl = require('ytdl-core');
import Promise = require('bluebird');
import fs = require('fs');
import path = require('path');

// Return a promise to get youtube info such as itag, quality, bitrate.
export function getInfo(url): Promise<any> {
    return new Promise(function (resolve, reject) {
        ytdl.getInfo(url, function (err, info) {
            if (info) resolve(info)
            if (err) reject(err);
        })
    })
}

export function valid_youtube_match(url) {
    if (!url) {
        return false;
    }
    let youtube_valid_regexp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|\?v=)([^#\&\?]*).*/;
    let match = url.match(youtube_valid_regexp);
    if (match && match[2].length == 11) {
        return true;
    } else {
        return false;
    }
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
    url: string;
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
    url: string;

    constructor(data: any) {
        this.title = data.title;
        this.author = data.author;
        this.length_seconds = Number(data.length_seconds);
        this.description = data.description;
        this.view_count = Number(data.view_count);
        this.url = data.url;
        this.formats = {};
        for (let format of data.formats) {
            this.formats[format.itag] = format;
        }
    }
}