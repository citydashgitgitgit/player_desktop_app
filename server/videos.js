const fs = require("fs");
const path = require("path");
const { app } = require("electron");
const appRoot = require('app-root-path');
const axios = require("axios");
const AWS = require("aws-sdk");
require('dotenv').config();

const adObjectIdFilePath = `${appRoot.path}/board_meta/adObjectUuid.txt`;
const playerContentFolder = process.env.PLAYER_CONTENT_FOLDER || "./player_content";

if (!fs.existsSync(playerContentFolder)) {
	fs.mkdirSync(playerContentFolder, { recursive: true });
}

async function downloadContent(fileName) {
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

		const savePath = path.resolve(playerContentFolder, fileName);
		const folderForFile = savePath.split('/').slice(0, -1).join('/');
		if (!fs.existsSync(folderForFile)) {
			fs.mkdirSync(folderForFile);
		}

		return new Promise((resolve, reject) => {
			const fileStream = fs.createWriteStream(savePath);

			//@ts-ignore
			s3.getObject(params)
				.createReadStream()
				.pipe(fileStream)
				.on('error', (err) => {
					reject(new Error(`Error downloading file: ${err.message}`));
				})
				.on('close', () => {
					resolve(true);
				})
		})
	} catch (error) {
		// @ts-ignore
		throw Error(error.message);
	}
}

function removeUnnecessaryFiles() {
	const pathToCheck = process.env.PLAYER_CONTENT_FOLDER;
	const itemsInFolder = fs.readdirSync(pathToCheck);
	const fileNames = [];

	for (const item of itemsInFolder) {
		if (fs.lstatSync(`${pathToCheck}/${item}`).isFile()) {
			fileNames.push(`${pathToCheck}/${item}`);
		} else if (fs.lstatSync(`${pathToCheck}/${item}`).isDirectory()) {
			for (const file of fs.readdirSync(`${pathToCheck}/${item}`)) {
				fileNames.push(`${pathToCheck}/${item}/${file}`);
			}
		}
	}

	const necessaryFileNames = JSON.parse(fs.readFileSync("./board_meta/playlist.json").toString() || "[]");

	for (const fileName of fileNames) {
		if (!necessaryFileNames.some((necessaryFileName) => necessaryFileName.includes(fileName.replace(".", "")))) {
			fs.unlink(fileName, (err) => {
				if (err) {
					// log
				}
			});
		}
	}
}

async function downloadNecessaryFiles(necessaryFileNames) {
	const asyncDownloads = [];

	necessaryFileNames.forEach(file => {
		const filePath = `${playerContentFolder}/${file.userUuid}${file.fileName}`;
		console.log("----------");
		console.log("checking", filePath);
		if (!fs.existsSync(filePath)) {
			console.log("downloading file");
			fs.stat(`${playerContentFolder}/${file.userUuid}${file.fileName}`, (err, stats) => {
				if (err?.code === "ENOENT") {
					asyncDownloads.push(downloadContent(`${file.userUuid}${file.fileName}`));
				}
			})
		} else {
			console.log("file already exists, wont download");
		}
		console.log("----------");
	})

	return await Promise.all(asyncDownloads);
}

async function checkCurrentPlaylist({ playlist }) {
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

	let baseFolder = process.env.PLAYER_CONTENT_FOLDER;
	//@ts-ignore
	baseFolder = baseFolder.replace(".", "");

	return playlistContentFiles.map(file => `${appRoot.path}${baseFolder}/${file.userUuid}${file.fileName}`);
}

const updatePlaylist = async () => {
	console.log('updatin playlist');
	let playlist;
	let adObject;
	try {
		const adObjectUuid = fs.readFileSync(adObjectIdFilePath, "utf8");
		const response = await axios.post(
			process.env.SERVER_URL + "/get-drum-playlist-by-ad-object-uuid/" + adObjectUuid,
			{ timestamp: new Date().getTime() },
			{
				headers: {
					"Content-Type": "application/json",
					"Range": "bytes=0-500000"
				}
			}
		);

		console.log("received data from citydash server. Sending to player.");
		playlist = await checkCurrentPlaylist(response.data);
		adObject = response.data.adObject;

		fs.writeFileSync(`${appRoot.path}/board_meta/adObject.json`, JSON.stringify(response.data.adObject));
		fs.writeFileSync(`${appRoot.path}/board_meta/playlist.json`, JSON.stringify(playlist));
		return ({ adObject, playlist });
	} catch (error) {
		console.log("couldn't receive data from citydash server. Trying to read from local files");
		console.log("error", error);
		playlist = JSON.parse(fs.readFileSync(`${appRoot.path}/board_meta/playlist.json`, "utf8") || "[]");
		adObject = JSON.parse(fs.readFileSync(`${appRoot.path}/board_meta/adObject.json`, "utf8") || "{}");

		return ({ adObject, playlist });
	}
}

const getPlaylist = async () => {
	const { playlist } = await updatePlaylist();
	return playlist;
}

const getLocalAdObject = () => {
	const playlist = JSON.parse(fs.readFileSync(`${appRoot.path}/board_meta/adObject.json`, "utf8") || "{}");
	return playlist;
}

updatePlaylist();

// setTimeout(() => {
//     updatePlaylist();
// }, 1000 * 10);

module.exports = {
	getPlaylist,
	getLocalAdObject,
};