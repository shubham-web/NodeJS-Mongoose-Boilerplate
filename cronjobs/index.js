let CronJob = require("cron").CronJob;
let { takeDatabaseBackup } = require("./Crons");
let { port } = require("./../config/config");
const fetch = require("node-fetch");
// let { reInitFailedBatches } = require("./../controllers/RenderRequests");
const reInitFailedBatches = () => {
	return new Promise((resolve, reject) => {
		fetch(`http://localhost:${port}/no-auth/failedbatch`)
			.then((e) => e.json())
			.then((json) => {
				resolve(json);
			})
			.catch((e) => {
				reject({
					e: e,
				});
			});
	});
};
let dailyDbBackup = new CronJob(
	"0 0 * * *", // At 12:00 AM (midnight) in india daily
	function () {
		console.log("============");
		takeDatabaseBackup();
	},
	null,
	true,
	"Asia/Kolkata"
);
dailyDbBackup.start();

let reRunFailedRender = new CronJob(
	"* * * * *", // every minute
	function () {
		reInitFailedBatches()
			.then((data) => {
				if (data.status === 404) {
					console.log("Reinit Failed batches = SUCCESS", data.response.message);
					return;
				}
				console.log(JSON.stringify(data));
			})
			.catch((data) => {
				console.log("Reinit Failed batches = CATCH");
				console.log(JSON.stringify(data));
			});
	},
	null,
	true,
	"Asia/Kolkata"
);
// reRunFailedRender.start();

console.log("Cron Job Started!");
