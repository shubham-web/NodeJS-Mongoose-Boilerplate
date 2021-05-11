const router = require("express").Router();
const controllers = {
	index: require("../controllers/Index"),
	auth: require("../controllers/Auth"),
	admin: require("../controllers/Admin"),
	user: require("../controllers/User"),
	common: require("../controllers/Common"),
	jumpstory: require("../controllers/Jumpstory"),
	video: require("../controllers/Video"),
	renderRequests: require("../controllers/RenderRequests"),
	remoteRender: require("../controllers/RemoteRender"),
	template: require("../controllers/Template"),
	category: require("../controllers/Category"),
	api: require("../controllers/Api"),
	effects: require("../controllers/Effects"),
	upload: require("../controllers/Upload"),
	middleware: require("../controllers/Middleware"),
};
let adminAccessible = ["/admin/*"];
let renderOnly = ["/render/*"];
let remoteRender = ["/remote-render/*"];

let requests = {};

requests.apiPrefix = "";
let checkJWT = [];

requests.get = {
	/** Authentication (Endpoints which does not require any authorization token) */
	"/auth/check-reset-token/:token": controllers.auth.get.checkresettoken,
	"/auth/hashpassword/:password": controllers.auth.get.hashpassword,

	"/no-auth/mongoose-res": controllers.api.get.mongooseRes,

	/** User APIs */
	"/me": controllers.user.get.me,
	"/video/:id": controllers.video.get.video,
	"/usercontent": controllers.user.get.usercontent,
	"/usercontent/:key": controllers.user.get.usercontent,
	"/my-videos": controllers.video.get.myvideos,
	"/videos/:page/:query": controllers.video.get.videosbykeyword,
	// "/pexels-videos/:query": controllers.common.get.pexelsVideos,
	"/recommended-videos": controllers.video.get.recommendedVideos,
	"/images/:query/:page": controllers.common.get.imagesbykeyword,
	"/categories": controllers.category.get.all,
	"/weffects": controllers.effects.get.all,

	"/render-progress/:token": controllers.renderRequests.get.progress,
	"/flush-render-files/:id/:token": controllers.renderRequests.get.flushRenderFiles,
	"/jump/random": controllers.jumpstory.get.random,
	"/jump/image-search/:query/:page": controllers.jumpstory.get.imagesearch,
	"/jump/video-search/:query/:page": controllers.jumpstory.get.videosearch,
	"/jump/download/:type/:id": controllers.jumpstory.get.download,

	/** Admin APIs */
	"/admin/users": controllers.admin.get.users,
	"/admin/user/:id": controllers.admin.get.user,
	"/admin/loginas/:id/:email": controllers.admin.get.loginas,
	"/templates": controllers.template.get.all,
	"/admin/templates": controllers.template.get.templates,
	"/admin/template/:id": controllers.template.get.single,
	"/admin/categories": controllers.category.get.all,
	"/admin/videos": controllers.admin.get.videos,
	"/admin/video/:id": controllers.admin.get.video,
	"/admin/weffects": controllers.effects.get.selectAll,
	"/admin/effect-hash/:md5hash": controllers.effects.get.fromMD5hash,

	"/admin/trigger-automated-tasks/:id": controllers.admin.get.triggerAutomatedTasks,

	/** Remote Render APIs (For Puppeteer) */
	"/remote-render/layerdata": controllers.remoteRender.get.layerData,
	"/failedbatch": controllers.renderRequests.cronJobs.reInitFailedBatches,
	"/no-auth/failedbatch": controllers.renderRequests.cronJobs.reInitFailedBatches,

	/** Render APIs (For Render Servers Only) */
	"/render/get-token-data/:token": controllers.renderRequests.renderServerOnly.getTokenData,
	"/render/get-batch-logs/:token": controllers.renderRequests.renderServerOnly.batchLogs,
};

requests.post = {
	/** Authentication (Endpoints which does not require any authorization token) */
	"/auth/login": controllers.auth.post.login,
	"/auth/register": controllers.auth.post.register,
	"/auth/forgot-password": controllers.auth.post.forgotPassword,
	"/no-auth/get-signed-url": controllers.common.post.getSignedUrl,
	/** User APIs */
	"/video": controllers.video.post.video,
	"/upload/asset": controllers.upload.userUploads,
	"/usercontent": controllers.user.post.usercontent,
	"/render-request": controllers.renderRequests.post.addToQueue,
	"/start-render": controllers.renderRequests.post.startRender,
	"/enable-sharing": controllers.video.post.enableSharing,
	"/duplicate-video": controllers.video.post.duplicateVideo,
	"/jump/remove-bg": controllers.jumpstory.post.removebg,

	/** Admin APIs (Endpoints which requires admin privilege) */
	"/admin/user": controllers.admin.post.user,
	"/admin/upload": controllers.upload.adminUploads,
	"/admin/template": controllers.template.post.template,
	"/admin/template/:id/:layout": controllers.template.post.template,
	"/admin/category": controllers.category.post.category,
	"/admin/video": controllers.admin.post.video,
	"/admin/effect": controllers.effects.post.effect,
	"/admin/effectgroup": controllers.effects.post.effectgroup,
	"/admin/render-request": controllers.renderRequests.post.templateRender,

	"/render/upload": controllers.renderRequests.renderServerOnly.uploadVideoChunk,
};

requests.put = {
	"/me": controllers.user.put.me,
	"/admin/category/:id": controllers.category.put.category,
};

requests.patch = {
	"/admin/user/:id": controllers.admin.patch.user,
	"/auth/reset-password/:token": controllers.auth.patch.resetPassword,
	"/admin/video/:id": controllers.admin.patch.video,
	"/admin/effect/:id": controllers.effects.patch.effect,
	"/admin/template/:id": controllers.template.patch.template,
	"/admin/effectgroup/:id": controllers.effects.patch.effectgroup,
	"/video/:id": controllers.video.patch.video,
	"/video-size/:id": controllers.video.patch.videoSize,

	"/render/update-logs/:token/:batchindex": controllers.renderRequests.renderServerOnly.updateLogs,
	"/render/update-entry/:token": controllers.renderRequests.renderServerOnly.updateRow,
	"/render/success-callback/:token": controllers.renderRequests.renderServerOnly.successCallback,
};

requests.delete = {
	/** Admin APIs */
	"/admin/user/:id": controllers.admin.delete.user,
	"/admin/template/:id": controllers.template.delete.single,
	"/admin/category/:id": controllers.category.delete.category,
	"/admin/effectgroup/:id": controllers.effects.delete.effectgroup,
	"/usercontent/:key/:id": controllers.user.delete.usercontent,
	"/me/profile-picture": controllers.user.delete.profilePicture,
	"/video/:id": controllers.video.delete.video,
};

for (let key in requests) {
	if (typeof requests[key] !== "object") continue;
	for (let ep in requests[key]) {
		if (!ep.startsWith("/admin/") && !ep.startsWith("/auth/") && !ep.startsWith("/no-auth/") && !ep.startsWith("/render/") && !ep.startsWith("/remote-render/")) {
			checkJWT.push(requests.apiPrefix.concat(ep));
		}
	}
}
checkJWT = [...new Set(checkJWT)]; // to remove duplicates

router.use(controllers.index);
router.use(controllers.middleware.addRequestTime);
router.use(adminAccessible, (req, res, next) => {
	controllers.middleware.checkAuth(req, res, next, true);
});

router.use(checkJWT, (req, res, next) => {
	controllers.middleware.checkAuth(req, res, next, false);
});

router.use(renderOnly, controllers.middleware.checkRenderAccess);
router.use(remoteRender, controllers.middleware.remoteRenderAccess);

for (let url in requests.get) {
	if (!requests.get[url]) {
		console.log("!!!", url);
	}
	router.route(requests.apiPrefix.concat(url)).get(requests.get[url]);
}

for (let endpoint in requests.post) {
	if (!requests.post[endpoint]) {
		console.log("!!!", endpoint);
	}
	router.route(requests.apiPrefix.concat(endpoint)).post(requests.post[endpoint]);
}

for (let endpoint in requests.put) {
	router.route(requests.apiPrefix.concat(endpoint)).put(requests.put[endpoint]);
}

for (let endpoint in requests.patch) {
	router.route(requests.apiPrefix.concat(endpoint)).patch(requests.patch[endpoint]);
}

for (let endpoint in requests.delete) {
	router.route(requests.apiPrefix.concat(endpoint)).delete(requests.delete[endpoint]);
}

module.exports = router;
