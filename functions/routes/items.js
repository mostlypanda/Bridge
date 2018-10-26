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
app.post('/', addItems);


/**********************************
***********************************
AUXILIARY FUNCTION TO ADD ITEMS 
***********************************
**********************************/
// in items node of the database
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

// TO MODIFY ANY STRING ACCORDING TO OUR NEED
function modifiedName(x) {
	
	x = x.toLowerCase(x);
	x = x.replace(/[^a-zA-Z0-9 ]/g, "");
	x = x.replace(/\s/g,'');
	return x;
}


module.exports = app;