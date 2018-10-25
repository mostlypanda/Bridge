const admin = require('firebase-admin');
const request = require('request');
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const config = require('../config');
const isAuthenticated = require('../middlewares/auth')

// database reference
const db = admin.firestore();

// express app
const app = express();
app.use(bodyParser.urlencoded({extended:false}));

// strings
const googleUrl = 'https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=';

// constants
let shops = db.collection('shops');

// ROUTES
app.post('/login', googleLogin);
app.put('/onBoard', isAuthenticated, onBoard);

/***********************************
************************************
			LOG IN USER
************************************
***********************************/
// recieves id_token from Google Auth
// in body
// as idToken
function googleLogin(req, response) {

	let idToken = req.body.idToken;						// get idToken
	if(idToken === undefined) {							// if idToken is not sent in request

		return response.status(400).json({					// bad request
			success: false,
			message: "Usage: [POST] idToken=token"
		})
	}

	request(googleUrl + idToken, {json: true}, (err, res, body) => {			// request google api for user data

		if(err) {														// error in request
			return response.status(406).json({
				success: false,
				message: "could not make request to google",
				err: err
			})
		}

		// console.log(body);

		if(body.error_description !== undefined) {				// error in idToken
																// so user error_description is retuned in the body
			return response.status(400).json({					// unauthenticated requeest
				message: "empty/invalid token",
				error: 'unauthenticated request',
				success: false,
			})
		}

		let sub = body.sub;									// user UID
		let name = body.name;								// user name
		let email = body.email;								// user email
		let picture = body.picture;							// user picture url

		// console.log(sub, name, email, picture);

		shops.doc(body.sub).get()							// get user data from the database
		.then((snapshot) => {
			// console.log(snapshot.data());

			if(snapshot.data() === undefined) {				// if this is a new user

				let userData = {							// set userData
					name: name,
					sub: sub,
					email: email,
					picture: picture,
					onBoard: false
				}

				shops.doc(sub).set(userData);				// insert new user data in database

				const token = jwt.sign(userData, config.key);		// generate jwt token for user

				let data = {
					token: token
				};

				return response.status(200).json({			// send response to client
					success: true,
					onBoard: false,
					data: data
				})
			}
			else {											// user already exists

				let userData = {								// set user data
					name: snapshot.data().name,
					sub: snapshot.data().sub,
					email: snapshot.data().email,
					picture: snapshot.data().picture,
					onBoard: snapshot.data().onBoard			// if he is onBoard or not
				}

				if(snapshot.data().onBoard === true) {					// if he is already on Board

					userData.latitude = snapshot.data().latitude;		// set latitude
					userData.longitude = snapshot.data().longitude;		// set longitude
					userData.address = snapshot.data().address;			// set address
					userData.shopName = snapshot.data().shopName;		// set shopName
				}

				const token = jwt.sign(userData, config.key);			// generate jwt token

				let data = {token: token};

				return response.status(200).json({						// send response to client
					success: true,
					onBoard: snapshot.data().onBoard,
					data: data
				})
			}
		})
		.catch((err) => {

			return response.status(500).json({
				success: false,
				message: "could not fetch user data",
				err: err
			})

		})
	})
}


/********************************
*********************************
	TO GET USER ON-BOARD
*********************************
********************************/
// accepts additional information
// shop name
// coordinates/ location of business
// postal address
function onBoard(req, res) {

	// user information in body
	let shopName = req.body.shopName;								// accepts parameters
	let latitude = parseFloat(req.body.latitude);
	let longitude = parseFloat(req.body.longitude);
	let address = req.body.address;
	let sub = req.body.sub;

	if(shopName === undefined || latitude === undefined || longitude === undefined || address === undefined) {			// if any of the parameters are undefined
		return res.status(400).json({																	// bad request
			success: false,
			message: "Usage: [PUT] shopName=name&latitude=lat&longitude=lon&address=addr"
		})
	}

	shops.doc(sub).get()								// get user from database
	.then((snapshot) => {

		if(snapshot.data() === undefined) {				// user does not exist

			return res.status(403).json({				// forbidden
				success: false,
				message: "user does not exist"
			})
		}

		let userData = snapshot.data();					// user data

		if(userData.onBoard === false) {				// if he is not onBoard

			shops.doc(sub).update({						// update information
				onBoard: true,
				latitude: latitude,
				longitude: longitude,
				address: address,
				shopName: shopName
			})

			let userData = {							// jwt token data
				name: snapshot.data().name,
				sub: snapshot.data().sub,
				email: snapshot.data().email,
				picture: snapshot.data().picture,
				onBoard: true,
				latitude: latitude,
				longitude: longitude,
				address: address,
				shopName: shopName
			}

			// console.log(userData);

			const token = jwt.sign(userData, config.key);			// generate token

			let data = {token};

			return res.status(200).json({				// send resposnse to client
				success: true,
				message: "user onBoard now",
				data: data
			})
		}
		else {														// already onBoard

			return res.status(405).json({							// not allowed
				success: false,
				message: "not allowed, already onBoard"
			})
		}
	})
}

module.exports = app;