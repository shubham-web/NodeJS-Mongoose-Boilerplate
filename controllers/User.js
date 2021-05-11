const { Users } = require("../models/DB");
const Common = require("./Common");
const UploadController = require("./Upload");

const U = { get: {}, post: {}, put: {}, delete: {} };

U.get.me = (req, res) => {
	let user = req.vsuser;
	let keysToSend = ["_id", "name", "email", "usercontent", "privileges", "status", "createdAt"];
	let filtered = {};
	for (let key of keysToSend) {
		filtered[key] = user[key];
	}

	res.status(200).json({
		success: 1,
		message: null,
		data: filtered,
	});
};

U.put.me = (req, res) => {
	let user = req.vsuser;
	let newValues = req.body;
	let updationAllowed = ["name", "password"];
	let newData = {};
	for (let changedKey in newValues) {
		if (updationAllowed.includes(changedKey)) {
			newData[changedKey] = newValues[changedKey];
		} else {
			res.status(409).json({
				message: `The key "${changedKey}" doesn't exist or can not be updated.")`,
			});
			return;
		}
	}
	Users.updateOne({ _id: user._id }, newData)
		.then((result) => {
			res.json({
				success: 1,
				message: "Profile updated successfully.",
				data: result,
			});
		})
		.catch((e) => {
			res.status(500).json({
				message: "An error occurred while updating user details",
				data: e,
			});
		});
};

U.delete.profilePicture = (req, res) => {
	let user = req.vsuser;
	let uc;
	if (!user.usercontent) {
		uc = {};
	} else {
		uc = JSON.parse(user.usercontent);
	}
	let key = "profiles";
	if (!uc[key]) {
		res.status(404).json({
			message: "Profile picture not available.",
		});
		return;
	}

	delete uc[key];
	Users.updateOne(
		{ _id: user._id },
		{
			usercontent: JSON.stringify(uc),
		}
	)
		.then(() => {
			API.deleteS3Directory(`usercontent/${user.id}/profile/`)
				.then(() => {
					res.status(200).json({
						success: 1,
						message: "Removed!",
					});
				})
				.catch((e) => {
					res.status(500).json({
						message: e,
					});
				});
			return null;
		})
		.catch((e) => {
			res.status(500).json({
				message: e.toString(),
				data: e,
			});
		});
};

U.delete.usercontent = async (req, res) => {
	let user = req.vsuser;
	let uc = !user.usercontent ? {} : JSON.parse(user.usercontent);

	let { key, id } = req.params;
	id = parseInt(id);
	if (!uc[key]) {
		res.status(404).json({
			message: "No such key available in usercontent.",
		});
		return;
	}
	let assetGroup = uc[key];
	let assetToRemove = assetGroup.find((a) => a.id === id);
	if (!assetToRemove) {
		res.status(404).json({
			message: `No media available with id #${id} in group "${key}".`,
		});
		return;
	}

	let remotePaths = [];

	uc[key] = uc[key].filter((a) => a.id !== id);

	if (["images", "videos"].includes(key)) {
		remotePaths.push(assetToRemove.url, assetToRemove.thumb);
	} else if (key === "logos") {
		remotePaths.push(assetToRemove.src);
	}

	Users.updateOne(
		{ _id: user._id },
		{
			usercontent: JSON.stringify(uc),
		}
	)
		.then(() => {
			UploadController.deleteObject(remotePaths)
				.then(() => {
					res.status(200).json({
						success: 1,
					});
				})
				.catch((e) => {
					res.status(500).json({
						message: e.toString(),
						data: e,
					});
				});
		})
		.catch((e) => {
			res.status(500).json({
				message: e.toString(),
				data: e,
			});
		});
};
U.get.usercontent = async (req, res) => {
	let { key } = req.params;
	let user = req.vsuser;
	let uc = user.usercontent || {};

	if (typeof uc !== "object") {
		uc = JSON.parse(uc);
	}

	if (key) {
		if (uc[key]) {
			uc = uc[key];
		} else {
			uc = [];
		}
	}
	res.json({
		success: true,
		message: "",
		data: uc,
	});
};

const appendUserContent = (user, ent) => {
	return new Promise((resolve, reject) => {
		let uc = !user.usercontent ? {} : JSON.parse(user.usercontent);
		let data = ent.data,
			key = ent.key;
		let id = 1;
		if (!uc[key]) {
			uc[key] = [];
		}
		let latestEntry = uc[key][0];
		if (latestEntry) {
			id = latestEntry.id + 1 || 1;
		}

		console.log(key, data);

		let newEntry = { id, ...data };

		uc[key].unshift(newEntry);

		Users.updateOne(
			{ _id: user._id },
			{
				usercontent: JSON.stringify(uc),
			}
		)
			.then(() => {
				resolve(uc);
			})
			.catch(reject);
	});
};

U.post.usercontent = async (req, res) => {
	let user = req.vsuser;
	appendUserContent(user, req.body)
		.then((updated) => {
			res.status(200).json({
				success: true,
				message: "",
				data: updated,
			});
		})
		.catch((e) => {
			res.status(500).json({
				message: JSON.stringify(e),
				data: e,
			});
		});
};

module.exports = U;
