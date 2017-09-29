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
var lastDataTimestamp = curTime();
var handDetected = false;
var blockState = false;

var singelton = false;

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

// Songs array
var songs = [
    {path: "music/Blue_Danube_Waltz.mp3", color1: {r: 200, g: 139, b: 240}, color2: {r: 178, g: 150, b: 255}, baseBPM: 80},
    {path: "music/Game_of_Thrones.mp3", color1: {r: 255, g: 70, b: 0}, color2: {r: 255, g: 130, b: 0}, baseBPM: 70},
    {path: "music/Holberg_Suite.mp3", color1: {r: 130, g: 59, b: 196}, color2: {r: 106, g: 1, b: 254}, baseBPM: 135},
    {path: "music/Jurassic_Park.mp3", color1: {r: 186, g: 195, b: 60}, color2: {r: 207, g: 80, b: 48}, baseBPM: 95},
    {path: "music/Peer_Gynt_Suite_Morning.mp3", color1: {r: 185, g: 192, b: 236}, color2: {r: 0, g: 90, b: 149}, baseBPM: 72},
    {path: "music/Pirates_of_the_Caribbean.mp3", color1: {r: 169, g: 54, b: 103}, color2: {r: 0, g: 255, b: 255}, baseBPM: 115},
    {path: "music/Star_Wars_Theme.mp3", color1: {r: 255, g: 255, b: 255}, color2: {r: 49, g: 69, b: 162}, baseBPM: 90},
    {path: "music/Waltz_No2.mp3", color1: {r: 0, g: 182, b: 149}, color2: {r: 0, g: 113, b: 149}, baseBPM: 75},
    {path: "music/Waltz_of_the_Flowers.mp3", color1: {r: 214, g: 107, b: 149}, color2: {r: 112, g: 107, b: 149}, baseBPM: 75}
];

var currentSong = null;

// ------------------------------------------------
// ARDUINO CONTROLLER
// ------------------------------------------------

var strip = null;
var stripColor = [255,255,255];
var beatNumber = 0;
var rangerLimit = -1;
var FPS = 10;

var rangerSamples = [600,600,600,600,600, 600, 600, 600, 600, 600];
var rangerSampleCount = 10;

// 0 = Nothing | 1 = Instrument Warmup | 2 = Dirigent starting | 3 = Dirigent | 4 = Applause
var state = 0;

board.on("ready", function() {

	// ============= SETUP =============
	
	// LED
	var led = new five.Led(13); led.strobe(1000);

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
		if(rangerLimit == -1){
			rangerLimit = 100;
			console.log("SERVER: Ranger Limit:", this.cm);
		}
		
		rangerSamples.push(this.cm);
		if(rangerSamples.length > rangerSampleCount){
			rangerSamples.shift()
		}

	});

	// LED Strips
	strip.on("ready", function() {
		console.log("SERVER: LED Strip ready");
		dynamicRainbow(FPS); // 10 FPS
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
	var stripTimer = setTimeout(function(){

		if(isEven(beatNumber)){
			fadeStripColor(
				{r: currentSong.color1.r, g: currentSong.color1.g, b: currentSong.color1.b},
				{r: currentSong.color2.r, g: currentSong.color2.g, b: currentSong.color2.b},
			250);
		} else if(isOdd(beatNumber)){
			fadeStripColor(
				{r: currentSong.color2.r, g: currentSong.color2.g, b: currentSong.color2.b},
				{r: currentSong.color1.r, g: currentSong.color1.g, b: currentSong.color1.b},
			250);
		}


		if(state != 3){
			clearInterval(stripTimer);
		} else {
			stripBeat(ms);
		}

		console.log("stripBeat");

		beatNumber = beatNumber + 1;

	}, clientData.average);
}

function updateLights(delay){
	if(!singelton){
		var updateLightsTimer = setInterval(function(){

			for(var i = 0; i < strip.length; i++) {
				strip.pixel( i ).color(stripColor);
			}
			strip.show();

			if(state != 2 && state != 3 && !blockState){
				clearInterval(updateLightsTimer);
				singelton = false;
			}

			console.log("updateLights");

		}, 1000/delay)
	}
}

// Rainbow
function dynamicRainbow( delay ){
	var showColor;
	var cwi = 0;

	var rainbowTimer = setInterval(function(){
		if (++cwi > 255) {
			cwi = 0;
		}

		for(var i = 0; i < strip.length; i++) {
			showColor = colorWheel( ( cwi+i ) & 255 );
			strip.pixel( i ).color( showColor );
			stripColor = showColor;
		}
		strip.show();

		console.log("DynamicRain");

		if(state != 1){
			clearInterval(rainbowTimer);
		}

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
	return [r, g, b];
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

function curTime(){
	return Math.floor(Date.now() / 1000)
}

function getRange(){

	var avg = 0;

	for (i = 0; i < rangerSamples.length; i++){
		avg = avg + rangerSamples[i];
	}

	return avg/rangerSamples.length;
}

// ------------------------------------------------
// SOCKET CONTROLLER
// ------------------------------------------------

io.on('connection', function (socket) {
	console.log("Client Connected");

	// Set starting song
	socket.emit('changeAudio', "sounds/ambience.mp3");

	setState(1);

	// Get info from client
	socket.on('clientPackage', function (data) {
		clientData = data;
		lastDataTimestamp = curTime();
		handDetected = true;
	});

	function setState(s){
		state = s;
		socket.emit('stateUpdate', s);
		console.log("SERVER: State changed to", s);
	}

	// Situation checker each second
	
	setInterval(function(){

		// Make hand not detected if no informationw as detected for X seconds
		if(handDetected == true && lastDataTimestamp + 1 < curTime()){
			handDetected = false;
		}

		// If instrument warmup and someone is close to installation
		if(state == 1 && getRange() < rangerLimit && !blockState){
			setState(2);
			blockState = true;
			socket.emit('fadeStopAudio');
			setTimeout(function(){
				socket.emit('fadeStartAudio', {path: "sounds/ehem.mp3", bpm: 100});
			}, 2000)
			updateLights(FPS);
			fadeStripColor(
				{r: stripColor[0], g: stripColor[1], b: stripColor[2]},
				{r: 25, g: 25, b: 25},
			1500);
			setTimeout(function(){
				blockState = false;
			}, 1500);

		}

		// Detect if hand was over leap to start song
		if(state == 2 && handDetected && !blockState){
			setState(3);
			var lastSong = currentSong;
			currentSong = songs[Math.floor(Math.random()*songs.length)];

			// Don't make same song repeat directly after
			while(currentSong == lastSong){
				currentSong = songs[Math.floor(Math.random()*songs.length)];
			}

			socket.emit('fadeStartAudio', {path: currentSong.path, bpm: currentSong.baseBPM});
			stripBeat(2000);
		}

		// Reset to state 1 if person out of range
		if(state == 2 && getRange() >= rangerLimit && !blockState){
			setState(1);
			dynamicRainbow(FPS); // 10 FPS
			socket.emit('changeAudio', "sounds/ambience.mp3");
		}

		// Detect if hand is removed
		if(state == 3 && !handDetected && lastDataTimestamp + 1 < curTime()){
			setState(4);
			socket.emit('fadeStopAudio');
			setTimeout(function(){
				socket.emit('fadeStartAudio', {path: "sounds/applause.mp3", bpm: 100});
			}, 1500)
		}

		// After applause set back to instrument warmup (state 1)
		if(state == 4 && !blockState){
			blockState = true;
			setTimeout(function(){

				if(getRange() < rangerLimit){
					setState(2);
					fadeStripColor(
						{r: stripColor[0], g: stripColor[1], b: stripColor[2]},
						{r: 25, g: 25, b: 25},
					1500);
					setTimeout(function(){
						blockState = false;
					}, 1500);

				} else {
					setState(1);
					blockState = false;
					dynamicRainbow(FPS); // 10 FPS
					socket.emit('changeAudio', "sounds/ambience.mp3");
				}
				
			}, 12000)
		}

		console.log("STATE NOW", state, stripColor)

	}, 1000)
	

});