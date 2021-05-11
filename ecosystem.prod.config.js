module.exports = {
	apps: [
		{
			name: "api.example.com",
			script: "./bin/www",

			// Options reference: https://pm2.keymetrics.io/docs/usage/application-declaration/
			interpreter_args: "--max_old_space_size=3072 --trace-warnings",
			instances: 1,
			autorestart: true,
			watch: false,
			max_memory_restart: "1G",
			env: {
				NODE_ENV: "production",
				UV_THREADPOOL_SIZE: 84,
			},
		},
		{
			name: "crons@api.example.com",
			script: "./cronjobs/index.js",

			// Options reference: https://pm2.keymetrics.io/docs/usage/application-declaration/
			interpreter_args: "--max_old_space_size=3072 --trace-warnings",
			instances: 1,
			autorestart: true,
			watch: false,
			max_memory_restart: "1G",
			env: {
				NODE_ENV: "production",
			},
		},
	],
};
