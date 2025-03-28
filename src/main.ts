import dotenv from 'dotenv';
dotenv.config();

import { app, BrowserWindow, protocol, net } from 'electron';
import path from 'path';
import fs from 'fs';

import { bilboardVerification } from './verification';
import initClientMethods from './client-methods';

const adObjectUuidFilePath = path.join(__dirname, '../metadata/ad_object_uuid.txt');
const adObjectFilePath = path.join(__dirname, '../metadata/ad_object.json');
const deviceUuidFilePath = path.join(__dirname, '../metadata/device_uuid.txt');

function createWindow(): void {
    const mainWindow = new BrowserWindow({
        width: 1920,
        height: 1080,
        frame: false,
        // fullscreen: true,
        alwaysOnTop: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: true,
            // Don't change .js to .ts because it will break builded version
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.maximize();

    mainWindow.loadFile(path.join(__dirname, '../public/index.html'));
}

app.whenReady().then(async () => {
    initAllFiles();
    const isVerified = await bilboardVerification();

    if (!isVerified) {
        createVerificationWindow();
    } else {
        initClientMethods();

        createWindow();
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

function createVerificationWindow(): void {
    const verificationWindow = new BrowserWindow({
        width: 1920,
        height: 1080,
        frame: false,
        fullscreen: true,
        alwaysOnTop: true,
        webPreferences: {
            webSecurity: false,
            nodeIntegration: true,
            contextIsolation: true
        }
    });

    verificationWindow.maximize();
    verificationWindow.loadFile(path.join(__dirname, '../public/verification.html'));
}


function initAllFiles(): void {
    if (!fs.existsSync(path.join(__dirname, '../videos'))) {
        fs.mkdirSync(path.join(__dirname, '../videos'));
    }

    if (!fs.existsSync(path.join(__dirname, '../metadata'))) {
        fs.mkdirSync(path.join(__dirname, '../metadata'));
    }

    if (!fs.existsSync(adObjectFilePath)) {
        fs.writeFileSync(adObjectFilePath, JSON.stringify({}));
    }

    if (!fs.existsSync(adObjectUuidFilePath)) {
        fs.writeFileSync(adObjectUuidFilePath, '');
    }

    if (!fs.existsSync(deviceUuidFilePath)) {
        fs.writeFileSync(deviceUuidFilePath, '');
    }
}