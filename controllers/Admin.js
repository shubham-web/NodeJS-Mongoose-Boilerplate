const config = require("./../config/config");
const API = require("./Api");
const { Users } = require("../models/DB");
const {
	AccountStatuses: { VERIFIED },
	AccountPrivileges: { BASIC, ADMIN, MAINTAINER, DEVELOPER },
} = require("../config/constants");
const Common = require("./Common");
const Admin = { get: {}, post: {}, put: {}, patch: {}, delete: {} };
Admin.get.user = async (req, res) => {
	let userId = req.params.id;
	if (!userId) {
		res.status(400).json({
			message: "User id is missing or has invalid characters.",
		});
		return;
	}
	Users.findById(userId)
		.select(["name", "email", "status", "createdAt"].join(" "))
		.lean()
		.then((user) => {
			if (!user) {
				res.status(404).json({
					message: "No such user exists.",
				});
				return;
			}

			res.status(200).json({
				success: true,
				message: "",
				data: user,
			});
		})
		.catch((err) => {
			console.log(err);
			res.status(500).json({
				message: "Internal server error occurred.",
				data: err,
			});
		});
};

Admin.get.users = async (req, res) => {
	const users = await Users.find().select(["name", "email", "createdAt", "status"]).sort({ createdAt: "desc" }).lean();
	res.status(200).json({
		success: true,
		message: "",
		data: users,
	});
};

Admin.get.loginas = async (req, res) => {
	let userId = req.params.id;
	let userEmail = req.params.email;
	Users.findOne({ email: userEmail, _id: userId })
		.select(["email", "privileges", "password", "status"])
		.then((user) => {
			if (!user) {
				res.status(400).json({
					message: "No user exists with such email.",
				});
				return;
			}
			if (user.status !== VERIFIED) {
				res.status(403).json({
					message: `${user.status} account can't be logged in.`,
				});
				return;
			}
			if (user.privileges.includes(DEVELOPER)) {
				res.status(403).json({
					message: "Protected Account.",
				});
				return;
			}

			const token = jwt.sign(
				{
					id: user.id,
					email: user.email,
				},
				config.keys.secret,
				{
					expiresIn: "24h",
				}
			);
			let loggedInMessage = `${user.email} logged in by admin at ${req.x_request_ts} [${req.ip}]`.green;
			console.log(loggedInMessage);

			res.status(200).json({
				success: true,
				token,
			});
		})
		.catch((error) => {
			console.log(error);
			res.status(500).json({
				message: "There was an error on server.",
			});
		});
};

Admin.patch.user = async (req, res) => {
	let userId = req.params.id;
	if (!userId) {
		res.status(400).json({
			message: "User id is missing or has invalid characters.",
		});
		return;
	}

	let user = await Users.findById(userId).catch((err) => {
		res.status(500).json({
			message: "Internal server error occurred.",
			data: err,
		});
	});
	if (!user) {
		res.status(404).json({
			message: "No such user exists.",
		});
		return;
	}
	if (user.privileges.includes(DEVELOPER)) {
		res.status(403).json({
			message: "Protected Account.",
		});
		return;
	}

	let newValues = req.body;
	let updationAllowed = ["name", "email", "password", "status", "privileges"];
	let newData = {};
	for (let changedKey in newValues) {
		if (updationAllowed.includes(changedKey)) {
			newData[changedKey] = newValues[changedKey];
		} else {
			res.status(409).json({
				message: `The key "${changedKey}" doesn't exist in database or can not be updated.")`,
			});
			return;
		}
	}
	Users.updateOne(
		{ _id: userId },
		{
			$set: {
				...newData,
			},
		}
	)
		.then((updatedData) => {
			res.json({
				success: 1,
				message: "User modified successfully.",
				data: updatedData,
			});
		})
		.catch((e) => {
			res.status(500).json({
				message: "An error occurred while updating user details",
				data: e,
			});
		});
};

Admin.post.user = async (req, res) => {
	if (!req.body.name || !req.body.email || !req.body.password) {
		res.status(400).json({
			message: "You missed out some fields!",
		});
		return;
	}
	let privileges = [BASIC];
	if (req.body.privileges) {
		privileges.push(...req.body.privileges);
	}

	const newUser = {
		name: req.body.name,
		email: req.body.email,
		password: req.body.password,
		privileges: privileges,
		status: VERIFIED,
	};
	let userRecord = await Users.findOne({ email: req.body.email }).select("email");
	if (!userRecord) {
		return Users.create(newUser).then((user) => {
			res.status(201).json({
				success: true,
				message: "Account created!",
				data: { id: user._id },
			});
		});
	} else {
		res.status(409).json({
			message: "Account already exists!",
		});
	}
};

Admin.deleteuser = (userId) => {
	return new Promise((resolve, reject) => {
		Users.findById(userId)
			.then((user) => {
				if (!user) {
					reject([400, "No such user exists!"]);
					return;
				}
				if (user.privileges.includes(ADMIN)) {
					reject([403, "Admin's account can not be deleted this way."]);
					return;
				}
				if (user.privileges.includes(MAINTAINER)) {
					reject([403, "Maintainer's account can not be deleted this way."]);
					return;
				}
				if (user.privileges.includes(DEVELOPER)) {
					reject([403, "Protected Account."]);
					return;
				}
				Users.deleteOne({ _id: userId })
					.then(() => {
						API.deleteS3Directory(`usercontent/${userId}/`)
							.then(() => {
								console.log("Deleted", `usercontent/${userId}/`.inverse);
							})
							.catch((e) => {
								console.log(`Error while deleting user's directory ${e.toSting()}`, e);
							});
						resolve([200, "Deleted!"]);
					})
					.catch((err) => {
						reject([500, err]);
						console.log("Error while deleting user #".concat(userId), err);
					});
				return null;
			})
			.catch((err) => {
				reject([500, err]);
			});
	});
};
Admin.delete.user = (req, res) => {
	let userId = req.params.id;
	if (!userId) {
		res.status(400).json({
			message: "User id is missing or has invalid characters.",
		});
		return;
	}
	Admin.deleteuser(userId)
		.then((r) => {
			res.status(r[0]).json({
				success: true,
				message: r[1],
			});
		})
		.catch((r) => {
			res.status(r[0]).json({
				message: r[1],
			});
		});
};
module.exports = Admin;
