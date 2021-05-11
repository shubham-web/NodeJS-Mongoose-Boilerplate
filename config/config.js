const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

let dotenvParams = { path: path.join(__dirname, "..", ".env") };

if (!fs.existsSync(dotenvParams.path)) {
	console.log(`.env [Environment variables file] not found at "${dotenvParams.path}"`.red);
	process.exit();
}

dotenv.config(dotenvParams);

// Set port
let port;
(() => {
	if (process.env.NODE_ENV === "development") {
		port = process.env.DEV_PORT;
	} else if (process.env.NODE_ENV === "production") {
		port = process.env.LIVE_PORT;
	} else {
		console.error(`NODE_ENV not provided.`);
	}
})();

// Set FrontEnd Url
let frontendUrl;
(() => {
	if (process.env.NODE_ENV === "development") {
		frontendUrl = process.env.FRONTEND_URL_DEV;
	} else if (process.env.NODE_ENV === "production") {
		frontendUrl = process.env.FRONTEND_URL_LIVE;
	}
})();

// Set Frontend URL
const data = {
	siteTitle: process.env.SITE_TITLE,
	port: port,
	url: {
		frontend: frontendUrl,
		s3Endpoint: process.env.S3_ENDPOINT,
	},
	allowedOrigins: [frontendUrl, "http://localhost:3000"],
	aws: {
		bucket: process.env.S3_BUCKET,
		configuration: {
			accessKeyId: process.env.ACCESS_KEY,
			secretAccessKey: process.env.SECRET_ACCESS_KEY,
			region: process.env.REGION,
		},
	},
	db: {
		database: process.env.DB_NAME,
		username: process.env.DB_USER,
		password: process.env.DB_PSWD,
		host: process.env.DB_HOST,
		port: process.env.DB_PORT,
		collectionsToBackup: ["categories", "effectgroups", "effects", "libraryvideos", "renderrequests", "routedassets", "templates", "users", "videos"],
	},
	email: {
		from_name: process.env.EMAIL_NAME,
		from_email: process.env.EMAIL_ADDRESS,
		replyTo: process.env.EMAIL_REPLY_TO,
		website: process.env.EMAIL_WEBSITE,
	},
	keys: {
		secret: process.env.SECRET_KEY,
		passwordSalt: process.env.PSWD_SALT,
		unsplash: {
			access: process.env.UNSPLASH_API_KEY,
		},
		pexels: {
			apikey: process.env.PEXELS_API_KEY,
		},
	},
	jumpstory: {
		key: process.env.JUMPSTORY_ACCESS,
		user: process.env.JUMPSTORY_USER,
		origin: process.env.JUMPSTORY_ORIGIN,
		perpage: 20,
		popularKeywords: ["nature", "beauty", "video marketing", "travel", "joy", "happy", "shopping"],
	},
};
module.exports = data;
