import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import axios from 'axios';
import logger from './logger';

const adObjectUuidFilePath = path.join(__dirname, '../metadata/ad_object_uuid.txt');
const deviceUuidFilePath = path.join(__dirname, '../metadata/device_uuid.txt');

export async function bilboardVerification(): Promise<boolean> {
    let deviceUuid = fs.readFileSync(deviceUuidFilePath, 'utf8').trim();
    let adObjectUuid = fs.readFileSync(adObjectUuidFilePath, 'utf8').trim();

    if (adObjectUuid !== '') {
        return true;
    }

    if (deviceUuid === '') {
        logger.info('No device uuid found, generating new one');
        deviceUuid = uuid();
        fs.writeFileSync(deviceUuidFilePath, deviceUuid);
        logger.info({
            message: "Sending device registration request",
            device_id: deviceUuid,
        });
        try {
            await axios.post(process.env.SERVER_URL + "/device/register", {
                device_id: deviceUuid,
                temperature: 0,
                cpu_load: 0,
                memory_usage: 0,
                browser_status: "ok"
            });

            logger.info({
                message: "Device registration request sent",
                device_id: deviceUuid,
            });

            return false;
        } catch (error) {
            logger.error({
                message: "Error sending device registration request",
                device_id: deviceUuid,
                error: error,
            });

            return false;
        }
    }

    const adUuid = await getAdObjectUuid(deviceUuid);
    if (adUuid) {
        fs.writeFileSync(adObjectUuidFilePath, adUuid);
    } else {
        return false;
    }

    return true;
}

async function getAdObjectUuid(deviceUuid: string): Promise<string | undefined> {
    try {
        logger.info({
            message: "Getting ad object uuid from server",
            device_id: deviceUuid,
        });
        const { data } = await axios.get(`${process.env.SERVER_URL}/device/get_link/${deviceUuid.trim()}`);
        const adObjectUuid = data.url?.split("uuid=")[1];
        logger.info({
            message: "Ad object uuid from server",
            device_id: deviceUuid,
            ad_object_uuid: adObjectUuid,
        });
        return adObjectUuid;
    } catch (e) {
        logger.warn({
            message: "Error getting ad object uuid from server during verification",
            device_id: deviceUuid,
            error: e,
        });
        return;
    }
}