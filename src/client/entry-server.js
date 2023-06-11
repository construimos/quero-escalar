import createApp from './main.js';

export async function render(url) {
	const { app, router } = createApp();

	// set the router to the desired URL before rendering
	router.push(url);
	await router.isReady();

	return { app, router };
}
