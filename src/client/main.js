import 'udany-toolbox/extend';

import { createSSRApp } from 'vue'
import App from './App.vue'
import createRouter from './router';
import plugins from './plugins'

function createApp() {
	const app = createSSRApp(App);
	app.use(plugins);

	const router = createRouter();
	app.use(router);

	return { app, router }
}

export default createApp;
