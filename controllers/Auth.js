const config = require("../config/config");
const jwt = require("jsonwebtoken");
const uuid = require("uuid/v4");
const { Users } = require("../models/DB");
const API = require("./Api");
const {
	AccountPrivileges: { BASIC, ADMIN, DEVELOPER, MAINTAINER },
	AccountStatuses: { UNVERIFIED, VERIFIED, SUSPENDED },
} = require("./../config/constants");
const Common = require("./Common");

const Auth = { get: {}, post: {}, put: {}, patch: {}, delete: {} };

Auth.post.login = async (req, res) => {
	if (!req.body.email || !req.body.password) {
		res.status(400).json({
			message: "Email or password is empty.",
		});
		return;
	}
	const email = req.body.email;
	const password = req.body.password;
	let user = await Users.findOne({ email: email }).catch((error) => {
		console.log(error);
		res.status(500).json({
			message: "There was an error!",
			data: error,
		});
	});

	if (!user) {
		res.status(400).json({
			message: "No user exists with such email.",
		});
	} else if (user.status !== VERIFIED) {
		res.status(403).json({
			message: `Your account is ${user.status}.`,
		});
	} else {
		let matched = Common.comparePassword(user.password, password);
		if (matched) {
			const token = jwt.sign(
				{
					id: user._id,
					email: user.email,
				},
				config.keys.secret,
				{
					expiresIn: "24d",
				}
			);
			let loggedInMessage = `${user.email} logged in at ${req.x_request_ts} [${req.ip}]`.green;
			console.log(loggedInMessage);

			res.status(200).json({
				success: true,
				token,
				message: "Login Successful.",
			});
		} else {
			let failedMessage = `${user.email} failed logging in at ${req.x_request_ts} [${req.ip}]`.white.bgRed;
			console.log(failedMessage);
			res.status(403).json({
				message: "Invalid password.",
			});
		}
	}
};

Auth.get.checkresettoken = async (req, res) => {
	let token = req.params.token;
	if (!token) {
		res.status(400).json({
			message: "The reset token is not provided or has invalid characters.",
		});
		return;
	}
	const potentialUser = {
		where: { resetPasswordToken: token },
	};
	let user = await Users.findOne(potentialUser.where);
	if (!user) {
		res.status(403).json({
			message: "Password reset link is invalid or has expired.",
		});
	} else {
		res.status(200).json({
			success: 1,
			message: "",
		});
	}
};

Auth.get.hashpassword = (req, res) => {
	let { password } = req.params;
	if (!password) {
		res.status(400).json({
			message: "No password provided",
		});
		return;
	}
	res.status(200).json({
		success: 1,
		message: "",
		data: Common.hashPassword(password),
	});
};

Auth.post.register = async (req, res) => {
	let { name, email, password } = req.body;
	if (!name || !email || !password) {
		res.status(400).json({
			message: "You missed out some fields!",
		});
		return;
	}
	let privileges = [BASIC];
	let isValidEmail = (email) => {
		const re = /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
		return re.test(String(email).toLowerCase());
	};
	if (!isValidEmail(email)) {
		res.status(400).json({
			message: "Invalid email provided.",
		});
	}
	const newUser = {
		name: name,
		email: email,
		password: req.body.password,
		privileges: privileges,
		status: VERIFIED,
	};
	let userRecord = await Users.findOne({ email: req.body.email });
	if (userRecord === null) {
		return Users.create(newUser).then((user) => {
			res.status(201).json({
				success: true,
				message: "Account created!",
				data: { id: user.id, email: user.email },
			});
		});
	} else {
		res.status(409).json({
			message: "Account already exists!",
		});
	}
};

Auth.post.forgotPassword = (req, res) => {
	if (!req.body.email) {
		res.status(400).json({
			message: "Enter your registered email.",
		});
		return;
	}

	let email = req.body.email;
	const potentialUser = {
		where: { email },
	};
	Users.findOne(potentialUser.where).then((user) => {
		if (!user) {
			res.status(400).json({
				message: `We couldn't find your account.`,
			});
			return;
		}
		if (user.status !== VERIFIED) {
			res.status(406).json({
				message: `Your account is ${UNVERIFIED}.`,
			});
			return;
		}

		let token = uuid();
		user.update({
			$set: { resetPasswordToken: token },
		}).then(() => {
			let htmlToSend = API.getTemplate(
				{
					"reset-link": `${config.url.frontend}reset-password/${token}`,
				},
				"reset-password"
			);
			API.sendMail({
				name: user.name,
				to: email,
				subject: `Password Reset Link - ${config.siteTitle}`,
				message: htmlToSend,
				hasHTML: true,
			})
				.then((info) => {
					res.status(200).json({
						success: true,
						message: "Password reset link has been sent to your email.",
					});
				})
				.catch((error) => {
					console.error(error);
					res.status(520).json({
						message: "Unable to send password reset link on your email, Please try again.",
						data: error,
					});
				});
		});
	});
};

Auth.patch.resetPassword = async (req, res) => {
	if (!req.body.password || !req.params.token) {
		console.log(req.body);
		res.status(400).json({
			message: "Parameters are missing",
		});
		return;
	}

	let { password } = req.body;
	let token = req.params.token;
	if (password === "") {
		res.status(400).json({
			message: "Enter your new password",
		});
		return;
	}

	const potentialUser = {
		where: { resetPasswordToken: token },
	};
	let user = await Users.findOne(potentialUser.where);
	if (!user) {
		res.status(403).json({
			message: "This link is invalid or has expired.",
		});
		return;
	}

	user.update({
		$set: {
			password: password,
		},
		$unset: {
			resetPasswordToken: 1,
		},
	})
		.then(() => {
			res.status(200).json({
				success: true,
				message: "Your password has been changed.",
			});
		})
		.catch((err) => {
			res.status(500).json({
				message: "An error occurred while updating password.",
				error: { raw: err, string: err.toString() },
			});
		});
};

module.exports = Auth;
