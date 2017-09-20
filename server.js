/*

*
*	Dirigenten SERVER
*

*/

console.log("Dirigenten Server Initialized");

// ------------------------------------------------
// INITIALIZE
// ------------------------------------------------

// Arduino
var five = require("./node_modules/johnny-five/lib/johnny-five"),
arduino = new five.Board();

// Sockets
var app = require('http').createServer(handler)
var io = require('socket.io')(app);
var fs = require('fs');

app.listen(8080);

function handler(req, res) {
	fs.readFile(__dirname + '/index.html', function (err, data){
		if (err) {
			res.writeHead(500);
			return res.end('Error loading index.html');
		}

		res.writeHead(200);
		res.end(data);
	});
}

// ------------------------------------------------
// ARDUINO CONTROLLER
// ------------------------------------------------


arduino.on("ready", function() {
	var led = new five.Led(8);
	led.strobe(250);
});


// ------------------------------------------------
// SOCKET CONTROLLER
// ------------------------------------------------

io.on('connection', function (socket) {
	console.log("Client Connected");
	socket.on('volumeUpdate', function (data) {
		console.log(data);
	});
});