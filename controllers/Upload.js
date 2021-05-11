const config = require("../config/config");
const path = require("path");
const uuid = require("uuid/v4");
const fs = require("fs");
const AWS = require("aws-sdk");
const md5File = require("md5-file");

AWS.config = new AWS.Config(config.aws.configuration);

const s3Params = {
	Bucket: config.aws.bucket,
};
const spacesEndpoint = new AWS.Endpoint("s3.amazonaws.com");
const s3Options = {
	region: config.aws.configuration.region,
	endpoint: spacesEndpoint,
};
let bucketBase = config.url.s3Endpoint;
let client = new AWS.S3(s3Options);

const UploadController = {};

/**
 * toCloud - Will Upload local file to cloud space
 * @param localFile - local path of the file to be uploaded
 * @param remotePath - server path(including file name and extension) where file will be uploaded
 * @returns Promise - that resolves by providing a public url of uploaded asset.
 */
UploadController.toCloud = (localFile, remotePath, options = { returnFullPath: false, ACL: "public-read", filename: null }) => {
	return new Promise((resolve, reject) => {
		let p = Object.assign({}, s3Params);
		p.Key = remotePath;
		p.ACL = options.ACL;
		if (options.filename) {
			p.ContentDisposition = `attachment;filename=${options.filename}`;
		}
		let uploader = new AWS.S3.ManagedUpload({
			params: {
				Body: fs.readFileSync(localFile),
				...p,
			},
		}).promise();

		uploader.then(
			function (data) {
				/* Async usage */
				let hash = md5File.sync(localFile);
				fs.unlinkSync(localFile);
				let url = data.Key;
				if (options.returnFullPath) {
					url = bucketBase.concat(url);
				}
				resolve({ url, data, hash });
			},
			function (err) {
				reject(err.toString());
			}
		);
	});
};

UploadController.listObjects = (Prefix = "") => {
	return new Promise((resolve, reject) => {
		let params = {
			...s3Params,
			Delimiter: "/",
			Prefix,
		};

		client.listObjects(params, function (err, data) {
			if (err) reject(err);
			resolve(data);
		});
	});
};

UploadController.deleteObject = (remotePaths = []) => {
	return new Promise((resolve, reject) => {
		let deleteParams = Object.assign({}, s3Params);

		deleteParams.Delete = { Objects: [] };
		for (let path of remotePaths) {
			deleteParams.Delete.Objects.push({ Key: path });
		}

		client.deleteObjects(deleteParams, async (err, data) => {
			if (err) {
				reject("error while deleting objects from cloud" + err);
				console.error("error while deleting objects from cloud" + err);
				return;
			}
			resolve(1);
		});
	});
};
UploadController.adminUploads = async (req, res) => {
	let user = req.vsuser;
	if (!req.files) {
		res.status(400).json({ message: "No file selected." });
		return;
	}
	let results = {};
	let baseDir = req.body.directory || `usercontent/${user.id}/`;
	if (baseDir.startsWith("/")) {
		baseDir = baseDir.replace("/", "");
	}
	if (!baseDir.endsWith("/")) {
		baseDir = baseDir.concat("/");
	}
	for (let file in req.files) {
		if (file.trim() === "") continue;

		let key = file;
		file = req.files[file];

		if (file.name.trim() === "" || file.size === 0) {
			results[key] = {
				uploaded: !true,
				error: "No file selected.",
				url: null,
			};
			continue;
		}

		let extension = path.extname(file.name);
		let fileName = uuid().concat(extension);

		let remoteFile = `${baseDir.concat(fileName)}`;
		let r;
		r = await UploadController.toCloud(file.tempFilePath, remoteFile).catch((err) => {
			r = {
				uploaded: !true,
				error: JSON.stringify(err),
				url: null,
			};
			results[key] = r;
		});
		console.log(r);

		if (r !== undefined) {
			r = {
				uploaded: true,
				error: null,
				url: r.url,
				hash: r.hash,
			};
			results[key] = r;
		}
	}
	let successRate = 0;
	for (let r in results) {
		if (results[r].uploaded) successRate++;
	}
	res.status(200).json({
		success: 1,
		message: `${successRate} File(s) uploaded!`,
		data: results,
	});
};
UploadController.userUploads = async (req, res) => {
	let user = req.vsuser;
	if (!req.files) {
		res.status(400).json({ message: "No file selected." });
		return;
	}
	let d = {};
	if (req.body.dir) {
		d = JSON.parse(req.body.dir);
	}
	let results = {};
	for (let file in req.files) {
		if (file.trim() === "") continue;

		let key = file;
		file = req.files[file];

		if (file.name.trim() === "" || file.size === 0) {
			results[key] = {
				uploaded: !true,
				error: "No file selected.",
				url: null,
			};
			continue;
		}

		let extension = path.extname(file.name);
		let fileName = uuid().concat(extension);
		let subPath = `${user._id}`;
		if (d[key]) {
			subPath = subPath.concat(`/${d[key]}`);
		}
		let remoteFile = `usercontent/${subPath}/${fileName}`;
		let r;
		r = await UploadController.toCloud(file.tempFilePath, remoteFile).catch((err) => {
			r = {
				uploaded: !true,
				error: JSON.stringify(err),
				url: null,
			};
			results[key] = r;
		});

		if (r !== undefined) {
			r = {
				uploaded: true,
				error: null,
				url: r.url,
			};
			results[key] = r;
		}
	}
	let successRate = 0;
	for (let r in results) {
		if (results[r].uploaded) successRate++;
	}
	res.status(200).json({
		success: 1,
		message: `${successRate} File(s) uploaded!`,
		data: results,
	});
};

UploadController.videoasset = (req, res) => {
	let user = req.vsuser;
	if (!req.files) {
		return res.status(400).json({ message: "No file selected." });
	} else if (!req.files.vs_file) {
		return res.status(400).json({ message: "No entity to process." });
	} else if (!parseInt(req.params.videoId)) {
		return res.status(400).json({ message: "Video id is missing." });
	}

	let vs_file = req.files.vs_file;
	let extension = path.extname(vs_file.name);
	let localFile = vs_file.tempFilePath;
	let randomName = uuid().concat(extension);
	let videoId = parseInt(req.params.videoId);
	let remoteFile = `usercontent/${user.id}/${videoId}/${randomName}`;

	UploadController.toCloud(localFile, remoteFile)
		.then(({ url, data }) => {
			fs.unlinkSync(localFile);
			res.status(200).json({
				success: true,
				message: "File uploaded!",
				data: { url },
			});
		})
		.catch((err) => {
			res.status(500).json({
				message: "Failed to upload file, try again.",
				data: err,
			});
		});
};
module.exports = UploadController;
