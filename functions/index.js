const admin = require('firebase-admin');
const functions = require('firebase-functions');
const request = require('request');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.urlencoded({extended:false}));


admin.initializeApp(functions.config().firebase);

app.get('/fdata',fdata);
app.post('/addData',addData);

var db = admin.firestore();
db.settings({timestampsInSnapshots:true});
let collection = db.collection('shops');
//const lat = 10*0.0144927536231884;
//const lon = 10*0.0181818181818182;
//const lat = 1;
//const lon = 1;

//const collectionRef = admin.firestore().collection('geofirestore');

// Create a GeoFirestore index
//const geoFirestore = new GeoFirestore(collectionRef);

function fdata(req, res){

	console.log("hey");
	const lat = parseFloat(req.query.dis)*0.0144927536231884;
	const lon = parseFloat(req.query.dis)*0.0181818181818182;
  	var citiesRef = db.collection('shops');
console.log(parseFloat(req.query.latitude)+1+"   "+req.query.longitude);
  var query = citiesRef.where('latitude', '>=', parseFloat(req.query.latitude)-lat).where('latitude', '<=', parseFloat(req.query.latitude)+lat).get()
      .then(snapshot => {

      	let data = {shop:[]};
        snapshot.forEach(doc => {
console.log(doc.data().shopname+doc.data().longitude);
          if(doc.data().longitude<=parseFloat(req.query.longitude)+lon &&doc.data().longitude>=parseFloat(req.query.longitude)-lon){
					var ref= db.collection("shops").doc(doc.data().shopname).collection("inventory").doc(req.query.category).collection(req.query.subCategory).doc(req.query.item);
					//console.log(ref);
					ref.get().then((snapshot)=>{
						console.log(snapshot.data());
						if(snapshot.exists){
							console.log(doc.data().shopname+doc.data().longitude);
							console.log('heyyyy');
							let dat={
								price:snapshot.data().price,
								data:doc.data()
							}
							console.log(doc.id, '=>', dat);
							data.shop.push({
								data:dat,
							});
						}
					}).catch(err => {console.log(err);})
        } });
		  res.json(data);
      })
      .catch(err => {


        console.log('Error getting documents', err);

     	return res.json({
     		mes:"flas"
     	})

      });
  // [END get_multiple]


}
function addData(req, res){
	// var data={
	// 	item:'lays',
	// 	price:20,
	// 	quantity:50
	// };
	var data=req.body.itemdata;
	var item=req.body.item;
	console.log(data.shopname);
	console.log(item);
	var ref= db.collection("shops").doc(data.shopname).collection("inventory").doc(data.category).collection(data.subcategory).doc(data.item);
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

	console.log("hey");
	const lat = parseFloat(req.query.dis)*0.0144927536231884;
	const lon = parseFloat(req.query.dis)*0.0181818181818182;
  	var citiesRef = db.collection('shops');
console.log(parseFloat(req.query.latitude)+1+"   "+req.query.longitude);
  var query = citiesRef.where('latitude', '>=', parseFloat(req.query.latitude)-lat).where('latitude', '<=', parseFloat(req.query.latitude)+lat).get()
      .then(snapshot => {

      	let data = {shop:[]};
        snapshot.forEach(doc => {
console.log(doc.data().shopname+doc.data().longitude);
          if(doc.data().longitude<=parseFloat(req.query.longitude)+lon &&doc.data().longitude>=parseFloat(req.query.longitude)-lon){
					//////////////           CODE HERE              ///////////////////
        } });
		  res.json();
      })
      .catch(err => {


        console.log('Error getting documents', err);

     	return res.json({
     		mes:"flas"
     	})

      });
  // [END get_multiple]

}
exports.api = functions.https.onRequest(app);
