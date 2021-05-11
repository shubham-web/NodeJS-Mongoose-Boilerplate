const mongoose = require("mongoose");
mongoose.set("bufferCommands", false);
const config = require("../config/config");
let { username, password, host, port, database } = config.db;

const callbacks = {
	onsuccess: (connection) => {
		console.log(`Connected to database ${connection.name}`);
	},
	onerror: (err) => {
		console.log("err", err);
	},
};

module.exports = function (cbs = callbacks) {
	console.log("→ Connecting to database...");
	let mongoUri = `mongodb://${username}:${password}@${host}:${port}/${database}?authSource=admin`;
	mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
	const conn = mongoose.connection;
	conn.on("error", (err) => {
		cbs.onerror(err);
	});
	conn.once("open", function () {
		cbs.onsuccess(conn);
	});
};
