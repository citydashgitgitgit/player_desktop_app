import fs from 'fs';
import path from 'path';
import axios from 'axios';
import logger from './logger';
import { ipcMain } from 'electron';
import AWS from 'aws-sdk';

const adObjectFilePath = path.join(__dirname, '../metadata/ad_object.json');

const deviceUuidFilePath = path.join(__dirname, '../metadata/device_uuid.txt');
const deviceUuid = fs.readFileSync(deviceUuidFilePath, 'utf8').trim();

const adObjectUuidFilePath = path.join(__dirname, '../metadata/ad_object_uuid.txt');
const adObjectUuid = fs.readFileSync(adObjectUuidFilePath, 'utf8').trim();

const getAdObject = async () => {
    logger.info({
        message: 'Getting ad object',
        deviceUuid: deviceUuid,
    });
    try {
        const { data } = await axios.post(
            process.env.SERVER_URL + "/get-drum-playlist-by-ad-object-uuid/" + adObjectUuid,
            { timestamp: new Date().getTime() },
            {
                headers: {
                    "Content-Type": "application/json",
                    "Range": "bytes=0-500000"
                }
            }
        );
        logger.info({
            message: 'Ad object received',
            deviceUuid: deviceUuid,
            adObjectUuid: adObjectUuid,
            adObject: data,
        });
        fs.writeFileSync(adObjectFilePath, JSON.stringify(data.adObject));
        return data;
    } catch (error) {
        logger.error({
            message: 'Error getting ad object',
            deviceUuid: deviceUuid,
            adObjectUuid: adObjectUuid,
            error: error,
        });

        return null;
    }
}

async function checkCurrentPlaylist({ playlist }: { playlist: any }) {
    const adObject = JSON.parse(fs.readFileSync(adObjectFilePath, 'utf8'));

    logger.info({
        message: 'Checking current playlist',
        playlist: playlist,
        deviceUuid: deviceUuid,
        adObjectUuid: adObjectUuid,
        adObject: adObject,
    });

    const playlistContentFiles = [];
    for (const item of playlist) {
        const fileUrl = item.url;
        const contentUserUuid = item.userUuid;
        playlistContentFiles.push({
            userUuid: contentUserUuid,
            fileName: fileUrl.split(contentUserUuid)[1],
        });
    }

    await downloadNecessaryFiles(playlistContentFiles);

    logger.info({
        message: 'Playlist content files download finished',
        playlist: playlist,
        deviceUuid: deviceUuid,
        adObjectUuid: adObjectUuid,
        adObject: adObject,
    });

    return playlistContentFiles.map(file => path.join(__dirname, `../videos/${file.userUuid}${file.fileName}`));
}

async function downloadNecessaryFiles(necessaryFileNames: any) {
    const asyncDownloads: any[] = [];
    const adObject = JSON.parse(fs.readFileSync(adObjectFilePath, 'utf8'));

    necessaryFileNames.forEach((file: any) => {
        const filePath = path.join(__dirname, `../videos/${file.userUuid}${file.fileName}`);

        if (!fs.existsSync(filePath)) {
            logger.info({
                message: 'Downloading file',
                filePath: filePath,
                deviceUuid: deviceUuid,
                adObjectUuid: adObjectUuid,
                adObject: adObject,
            });
            fs.stat(filePath, (err, stats) => {
                if (err?.code === "ENOENT") {
                    asyncDownloads.push(downloadContent(`${file.userUuid}${file.fileName}`).catch(err => {
                        console.log(err)
                        logger.error({
                            message: 'Error downloading file',
                            fileName: file.fileName,
                            deviceUuid: deviceUuid,
                            adObjectUuid: adObjectUuid,
                            adObject: adObject,
                            error: err.message
                        });
                    }));
                }
            })
        } else {
            logger.info({
                message: 'File already exists, skipping download',
                filePath: filePath,
                deviceUuid: deviceUuid,
                adObjectUuid: adObjectUuid,
                adObject: adObject,
                necessaryFileNames: necessaryFileNames,
            });
        }
    })

    return await Promise.all(asyncDownloads);
}

async function downloadContent(fileName: any) {
    try {
        const spacesEndpoint = process.env.SPACE_ENDPOINT;
        const s3 = new AWS.S3({
            endpoint: spacesEndpoint,
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        });

        const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: "dev/" + fileName,
        };

        const savePath = path.resolve(__dirname, '../videos', fileName);
        const folderForFile = savePath.split('/').slice(0, -1).join('/');
        if (!fs.existsSync(folderForFile)) {
            fs.mkdirSync(folderForFile, { recursive: true });
        }

        return new Promise((resolve, reject) => {
            const fileStream = fs.createWriteStream(savePath);

            s3.getObject(params as any)
                .createReadStream()
                .pipe(fileStream)
                .on('error', (err: any) => {
                    reject(new Error(`Error downloading file: ${err.message}`));
                })
                .on('close', () => {
                    resolve(true);
                })
        })
    } catch (error) {
        // @ts-ignore
        throw Error(error);
    }
}

const initClientMethods = () => {
    ipcMain.handle('get-ad-object', async () => {
        return getAdObject();
    });
    ipcMain.handle('check-current-playlist', async (event, playlist: any) => {
        return checkCurrentPlaylist(playlist);
    });
}

export default initClientMethods;