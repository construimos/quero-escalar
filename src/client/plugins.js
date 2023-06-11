const plugins = {
	install(app) {
		const contexts = import.meta.globEager('./plugins/*.js')

		for (let path of Object.keys(contexts)) {
			let plugin = contexts[path].default;

			plugin(app);
		}
	}
};

export default plugins;