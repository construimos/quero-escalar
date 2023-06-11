# Escalada Project

A simple project for web apps.  
Runs on [express](https://expressjs.com/) and [vite](https://vitejs.dev/).

It's still not quite production tested,
but it will be in due time.

Pending features include:
- [ ] SSR data fetching and serialization.
- [ ] Per environment configs.
- [ ] Building for production.
- [ ] Deploying to production.

## Structure Overview
The project is entirely contained within the `src` folder,
within it are the two core locations `api` and `client`.

### Api
No surprises here, all the js files within the `routes`
folder are registered by default on startup, if there's
need, you may edit the `registerApi()` function over at
`index.js` to alter this behavior.


### Client
Here, the structure has a bit more... authorial aspects,
but not too many I hope.


#### Assets
Easy one, for static global assets like favicons and such.


#### Css
Global css goes here.  
`definitions` holds sass stuff (variables, mixins, etc).  
`styles` includes all files that actually output, well... styles.  
`global.scss` is for definitions that you want available on every `.scss` file.  
`main.scss` is the global css file, it's imported by `main.js` on the `client` root.


#### Layouts
There's a simple layout system im place so that different
pages can be enveloped in custom layouts if needed be.

To be a layout all a vue component needs is a slot, no more, no less.


#### Modules
Last but _definitely_ not least, is the `modules` folder.

Here is where the core of your project's client-side code.

The idea is to group the project's domains within modules,
with every module aggregating their related components,
assets, etc.

Every module may contain a `routes.js` file which exports
an array of [route definition](https://next.router.vuejs.org/api/#routerecordraw)
objects.

## SSR

SSR is supported out-of-the-box and should mostly just work
for basic scenarios.

More complex implementations such as forwarding cookies
and serializing the state have yet to be worked out.

For more in-depth information check the  official
documentation for both [vite](https://vitejs.dev/guide/ssr.html)
and [vue](https://v3.vuejs.org/guide/ssr/introduction.html#what-is-server-side-rendering-ssr).
