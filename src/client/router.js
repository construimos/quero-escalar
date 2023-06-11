import { createRouter as createVueRouter, createWebHistory, createMemoryHistory } from 'vue-router'

const routes = [];

// This imports all routes
const contexts = import.meta.globEager('./modules/*/*routes.js')

for (let path of Object.keys(contexts)) {
	let partial = contexts[path];
	routes.push(...partial.default);
}

function createRouter() {
	return createVueRouter({
		history: import.meta.env.SSR ? createMemoryHistory() : createWebHistory(),
		routes: routes,
	});
}

export default createRouter;
