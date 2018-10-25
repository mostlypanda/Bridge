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

// ROUTES
app.post('/inventory', addInventory);
app.get('/inventory', getAllInventory);
app.get('/category', getSubCategories);


/*********************************
**********************************
FOR USER TO ADD/UPDATE INVENTORY
**********************************
*********************************/

function addInventory(req, res) {
														// use data in body
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



/**************************************
***************************************
GET ALL ITEMS IN A CATEGORY FOR A USER
***************************************
**************************************/
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

/**********************************
***********************************
GETS ALL CATEGORIES WHICH USER HAS
***********************************
**********************************/
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

// TO MODIFY ANY STRING ACCORDING TO OUR NEED
function modifiedName(x) {

	x = x.toLowerCase(x);
	x = x.replace(/[^a-zA-Z0-9 ]/g, "");
	x = x.replace(/\s/g,'');
	return x;
}

module.exports = app;