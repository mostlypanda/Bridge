$('#logged').hide();

function hideLoader() {
  $("#loader").attr("href", "clearcss");
  $("#overlay").addClass("d-none");
  $("#main-div").removeClass("d-none");
  $("#animation").attr("href", "./css/master.css");
};

hideLoader();

function showLoader() {
	$("#loader").attr("href", "./css/loader.css");
	$("#overlay").removeClass("d-none");
  $("#main-div").addClass("d-none");
	$("#animation").attr("href", "clearcss");
}

function onSignIn(googleUser) {
	var profile = googleUser.getBasicProfile();
	console.log('ID: ' + profile.getId()); // Do not send to your backend! Use an ID token instead.
	console.log('Name: ' + profile.getName());
	console.log('Image URL: ' + profile.getImageUrl());
	console.log('Email: ' + profile.getEmail()); // This is null if the 'email' scope is not present.
	console.log(profile.getName());
	console.log(googleUser.getAuthResponse().id_token);

	let token = googleUser.getAuthResponse().id_token;
	let name = profile.getName();

	// setUpPage(name);
	console.log(name);
	console.log($("#user"));
	$("#user").removeClass("d-none");
	console.log($("#user"));
	$("#user").children('h2').html("Welcome "+ name+ " to BRIDGE." );
	localStorage.setItem('userName', name);
	console.log(localStorage.getItem('userName'));

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

	showLoader();

	$.ajax({
		url: "https://us-central1-excaliburtut.cloudfunctions.net/api/login",
		type: "POST",
		data: {
			"idToken": token
		},
		success: function(result, status) {

			if(result["success"] === true) {

				if(result["onBoard"] === true) {

					let token = result["data"]["token"];
					localStorage.setItem("jwtToken", JSON.stringify(token));
					// user is already onBoard

					setUpLoggedIn();

					// loader bnd kr
					hideLoader();
				}
				else if(result["onBoard"] === false) {

					console.log("onboard  naihi hai");
					let token = result["data"]["token"];
					localStorage.setItem("jwtToken", JSON.stringify(token));

					console.log("jtw -- ",token);

					window.location.href = './onBoard.html';

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

// window.addEventListener('load', function() {
// 	hideLoader();
// })
