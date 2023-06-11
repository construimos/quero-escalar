import createServer from 'udany-base-configs/modules/server.js';
import createViteConfig from 'udany-base-configs/modules/vite.config.js';
import registerApi from './api';
import express from 'express';

async function startServer() {
	const { server, app, api } = await createServer({
		basePath: __dirname,

		https: {
			enabled: false
		},
		ssr: {
			enabled: true
		},

		port: 8420,

		viteConfig: createViteConfig({
			root: './src/client',
			sassAutoImport: 'src/client/css/global.scss'
		}),

		onServerInitialized(app) {
			app.use('/resources', express.static(__dirname + '/resources'));
		}
	});

	registerApi({
		server,
		app,
		api
	});
}

startServer();
