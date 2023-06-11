const baseRoute = '/';

export default [
	{
		path: `${baseRoute}`,
		name: 'index',
		component: () => import('./Home.vue')
	},
];