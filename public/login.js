$('#logged').hide();



function onSignIn(googleUser) {
	var profile = googleUser.getBasicProfile();
	console.log('ID: ' + profile.getId()); // Do not send to your backend! Use an ID token instead.
	console.log('Name: ' + profile.getName());
	console.log('Image URL: ' + profile.getImageUrl());
	console.log('Email: ' + profile.getEmail()); // This is null if the 'email' scope is not present.
	
	console.log(googleUser.getAuthResponse().id_token);
	
	let token = googleUser.getAuthResponse().id_token;
	let name = profile.getName();
	
	setUpPage(name);
	requestFirebase(token);
}

function signOut() {
	var auth2 = gapi.auth2.getAuthInstance();
	auth2.signOut().then(function () {
		console.log('User signed out.');
		
		$('#logged').hide();
		$('#userName').hide();
	});
}

function setUpPage(name) {
	
    $('#userName').html("Hello " + name + "!");
    $('#userName').show();
}

function setUpLoggedIn() {
	
	$('#logged').show();
	
}

function requestFirebase(token) {
	
	// console.log("ye aya ", token);
	alert("requesting now");
	$.ajax({
		url: "https://us-central1-excaliburtut.cloudfunctions.net/api/login",
		type: "POST",
		data: {
			"idToken": token 
		},
		success: function(result, status) {
			
			// if(status === 'success') {
			
			if(result["success"] === true) {
				
				
				console.log("true aa gya");
				
				
				
				if(result["onBoard"] === true) {
					
					console.log("onboard hai");
					
					// 			console.log("jwt - ", result["data"]["token"]);
					
					let token = result["data"]["token"];
					localStorage.setItem("jwtToken", JSON.stringify(token));
					// 			// user is already onBoard
					
					setUpLoggedIn();
				}
				else if(result["onBoard"] === false) {
					
					console.log("onboard  naihi hai");
					let token = result["data"]["token"];
					localStorage.setItem("jwtToken", JSON.stringify(token));
					
					console.log("jtw -- ",token);
					setTimeout(function() {
						window.location.href = './onBoard.html';
					}, 5000);
					
					// 			// user need to be onBoard
				}
				// }
				else if(result["success"] === false) {
					
					console.log("success false");
					
					alert("Could not login, Try Again!")
					console.log(result);
				}
				else {
					alert("check logs and query");
				}
			}
			
			console.log(result);
			result["success"]
			console.log(status);
		},
		error: function(err) {
			console.log("error requesting login - ", err);
		}
	})
}