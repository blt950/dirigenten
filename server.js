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
var five = require("./node_modules/johnny-five"),
board = new five.Board();
var pixel = require("./node_modules/node-pixel");

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

var strip = null;

board.on("ready", function() {

	var led = new five.Led(8);
	led.strobe(250);
	
	strip = new pixel.Strip({
		board: this,
		controller: "FIRMATA",
		strips: [ {pin: 6, length: 9}, ],
		gamma: 2.8,
	});

	strip.on("ready", function(){

		strip.color("red");
		strip.show();

	});

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