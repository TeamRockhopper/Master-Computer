// Configure environment variables.
require('dotenv').config();

// Imports.
const express = require('express');
const bodyParser = require('body-parser');
const Keyv = require('keyv')
const KeyvFile = require('keyv-file').KeyvFile

// Set up our file-based key-value storage.
const storage = new Keyv({
  store: new KeyvFile({
		filename: `data-storage.json`
	})
});

// Application setup.
const app = express();
app.use(express.static('static'));
app.set('view engine', 'ejs');
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Parsing out environment variables.
const APPLICATION = process.env.APPLICATION;
const PORT = process.env.PORT;
const SECRET = process.env.SECRET;

// A helper function to sleep asynchronously.
const sleep = function (ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
};

// A middleware for validating POST requests from the master computer.
const verifyPostData = function (req, res, next) {
	const requestSecret = req.body.secret;
	if (requestSecret !== SECRET) {
		return next(`Request body secret mismatch!`);
	}
	return next();
};

// A middleware for validating GET requests from the master computer.
const verifyGetData = function (req, res, next) {
	const requestSecret = req.header('secret');
	if (requestSecret !== SECRET) {
		return next(`Request header secret mismatch!`);
	}
	return next();
};

// Allow verified sources to push data to the persistence layer.
app.post('/put', verifyPostData, async function (req, res) {
	const key = req.body.key;
	const value = req.body.value;
	try {
		await storage.set(key, value);

	// Catch any errors that might occur in storing data.
	} catch (error) {
		console.error(error);
		res.status(400).send(error);
	}

	// Tell master computer that we've completed the request.
  res.status(200).send('Putting data succeeded.');
});

// Allow verified sources to get data from the persistence layer.
app.get('/get/:key', verifyGetData, async function (req, res) {
	const key = req.params.key;
	try {
		let value = await storage.get(key);
	  res.status(200).send({ value: value });

	// Catch any errors that might occur in storing data.
	} catch (error) {
		console.error(error);
		res.status(400).send(error);
	}
});

// Use a middleware that allows us to authenticate incoming requests.
app.use((err, req, res, next) => {
  if (err) console.error(err);
  res.status(403).send('Request authentication failed.');
});

// Launch the application and begin the server listening.
app.listen(PORT, function () {
	console.log(APPLICATION, 'listening on port', PORT);
});
