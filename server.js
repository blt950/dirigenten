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
var five = require("johnny-five");
var board = new five.Board();
var pixel = require("node-pixel");

// Sockets
var app = require('http').createServer(handler);
var io = require('socket.io')(app);
var fs = require('fs');
var clientData = {average: 2000};

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
var stripColor = [255,255,255];
var beatNumber = 0;

board.on("ready", function() {

	// ============= SETUP =============
	
	// LED
	var led = new five.Led(13); led.strobe(2000);

	// Strip
	strip = new pixel.Strip({
		data: 3,
		length: 28, // number of pixels in the strip.
		board: this,
		controller: "FIRMATA"
	});


	// Proximity
	var proximity = new five.Proximity({
		controller: "MB1010",
		pin: "A1"
	});

	// ============= LOOPS =============
	
	// Proximity Sensor
	proximity.on("data", function() {
		clientData.ranger = this.cm;
	});

	// LED Strips
	strip.on("ready", function() {
		console.log("SERVER: LED Strip ready");

		for(var i = 0; i < strip.length; i++) {
			strip.pixel( i ).color("rgb(10,10,10)");
		}
		strip.show();

		dynamicRainbow(10); // FPS Argument
		//stripBeat(1000);
		//updateLights();
	});

});

// ------------------------------------------------
// LED FUNCTIONS
// ------------------------------------------------

// Beat fade

function fadeStripColor(start, end, duration) {
	var interval = 10;
	var steps = duration/interval;
	var step_u = 1.0/steps;
	var u = 0.0;
	var theInterval = setInterval(function(){
	
	if (u >= 1.0){ clearInterval(theInterval) }
	
	var r = parseInt(lerp(start.r, end.r, u));
	var g = parseInt(lerp(start.g, end.g, u));
	var b = parseInt(lerp(start.b, end.b, u));
	u += step_u;

	if(r<0){r=0}
	if(g<0){g=0}
	if(b<0){b=0}

	stripColor[0] = r;
	stripColor[1] = g;
	stripColor[2] = b;

  }, interval);
};

function stripBeat(ms){
	setTimeout(function(){

		if(isEven(beatNumber)){
			fadeStripColor({r: 255, g: 0, b: 0}, {r: 0, g: 255, b: 0}, 250);
		} else if(isOdd(beatNumber)){
			fadeStripColor({r: 0, g: 255, b: 0}, {r: 255, g: 0, b: 0}, 250);
		}

		stripBeat(ms);
		beatNumber = beatNumber + 1;

	}, clientData.average);
}

function updateLights(){
	setInterval(function(){
		for(var i = 0; i < strip.length; i++) {
			strip.pixel( i ).color(stripColor);
		}
		strip.show();
	}, 50)
}

// Rainbow

function dynamicRainbow( delay ){
	var showColor;
	var cwi = 0;
	var foo = setInterval(function(){
		if (++cwi > 255) {
			cwi = 0;
		}

		for(var i = 0; i < strip.length; i++) {
			showColor = colorWheel( ( cwi+i+5 ) & 255 );
			strip.pixel( i ).color( showColor );
		}
		strip.show();
	}, 1000/delay);
}

function colorWheel( WheelPos ){
	var r,g,b;
	WheelPos = 255 - WheelPos;

	if ( WheelPos < 85 ) {
		r = 255 - WheelPos * 3;
		g = 0;
		b = WheelPos * 3;
	} else if (WheelPos < 170) {
		WheelPos -= 85;
		r = 0;
		g = WheelPos * 3;
		b = 255 - WheelPos * 3;
	} else {
		WheelPos -= 170;
		r = WheelPos * 3;
		g = 255 - WheelPos * 3;
		b = 0;
	}
	return "rgb(" + r +"," + g + "," + b + ")";
}

// ------------------------------------------------
// OTHER FUNCTIONS
// ------------------------------------------------

function lerp(a,b,u) {
	return (1-u) * a + u * b;
};

function isEven(n) {
	return n % 2 == 0;
}

function isOdd(n) {
	return Math.abs(n % 2) == 1;
}

// ------------------------------------------------
// SOCKET CONTROLLER
// ------------------------------------------------

io.on('connection', function (socket) {
	console.log("Client Connected");
	socket.on('clientPackage', function (data) {
		clientData = data;
	});
});