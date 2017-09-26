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

var fps = 5;

board.on("ready", function() {

	var led = new five.Led(8);
	led.strobe(2000);

	button = new five.Button(2);
	button.on("down", function() {
		console.log("click");
	});

	/*
	var proximity = new five.Proximity({
		controller: "MB1000",
		pin: "A1"
	});

	proximity.on("data", function() {
		console.log("cm: ", this.cm);
	});
	*/
	
	lerp = function(a,b,u) {
		return (1-u) * a + u * b;
	};

	var c = [255,255,255];
	
	fade = function(start, end, duration) {
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

		c[0] = r;
		c[1] = g;
		c[2] = b;

		console.log("fade", c);

	  }, interval);
	};

	var beatNumber = 0;
	function stripBeat(ms){

		setTimeout(function(){

			if(isEven(beatNumber)){
				fade({r: 255, g: 0, b: 0}, {r: 0, g: 255, b: 0}, 500);
			} else if(isOdd(beatNumber)){
				fade({r: 0, g: 255, b: 0}, {r: 255, g: 0, b: 0}, 500);
			}

			console.log("beat " + beatNumber);

			stripBeat(ms);
			beatNumber = beatNumber + 1;

		}, clientData.average);

	}

	// setup the node-pixel strip.
	strip = new pixel.Strip({
		data: 6,
		length: 5, // number of pixels in the strip.
		board: this,
		controller: "FIRMATA"
	});

	strip.on("ready", function() {
		console.log("Strip ready, let's go");
		//dynamicRainbow(fps);
		stripBeat(1000);
		updateLights();
	});

	function updateLights(){
		setInterval(function(){
			for(var i = 0; i < strip.length; i++) {
				strip.pixel( i ).color(c);
			}
			strip.show();
		}, 50)
	}

	

	function isEven(n) {
		return n % 2 == 0;
	}

	function isOdd(n) {
		return Math.abs(n % 2) == 1;
	}

	function dynamicRainbow( delay ){
		console.log( 'dynamicRainbow' );

		var showColor;
		var cwi = 0; // colour wheel index (current position on colour wheel)
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

	// Input a value 0 to 255 to get a color value.
	// The colors are a transition r - g - b - back to r.
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
		// returns a string with the rgb value to be used as the parameter
		return "rgb(" + r +"," + g + "," + b + ")";
	}

});


// ------------------------------------------------
// SOCKET CONTROLLER
// ------------------------------------------------

io.on('connection', function (socket) {
	console.log("Client Connected");
	socket.on('clientPackage', function (data) {
		clientData = data;
		console.log(data);
	});
});