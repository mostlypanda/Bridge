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
const itemRoutes = require('./routes/items');
const allItemsRoutes = require('./routes/allItems');
const itemSearchRoute = require('./routes/itemSearch');

// express app
const app = express();
app.use(bodyParser.urlencoded({extended:false}));

// ROUTES
//cors
app.use(cors({
	origin: true
}));
// authentications
app.use('/', authRoutes);
// user
app.use('/user', isAuthenticated, userRoutes);
// items
app.use('/items',isAuthenticated, itemRoutes);
// get all items in category
app.use('/getAll', allItemsRoutes);
// fetch shops with desired product
app.use('/fetchShops', itemSearchRoute);

app.use('/', function(req, res) {
	
	return res.json({
		success: false,
		status: "connected",
		message: "use another routes"
	})
})

app.use(function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
});


// EXPORT functions
exports.api = functions.https.onRequest(app);