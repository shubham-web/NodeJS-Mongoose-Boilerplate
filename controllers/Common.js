const Common = { get: {}, post: {}, put: {}, delete: {} };

const config = require("../config/config");
const AWS = require("aws-sdk");
const { scryptSync } = require("crypto");
AWS.config = new AWS.Config(config.aws.configuration);
const spacesEndpoint = new AWS.Endpoint("s3.amazonaws.com");
const s3Object = new AWS.S3({
	endpoint: spacesEndpoint,
});

const stripUTF8 = (text) => {
	return text.replace(/[^\x00-\x7F]/g, "_");
};

Common.isArray = function (a) {
	return !!a && a.constructor === Array;
};
Common.isObject = function (a) {
	return !!a && a.constructor === Object;
};

Common.isOutsourced = (assetURL = "") => {
	return !Common.s3Url(assetURL).startsWith(config.url.s3Endpoint);
};

Common.hashPassword = (pwd) => {
	return scryptSync(pwd, config.keys.passwordSalt, 32).toString("hex");
};
Common.comparePassword = (source, input) => {
	return Common.hashPassword(input) === source;
};
Common.s3Url = (path = "") => {
	if (!path) {
		return null;
	}
	if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("blob:")) {
		return path;
	}
	let _ = config.url.s3Endpoint.concat(path);
	return _.toString();
};
Common.post.getSignedUrl = (req, res) => {
	let params = req.body;
	if (!params.k || !params.n) {
		res.status(404).json({
			errCode: 1,
			message: "No such file exists.",
		});
		return;
	}
	let Key = params.k;
	let url = s3Object.getSignedUrl("getObject", {
		Bucket: config.aws.bucket,
		Key,
		Expires: 600, // seconds
		ResponseContentDisposition: `attachment; filename=${stripUTF8(params.n)}.mp4;`,
	});
	let urlObject = new URL(url);
	url = url.replace(`${urlObject.origin}/`, config.url.s3Endpoint);
	res.status(200).json({
		success: 1,
		url: url,
	});
};

module.exports = Common;
