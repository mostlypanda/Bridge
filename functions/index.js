const admin = require('firebase-admin');
const functions = require('firebase-functions');
const request = require('request');
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const cors = require('cors');

// initialize default app
admin.initializeApp(functions.config().firebase);

// database reference
const db = admin.firestore();
db.settings({timestampsInSnapshots:true});

// require routes and middleware
const config = require('./config');
const isAuthenticated = require('./middlewares/auth');
const userRoutes = require('./routes/user');
const authRoutes = require('./routes/login');

// express app
const app = express();
app.use(bodyParser.urlencoded({extended:false}));

// constants
let shops = db.collection('shops');
let items = db.collection('items');

const latitudeConstant = 0.0144927536231884;
const longitudeConstant = 0.0181818181818182;

// strings
const googleUrl = 'https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=';
const inventory = "inventory";

// ROUTES

//cors
app.use(cors({
	origin: true
}));

// authentications
app.use('/', authRoutes);
app.use('/user', isAuthenticated, userRoutes);

app.get('/auth', isAuthenticated, function (req, res) {
	res.send(req.body);
})

// inventory
//location
// app.get('/location', nearby);

app.post('/items',isAuthenticated, addItems);


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








// export functions
exports.api = functions.https.onRequest(app);
