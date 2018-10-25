const admin = require('firebase-admin');
const functions = require('firebase-functions');
const request = require('request');
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const config = require('./config');
const isAuthenticated = require('./middlewares/auth');

admin.initializeApp(functions.config().firebase);

const db = admin.firestore();
db.settings({timestampsInSnapshots:true});

const app = express();
app.use(bodyParser.urlencoded({extended:false}));

// constants
let shops = db.collection('shops');
let items = db.collection('items');

const latitudeConstant = 0.0144927536231884;
const longitudeConstant = 0.0181818181818182;

// Hard-Coded String
const googleUrl = 'https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=';
const inventory = "inventory";

// ROUTES

//cors
app.use(cors({
	origin: true
}));

// authentication
app.post('/login', googleLogin);
app.put('/onBoard', isAuthenticated, onBoard);
app.get('/auth', isAuthenticated, function (req, res) {
	res.send("isAuthenticated");
})

// inventory
app.post('/user/inventory', isAuthenticated, addInventory);
app.post('/items',isAuthenticated,addItems);
// app.post('/user/inventory', addInventory);
app.get('/user/inventory',isAuthenticated, getAllInventory);
app.get('/user/category', isAuthenticated, getSubCategories);
//location
// app.get('/location', nearby);



app.get('/getAll', getAllItems);
app.get('/fetchShops', fetchShops);
// app.post('/addData', addData);



app.use('/', function(req, res) {
	res.json({
		status: "connected",
		message: "use another routes"
	})
})
app.use(function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
});

function modifiedName(x)
{
	x=x.toLowerCase(x);
	x=x.replace(/[^a-zA-Z0-9 ]/g, "");
	x=x.replace(/\s/g,'');
	return x;
}





function addInventory(req, res) {
														// use data in bod

	if(req.body.onBoard===false){
		return res.status(401).json({
			success:false,
			message:"not onBoarded"
		})
	}


	let sub = req.body.sub;								// get UID from body
	let userInventory = shops.doc(sub);					// refrence to user inventory

	let promises = [];									// array of promises to fulfill

	let items = req.body.items;							// array of items (json)

	for(item in items) {								// traverse on items

		let subCategory = items[item].subCategory;		// get category
		let itemName = items[item].itemName;			// get item name

		itemName = modifiedName(itemName);				// modify item name for key

														// set item in database
		verify = userInventory.collection(subCategory).doc(itemName).set(items[item]);

		promises.push(verify);							// push promise to array
	}

	Promise.all(promises)								// when all promises are resolved
	.then(() => {
		return res.status(200).json({					// send response
			success: true,
			message: "items added"
		})
	})
	.catch((err) => {									// if all promises are not resolved
		return res.status(500).json({
			success: false,
			message: "could not add all items",
			err: err
		})
	})
}



// auxiliary function to add items
// in items node of the database
// items will also added in items node
// for easy searching
// accepts same data as addInventory()
function addItems(req, res) {

	let sub = req.body.sub;						// user UID
	let userInventory = shops.doc(sub);			// reference to use inventory

	let promises = [];						// promises array to verify

	let items = req.body.items;				// get items from body

	for(item in items) {					// traverse on items

		let subCategory = items[item].subCategory;		// get item category
		let itemName = items[item].itemName;			// get item name

		itemName = modifiedName(itemName);				// modify item name for key

		let x = db.collection('items').doc(itemName).set({		// set item in items node
			subCategory: subCategory
		});

		promises.push(x);					// push promise to array
	}

	Promise.all(promises)					//if all the items are added (promises resolved)
	.then(() => {
		return res.status(200).json({
			success: true,
			message: "items added"
		})
	})
	.catch((err) => {						// if items could not be added

		return res.status(500).json({
			success: false,
			message: "could not add all items",
			err: err
		})
	})
}



/*********************************************
*
*
*		*****************************
		Function to get nearby shops
		having desired product
*
*
*
*/


// Usage: distance in miles, product name in URL patameters as:
// dis=&item=


function fetchShops(req, res) {

	const lat = parseFloat(req.query.dis)*0.0144927536231884;			//distance box
	const lon = parseFloat(req.query.dis)*0.0181818181818182;			//distance box

	let data = {
		shops:[]
	};

	let subCategory = '';
	let item = req.query.item;
	item = modifiedName(item);	//changing item name as per database

	let latitude = parseFloat(req.query.latitude);	//parsing to float
	let longitude = parseFloat(req.query.longitude);

	let prom;
	let ref = items.doc(item);
	prom = ref.get()
	.then((itemSnap) => {

		subCategory=itemSnap.data().subCategory;		// getting item's subCategory
	})
	.catch((err) => {
		console.log(err);
		res.json({
			success:false,
			empty:true,
			message:"could not find anything about that item",
			data:data
		})
	});

	prom.then(() => {

		let temp=[];

		let query = shops.where('latitude', '>=', latitude - lat).where('latitude', "<=", latitude + lat).get()		//qyuery at desired latitude
		.then(function(snapshot) {

			if(snapshot.exists === false) {
				console.log('snap null');
				return res.status(200).json({
					success:true,
					empty:true,
					message:'no shops',
					data:data,
				})
			}

			snapshot.forEach((doc) => {

				let docData = doc.data();

				if(docData.longitude <= longitude + lon && docData.longitude >= longitude -lon) {		//query at longitude

					let itemRef = shops.doc(docData.sub).collection(subCategory).doc(item);			//getting details of shops and price
					temp.push(
						itemRef.get()
						.then((snapshot) => {

							if(snapshot.exists === true) {

							let details = {
								price: snapshot.data().price,
								data: doc.data()
							}

							data["shops"].push(details);
						}})
						.catch((err) => {

							let message = {
								err: err,
								message: "could not get shops data"
							}
							console.log(message);

							res.status(400).json(message);
						})
					)

				}

			})

			Promise.all(temp)
			.then(function(){

				let empty = false;
				if(data["shops"].length === 0)
					empty = true;
				console.log(data["shops"].length);

				return res.status(200).json({
					success: true,
					empty:empty,
					data: data,
				});
			})
			.catch((err) => {
				console.log(err);
			})
		})
		.catch((err) => {
			console.log("catch", err);
		})
	}).catch((err) => {
		console.log(err);
	})
}














// return all items in a category in nearby shops
// [GET] request
// latitude
// longitude
// dis
// subCategory
function getAllItems(req, res){

	const lat = parseFloat(req.query.dis)*0.0144927536231884;		// get coordinates constant
	const lon = parseFloat(req.query.dis)*0.0181818181818182;

	let latitude = req.query.latitude;			// get latitude
	let longitude = req.query.longitude;		// longitude
	let subCategory = req.query.subCategory;	// subCategory

	// get nearby shops
	var query = shops.where('latitude', '>=', parseFloat(latitude)-lat).where('latitude', '<=', parseFloat(latitude) + lat).get()
	.then(snapshot => {

		let data = {
			shops: []					// will store the items available
		};

		let promises = [];
		snapshot.forEach((doc) => {

			if((doc.data().longitude <= parseFloat(longitude) + lon) && (doc.data().longitude >= parseFloat(longitude) - lon)) {

				let shop = {};
				shop["shopDetails"] = doc.data();
				shop["itemsAvailable"] = new Array();

				// these are the nearby shops
				// in cube
				let ref = shops.doc(doc.data().sub).collection(subCategory);

				let x = ref.get()								// get all items in subCategory
				.then((snap)=>{

					snap.forEach((itemDoc) => {					// traverse on each item

						let itemData = itemDoc.data();
						// console.log(itemData);

						shop["itemsAvailable"].push(itemData);		// push items to array
					})

					if(shop["itemsAvailable"].length > 0) {			// if for each shop - items are nont availabke - then dont push

						data["shops"].push(shop);
					}
				})
				.catch((err) => {							// error getting items in subCategory
					// console.log(err);

					return res.json({success:false,
					message:"could not find anything for this subcategory",
					empty:true});
				});

				promises.push(x);

			}
		})

		Promise.all(promises)							// if all the promises are resolved
		.then(() => {
			let empty = true;
			if(data["shops"].length > 0)
				empty = false;

			return res.status(200).json({
				success: true,
				empty:empty,
				data: data,
			});
		})
		.catch((err) => {

			return res.status(500).json({
				success: false,
				message: "error getting shops",
				err: err
			})

		})

	})
	.catch((err) => {

		return res.json({
			message:"error getting nearby shops",
			success:false,
			empty:true,
			err: err
		})

	});
}

// when user wants to see what items he has in what categories
// [GET] token in headers
function getSubCategories(req, res) {

	let data = {					// stores categories of a user
		subCategories: []
	};

	let sub = req.body.sub;			// get UID from body

	shops .doc(sub).getCollections()		// get user categories
	.then((snapshot) => {

		snapshot.forEach((collection) => {			// traverse on each category

			data["subCategories"].push(collection.id);		// push category name in array
		});

		return res.status(200).json({				// send categories to client
					success:true,
					data:data,
				});
	})
	.catch((err) => {

		return res.status(500).json({				// error in fetching
			success: false,
			message: "could not fetch user categories in inventory",
			err: err
		})
	})
}


// get all items in a category
// for a user
// token in headers
// [GET] subCategory = category
function getAllInventory(req, res) {

	let data = {					// will store the items in that category
		items: []
	};

	let sub=req.body.sub;			// get UID from headers in body

	let subCategory = req.query.subCategory;  		// get category from request

	db.collection('shops').doc(sub).collection(subCategory).get()		// get items in that category
	.then((docs) => {

		docs.forEach((doc) => {						// for each item
			data["items"].push(doc.data());			// push item in array
		})

		return res.status(200).json({				// send response to client
			success:true,
			data:data,
		});
	})
	.catch((err) => {									// if error

		return res.status(500).json({
			success: false,
			message: "could not fetch items. Try Again!",
			err: err
		});
	});
}

// logs in a user
// recieves id_token from Google Auth
// body
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

				let data = {token: token};

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



// to get user onBoard
// accepts additional information
// shop name
// coordinates/ location of business
// written address
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

// export functions
exports.api = functions.https.onRequest(app);
