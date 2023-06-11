import path from 'path';
let glob = require('fast-glob');

const routesDir = (__dirname + '\\routes').replace(/\\/g, `/`);

function registerApi({
	api
}) {
	let routeFiles = glob.sync(`${routesDir}/*.js`);

	console.log(
		'Registering api routes:',
		routeFiles.map(x => x.replace(routesDir, '')),
		'\n'
	);

	for (let file of routeFiles) {
		let route = require(path.resolve(file)).default;

		api.use(route.path, route.router);
	}
}

export default registerApi;
