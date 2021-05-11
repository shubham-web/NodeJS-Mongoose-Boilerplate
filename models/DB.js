const db = {};

// Models/tables
db.Users = require("./User");
db.Videos = require("./Video");

// for first time when tables are empty
/* for (let collectionname in db) {
	db[collectionname].createCollection();
} */

module.exports = db;
