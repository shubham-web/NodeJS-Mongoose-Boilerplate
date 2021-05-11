const config = require("../config/config");
const API = require("./Api");
const {
	AccountPrivileges: { ADMIN, MAINTAINER, DEVELOPER, BASIC },
	AccountStatuses: { VERIFIED },
} = require("./../config/constants");
const Middleware = {};

Middleware.addRequestTime = (req, res, next) => {
	req.x_request_ts = new Date().toLocaleString("en-US", {
		timeZone: "Asia/Calcutta",
	}); // indian time string (eg 11/7/2020, 11:28:12 AM)
	next();
};
Middleware.checkRenderAccess = (req, res, next) => {
	if (!req.headers || !req.headers.mutual_access_key) {
		res.status(401).send({
			message: "Access Key Must Be Sent.",
		});
		return;
	}
	let API_KEY = req.headers.mutual_access_key;
	if (API_KEY !== config.renderServer.mutualAccessKey) {
		res.status(403).send({
			message: "Invalid Access Key.",
		});
		return;
	}
	next();
};
Middleware.remoteRenderAccess = (req, res, next) => {
	if (!req.headers || !req.headers.queue_token) {
		res.status(401).send({
			message: "Queue Token Must Be Sent.",
		});
		return;
	}
	req.queue_token = req.headers.queue_token;
	next();
};

Middleware.checkAuth = (req, res, next, requireAdminAccess = false) => {
	if (!req.headers || !req.headers.authorization) {
		res.status(401).send({
			message: "Authorization token must be provided.",
		});
		return;
	}
	let token = req.headers.authorization;
	if (token.includes("Bearer ")) {
		token = token.replace("Bearer ", "");
	}
	API.getUserByJwt(token)
		.then((user) => {
			if (!user) {
				res.status(403).send({
					message: "We couldn't identify you as a valid user. (invalid jwt token)",
				});
				return;
			}
			if (user.status !== VERIFIED) {
				res.status(403).json({
					message: `Access Denied! (Reason: Account is ${user.status})`,
				});
				return;
			}
			if (requireAdminAccess) {
				if (!(user.privileges.includes(ADMIN) || user.privileges.includes(MAINTAINER))) {
					res.status(403).send({
						message: "You don't have admin privileges.",
					});
					return;
				}
			}
			req._IS_ADMIN_ACCOUNT = user.privileges.includes(ADMIN);
			req.vsuser = user;
			next();
		})
		.catch((error) => {
			res.status(401).send({
				message: error.message,
			});
		});
};

module.exports = Middleware;
