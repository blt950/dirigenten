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

var fps = 5;

board.on("ready", function() {

	var led = new five.Led(8);
	led.strobe(250);
	
    // setup the node-pixel strip.
    strip = new pixel.Strip({
        data: 6,
        length: 30, // number of pixels in the strip.
        board: this,
        controller: "FIRMATA"
    });

    strip.on("ready", function() {
        console.log("Strip ready, let's go");
        dynamicRainbow(fps);
    });

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
		console.log(data);
	});
});