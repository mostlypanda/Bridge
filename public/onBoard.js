let token = JSON.parse(localStorage.getItem('jwtToken'));
console.log(token);

if(token === null || token === undefined) {
    window.location.href = "./login.html";
}

let lat;
let lon;
let addr;
let snm;

function clicked() {


    if(lat === undefined || lon === undefined) {
        alert("Could not get location!");
        return;
    }
    console.log(lat, lon);

    addr = $('#address').val().trim();
    snm = $('#shopName').val().trim();

    console.log(addr);
    console.log(snm);

    if(addr.length === 0) {
        alert("Please give address");
        return;
    }
    if(snm.length === 0) {
        alert("Please give your Shop Name");
        return;
    }

//     request(addr, snm);

    rqst2();
}


function rqst2() {

    console.log("in rqst");
    console.log(addr);
    console.log(snm);
    console.log(lat);
    console.log(lon);

    $.ajax({
        url: "http://localhost:5001/excaliburtut/us-central1/api/onBoard",
        type: "PUT",
        headers: {
            "Authorization": token,
            "Content-Type": "application/x-www-form-urlencoded"
        },
        data: {
            shopName: snm,
            address: addr,
            latitude: lat,
            longitude: lon
        },
        success: function(result, status) {

            if(status === 'success') {

                if(result["success"] === true) {

                    let newToken = result["data"]["token"];
                    localStorage.setItem('jwtToken', JSON.stringify(newToken));

                    window.location.href = "./login.html";

                }

            }
            console.log(result);
            console.log(status);

        },
        error: function(err) {

            if(err.status === 400) {
                alert("pass parameters");

                return;
            }

            if(err.status === 405) {
                alert("already onboard");
                return;
            }
            console.log("error occured");

        }

    })

}