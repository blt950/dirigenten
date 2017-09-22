# Dirigenten
INF5205 (Tangible) Dirigent

# Setup

### OSX

* Install Node.js >= 0.10.x
* Install Xcode
* Install node-gyp `npm install -g node-gyp`
* Install johnny-five interchange `npm install -g nodebots-interchange` (for using different FIRMATA)
* Execute `npm install` in terminal, this will install all required dependecies to the node_modules folder
* Execute `interchange install --interactive` to install NeoPixel firmware to Arduino.

# Running

`node server.js` in terminal
_Remember to have uploaded firmware.ino to the Arduino_ 

# Links
Johhny-Five: https://github.com/rwaldron/johnny-five/wiki/Getting-Started

Node-js LTS: https://nodejs.org/en/
