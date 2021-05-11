const path = require("path");
const fs = require("fs");
const uuid = require("uuid/v4");
const { execSync } = require("child_process");
const Upload = require("./../controllers/Upload");
const { db } = require("../config/config");
let _ = {};

_.takeDatabaseBackup = async () => {
	let dateOptions = { day: "numeric", month: "long", year: "numeric" };
	let dateString = new Intl.DateTimeFormat("en-IN", dateOptions).format(new Date());
	// "11 May 2021"

	let localFolder = path.resolve(__dirname, "..", "tmp", "db-backup");

	let remoteFolder = `backup/database/${dateString}/`;
	console.log(localFolder, remoteFolder);
	if (!fs.existsSync(localFolder)) {
		fs.mkdirSync(localFolder);
	}
	let localFiles = [];
	for (let collection of db.collectionsToBackup) {
		let outPath = path.join(localFolder, `${uuid()}.json`);
		let dumpCommand = `mongoexport --collection=${collection} --db=${db.database} --out="${outPath}" --username "${db.username}" --password "${db.password}"  --authenticationDatabase admin`;

		try {
			execSync(dumpCommand);
			localFiles.push({
				remoteFile: remoteFolder.concat(`${collection}.json`),
				localFile: outPath,
			});
		} catch (error) {
			console.log(error.message, error);
		}
	}

	for (let backup of localFiles) {
		Upload.toCloud(backup.localFile, backup.remoteFile, { ACL: "private" })
			.then(() => {
				console.log(`Database backed-up and uploaded on S3 file name "${backup.remoteFile}"`);
			})
			.catch((e) => {
				console.log("Unable to upload database backup on cloud", e);
			});
	}
};

module.exports = _;
