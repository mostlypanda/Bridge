const admin = require('firebase-admin');
const express = require('express');
const bodyParser = require('body-parser');

// database reference
const db = admin.firestore();

// express app
const app = express();
app.use(bodyParser.urlencoded({extended:false}));

// constants
let shops = db.collection('shops');
let items = db.collection('items');

const latitudeConstant = 0.0144927536231884;
const longitudeConstant = 0.0181818181818182;

// ROUTES
app.get('/', fetchShops);

/*********************************************
**********************************************
TO GET NEARBY SHOPS HAVING DESIRED PRODUCT
**********************************************
*********************************************/
// Usage: distance in miles, 
// product name in URL patameters as:
// dis=&item=
function fetchShops(req, res) {

	console.log();
	console.log("trigerred");


	const lat = parseFloat(req.query.dis) * latitudeConstant;			//distance box
	const lon = parseFloat(req.query.dis) * longitudeConstant;			//distance box

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

		return res.json({
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

							res.status(400).json(message);
						})
					)

				}

			})

			Promise.all(temp)
			.then(function() {

				let empty = false;
				if(data["shops"].length === 0)
					empty = true;

				return res.status(200).json({
					success: true,
					empty:empty,
					data: data,
				});
			})
			.catch((err) => {

				return res.status(500).json({
					success: false,
					err: err
				})
			})
		})
		.catch((err) => {

			return res.status(500).json({
				success: false,
				err: err
			})
		})
	}).catch((err) => {

		return res.status(500).json({
				success: false,
				err: err
		})
	})
}

function modifiedName(x) {
	
	x = x.toLowerCase(x);
	x = x.replace(/[^a-zA-Z0-9 ]/g, "");
	x = x.replace(/\s/g,'');
	return x;
}

module.exports = app;