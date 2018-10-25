const admin = require('firebase-admin');
const express = require('express');
const bodyParser = require('body-parser');

// database reference
const db = admin.firestore();

// express app
const app = express();
app.use(bodyParser.urlencoded({extended:false}));

// database constants
let shops = db.collection('shops');
// constants
const latitudeConstant = 0.0144927536231884;
const longitudeConstant = 0.0181818181818182;

// ROUTES
app.get('/', getAllItems);


/*****************************************
******************************************
GET ALL ITEMS IN CATEGORY IN NEARBY SHOPS
******************************************
*****************************************/
// [GET] request
// latitude
// longitude
// dis
// subCategory
function getAllItems(req, res){

	const lat = parseFloat(req.query.dis) * latitudeConstant;		// get coordinates constant
	const lon = parseFloat(req.query.dis) * longitudeConstant;

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

// export
module.exports = app;