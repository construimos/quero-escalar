import express from 'express'

let router = express.Router({});

router.get('/', async function (req, res, next) {
	res.send("Hello world");
});

export default {
	path: '/',
	router
}