const admin = require('firebase-admin');
const functions = require('firebase-functions');
const request = require('request');
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const config = require('./config');
const isAuthenticated = require('./middlewares/auth');

admin.initializeApp(functions.config().firebase);

const db = admin.firestore();
db.settings({timestampsInSnapshots:true});

const app = express();
app.use(bodyParser.urlencoded({extended:false}));

// constants
let shops = db.collection('shops');

// Hard-Coded String
const googleUrl = 'https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=';
const Inventory = "Inventory"; 

// ROUTES

// authentication
app.post('/login', googleLogin);
app.put('/onBoard', isAuthenticated, onBoard);
app.get('/auth', isAuthenticated, function (req, res) {
	res.send("isAuthenticated");
})

// inventory
app.post('/user/inventory', isAuthenticated, addInventory);


app.get('/fdata', fdata);
app.post('/addData', addData);

app.use('/', function(req, res) {
	res.json({
		status: "connected",
		message: "use another routes"
	})
})

//const lat = 10*0.0144927536231884;
//const lon = 10*0.0181818181818182;
//const lat = 1;
//const lon = 1;



function addInventory(req, res) {

	console.log(req.body);

	let sub = req.body.sub;

	let userInventory = shops.doc(sub).collection(Inventory);

	let verify;

	let items = req.body.items;
	for(item in items) {

		console.log(items[item]);

		let category = items[item].category;
		let subCategory = items[item].subCategory;
		let itemName = items[item].itemName;

		verify = userInventory.doc(category).collection(subCategory).doc(itemName).set(items[item]);
	}

	verify.then(() => {
		return res.status(200).json({
			success: true,
			message: "items added"
		})
	})
	.catch(() => {

		return res.status(500).json({
			success: false,
			message: "could not add all items"
		})
	})
}


function addData(req, res) {

	var data=req.body.itemdata;
	var item=req.body.item;

	console.log("data ----", data);
	console.log("-----");
	console.log("item ----", item);
	console.log("-----");

	let shopname = data["shopname"];
	let category = data["category"];
	let subCategory = data["subCategory"];
	let itemName = data["itemName"];

	console.log(shopname, category, subCategory, itemName);

	var ref= db.collection("shops").doc(shopname).collection("inventory").doc(category).collection(subCategory).doc(itemName);
	ref.set(item);
	//ref.add(data);
	// ref= db.collection("shops").doc("baba store").collection("inventory").doc("food").collection("packed food").doc("lays");
	// //console.log(ref);
	// ref.get().then((snapshot)=>{
	// 	console.log(snapshot.data());
	// }).catch(err => {console.log(err);})
	return res.send('tan tana tan tan tan tara, chalti hai kya 9 se 12');
}


// async function fetchShops(docData, category, subCategory, item, data, doc) {
//
//
// 	let itemRef = shops.doc(docData.shopname).collection("inventory").doc(category).collection(subCategory).doc(item);
// 	itemRef.get()
// 	.then((snapshot) => {
//
// 		if(snapshot.exists === false) {
//
// 			return;
// 			// return res.status(200).json({
// 			// 	success: true,
// 			// 	message: "no shops available"
// 			// })
// 		}
//
// 		let details = {
// 			price: snapshot.data().price,
// 			data: doc.data()
// 		}
//
// 		console.log(snapshot.data());
// 		console.log(doc.id, '=>', details);
// 		// data["shops"].push(details);
//
// 		data["shops"].push(details);
// 		return details;
// 	})
// 	.catch((err) => {
//
// 		let message = {
// 			err: err,
// 			message: "could not get shops data"
// 		}
// 		console.log(message);
//
// 		return err;
// 	})
// }

function fdata(req, res) {

	// console.log("hey");

	const lat = parseFloat(req.query.dis)*0.0144927536231884;
	const lon = parseFloat(req.query.dis)*0.0181818181818182;

	let subCategory = req.query.subCategory;
	let category = req.query.category;
	let item = req.query.item;
	let latitude = parseFloat(req.query.latitude);
	let longitude = parseFloat(req.query.longitude);

	// console.log(subCategory, category, item, latitude, longitude);
	let temp;

	let query = shops.where('latitude', '>=', latitude - lat).where('latitude', "<=", latitude + lat).get()
	.then(function(snapshot) {

		let data = {shops: []};

		if(snapshot.exists === false) {
			console.log('snap null');
		}

		snapshot.forEach((doc) => {


			let docData = doc.data();

			// console.log(docData);

			if(docData.longitude <= longitude + lon && docData.longitude >= longitude -lon) {

				// console.log(doc.data());
				// console.log("---------");
				// console.log("---------");
				let itemRef = shops.doc(docData.shopname).collection("inventory").doc(category).collection(subCategory).doc(item);
				temp =itemRef.get()
				.then((snapshot) => {

					if(snapshot.exists === false) {

						return;
						// return res.status(200).json({
						// 	success: true,
						// 	message: "no shops available"
						// })
					}

					let details = {
						price: snapshot.data().price,
						data: doc.data()
					}

					console.log(snapshot.data());
					console.log(doc.id, '=>', details);
					// data["shops"].push(details);

					data["shops"].push(details);
					// return details;
				})
				.catch((err) => {

					let message = {
						err: err,
						message: "could not get shops data"
					}
					console.log(message);

					res.status(400).json(message);
				})

			}

		})

		temp.then(function(){
			return res.status(200).json({
				success: true,
				data: data
			});
		}).catch(err => {console.log(err);})


	})
	.catch((err) => {
		console.log("catch", err);
	})

	// var query = citiesRef.where('latitude', '>=', parseFloat(req.query.latitude)-lat).where('latitude', '<=', parseFloat(req.query.latitude)+lat).get()
	// .then(snapshot => {

	// 	let data = {shop:[]};
	// 	snapshot.forEach(doc => {
	// 		console.log(doc.data().shopname+doc.data().longitude);
	// if(doc.data().longitude<=parseFloat(req.query.longitude)+lon &&doc.data().longitude>=parseFloat(req.query.longitude)-lon){
	// var ref= db.collection("shops").doc(doc.data().shopname).collection("inventory").doc(req.query.category).collection(req.query.subCategory).doc(req.query.item);
	// 	//console.log(ref);
	// 	ref.get().then((snapshot)=>{
	// 		console.log(snapshot.data());
	// 		if(snapshot.exists){
	// 			console.log(doc.data().shopname+doc.data().longitude);
	// 			console.log('heyyyy');
	// 			let dat={
	// 				price:snapshot.data().price,
	// 				data:doc.data()
	// 			}
	// 			console.log(doc.id, '=>', dat);
	// 			data.shop.push({
	// 				data:dat,
	// 			});
	// 		}
	// 		res.json(data);
	// 	}).catch(err => {console.log(err);})
	// 	} });
	// res.json(data);
	// 	})
	// .catch(err => {


	// 	console.log('Error getting documents', err);

	// 	return res.json({
	// 		mes:"flas"
	// 	})

	// });
	// [END get_multiple]


}





function getAllItems(req, res){

	// console.log("hey");

	const lat = parseFloat(req.query.dis)*0.0144927536231884;
	const lon = parseFloat(req.query.dis)*0.0181818181818182;

	let latitude = req.query.latitude;
	let longitude = req.query.longitude;

	var citiesRef = db.collection('shops');

	// console.log(parseFloat(req.query.latitude)+1+"   "+req.query.longitude);

	var query = citiesRef.where('latitude', '>=', parseFloat(latitude)-lat).where('latitude', '<=', parseFloat(latitude) + lat).get()
	.then(snapshot => {

		let data = {shop:[]};
		snapshot.forEach(doc => {

			console.log(doc.data().shopname+doc.data().longitude);

			if((doc.data().longitude <= parseFloat(longitude) + lon) && (doc.data().longitude >= parseFloat(longitude) - lon)) {
				//////////////           CODE HERE              ///////////////////


			}
		});

		res.json({
			success: true
		});
	})
	.catch(err => {

		console.log('Error getting documents', err);

		return res.json({
			mes:"flas"
		})

	});
}














































function googleLogin(req, response) {

	let idToken = req.body.idToken;
	if(idToken === undefined) {

		return res.status(400).json({
			success: false,
			message: "Usage: [POST] idToken=token"
		})
	}

	request(googleUrl + idToken, {json: true}, (err, res, body) => {

		if(err) {
			// not acdeptable
			return response.status(406).json({
				success: false,
				message: "could not make request to google",
				err: err
			})
		}

		console.log(body);

		if(body.error_description !== undefined) {

			return response.status(400).json({
				message: "empty/invalid token",
				error: 'unauthenticated request',
				success: false,
			})
		}

		let sub = body.sub;
		let name = body.name;
		let email = body.email;
		let picture = body.picture;

		console.log(sub, name, email, picture);

		shops.doc(body.sub).get()
		.then((snapshot) => {
			// console.log(snapshot.data());

			if(snapshot.data() === undefined) {

				let userData = {
					name: name,
					sub: sub,
					email: email,
					picture: picture,
					onBoard: false
				}

				shops.doc(sub).set(userData);

				const token = jwt.sign(userData, config.key);

				let data = {token: token};

				return response.status(200).json({
					success: true,
					onBoard: false,
					data: data
				})
			}
			else {

				// console.log("user exits");
				// console.log(snapshot.data());

				let userData = {
					name: snapshot.data().name,
					sub: snapshot.data().sub,
					email: snapshot.data().email,
					picture: snapshot.data().picture,
					onBoard: snapshot.data().onBoard
				}

				if(snapshot.data().onBoard === true) {

					userData.latitude = snapshot.data().latitude;
					userData.longitude = snapshot.data().longitude;
					userData.address = snapshot.data().address;
					userData.shopName = snapshot.data().shopName;
				}

				const token = jwt.sign(userData, config.key);

				let data = {token: token};

				return response.status(200).json({
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


function onBoard(req, res) {

	console.log(req.body);

	let shopName = req.body.shopName;
	let latitude = parseFloat(req.body.latitude);
	let longitude = parseFloat(req.body.longitude);
	let address = req.body.address;
	let sub = req.body.sub;

	if(shopName === undefined || latitude === undefined || longitude === undefined || address === undefined) {
		return res.status(400).json({
			success: false,
			message: "Usage: [PUT] shopName=name&latitude=lat&longitude=lon&address=addr"
		})
	}

	shops.doc(sub).get()
	.then((snapshot) => {

		if(snapshot.data() === undefined) {
			// user does not exist
			return res.status(403).json({
				success: false,
				message: "user does not exist"
			})
		}

		let userData = snapshot.data();

		if(userData.onBoard === false) {

			shops.doc(sub).update({
				onBoard: true,
				latitude: latitude,
				longitude: longitude,
				address: address,
				shopName: shopName
			})

			let userData = {
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

			console.log(userData);

			const token = jwt.sign(userData, config.key);

			let data = {token};

			return res.status(200).json({
				success: true,
				message: "user onBoard now",
				data: data
			})
		}
		else {

			return res.status(405).json({
				success: false,
				message: "not allowed, already onBoard"
			})
		}
	})
}

exports.api = functions.https.onRequest(app);
