const admin = require('firebase-admin');
const functions = require('firebase-functions');
const request = require('request');
const express = require('express');
const bodyParser = require('body-parser');

admin.initializeApp(functions.config().firebase);

const db = admin.firestore();
db.settings({timestampsInSnapshots:true});

const app = express();
app.use(bodyParser.urlencoded({extended:false}));

// constants
let shops = db.collection('shops');

// ROUTES
app.get('/fdata', fdata);
app.post('/addData', addData);
app.post('/onBoard', onBoard);

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


function onBoard(req, res) {

	let shopName = req.body.shopName;
	let latitude = req.body.latitude;
	let longitude = req.body.longitude;

	if(shopName === undefined || latitude === undefined || longitude === undefined) {
		return res.status(400).json({
			success: false,
			message: "Usage: shopName=name&latitude=lat&longitude"
		})
	}

	latitude = parseFloat(latitude);
	longitude = parseFloat(longitude);

	shops.doc(shopName).set({
		latitude,
		longitude,
		shopName
	})
	.then(() => {
		res.status(200).json({
			success: true,
			message: `${shopName} added to database`
		})
	})
	.catch(() => {
		res.status(500).json({
			success: false,
			message: "could not add shop"
		})
	})
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
					return details;
				})
				.catch((err) => {

					let message = {
						err: err,
						message: "could not get shops data"
					}
					console.log(message);

					return err;
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


exports.api = functions.https.onRequest(app);