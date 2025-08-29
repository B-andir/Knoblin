const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const events = require('event-client-lib');

require('dotenv').config();

const PORT_PATH = '/dev/cu.usbmodem3485187B1A6C2';
const BAUD = 9600;
// const port = new SerialPort({ path: '/dev/cu.usbmodem3485187B1A6C2', baudRate: 9600 });
// const parser = port.pipe(new ReadlineParser({ deliminer: '\n' }));

let port, parser;
let seq = 0;
let lastPong = Date.now();
let reopenTimer = null;
let ctrlLEDOpts = [];

function openPort() {
    clearTimeout(reopenTimer);
    port = new SerialPort({ path: PORT_PATH, baudRate: BAUD, autoOpen: false });
    parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

    parser.on('data', onData);

    port.on('error', onPortError);
    port.on('close', onPortClose);
    port.on('open', onPortOpen);
    
    port.open(async err => { 
        if (err) {
            scheduleReopen(); 
            return;
        }
    });
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function onData(string)  {
    if (string.startsWith("PONG ")) {
        lastPong = Date.now();
        return;
    }

    if (string.startsWith("Debug")) {
        console.log(string);
        return;
    }

    if (string.startsWith("Echo:") || string.startsWith("System:")) {
        console.log(`Arduino ${string}`);
    } else if (string.startsWith('{')) {
        try {
            const data = JSON.parse(string);
            console.log(data);

            if (data.event == "click") {
                // if (data.btn == 0) port.write("fade 0 252 204 15 150 80 2000 2000" + "\n", err => { if (err) console.error(err); });
                // else if (data.btn == 1) port.write("fade 1 204 32 35 150 80 2000 2000" + "\n", err => { if (err) console.error(err); });
                events.emit('IOButtonClicked', { button: data.btn });
            } else if (data.event == "doubleClick") {
                events.emit('IOButtonDoubleClicked', { button: data.btn });
            } else if (data.event == "rotation") {
                // fade ledIndex r g f brightLevel dimLevel holdMs fadeMs
                // rgb for color only! brightLevel 0-255 determines starting brightness, dimLevel brightness after fadeOut
                // if (data.encoder == 0) {
                //     rValue += data.value * 3;
                //     port.write("fade 0 148 209 35 200 80 3000 2000" + "\n", err => { if (err) console.error(err); });
                //     // await delay(20);
                //     port.write("meter " + rValue + "\n", err => {if (err) console.error(err); });
                // } else if (data.encoder == 1) {
                //     port.write("fade 1 121 34 183 200 80 3000 2000" + "\n", err => { if (err) console.error(err); });
                // } 

                events.emit('IOEncoderRotation', { encoder: data.encoder, rotation: data.value})
            } else if (data.event == "buttonDown") {
                port.write("meter 100.0\n", err => {if (err) console.error(err); });
                events.emit('IOButtonDown', { button: data.btn });
            } else if (data.event == "buttonUp") {
                port.write("meter 0.0\n", err => {if (err) console.error(err); });
                events.emit('IOButtonUp', { button: data.btn });
            }
        } catch (err) {
            console.error(`Error when reading JSON data!\nData: ${string}\nError: ${err}`);
        }
    } else {
        console.log("From Arduino: " + string);
        // const data = parseKeyValueString(string);
        // // DEPRECATED
        // // Data is now sent in JSON format
        // if (data) {
        //     const volume1Change = data.Rotary1;
        //     const volume2Change = data.Rotary2;
        //     const button1Down = data.Button1State;
        //     const button2Down = data.Button2State;
        //     const button1Click = data.Button1Click;
        //     const button2Click = data.Button2Click;
    
        //     if (volume1Change !== 0.00) {
        //         console.log(`Volume 1 change: ${volume1Change}`);
        //         // fade ledIndex r g f brightLevel dimLevel holdMs fadeMs
        //         // rgb for color only! brightLevel 0-255 determines starting brightness, dimLevel brightness after fadeOut
        //         port.write("fade 0 255 0 255 150 80 4000 2000" + "\n", err => { if (err) console.error(err); });
        //     }
    
        //     if (volume2Change !== 0.00) {
        //         console.log(`Volume 2 change: ${volume2Change}`);
        //         port.write("fade 0 255 0 128 200 80 4000 2000" + "\n", err => { if (err) console.error(err); });
        //     }
    
        //     if (button1Down === 1) {
        //         console.log("Button 1 Is Down");
        //     }
    
        //     if (button2Down === 1) {
        //         console.log("Button 2 Is Down");
        //     }
    
        //     if (button1Click === 1) {
        //         console.log("Button 1 Clicked!");
        //         ledOn = !ledOn;
        //         port.write("fade 0 154 232 30 150 80 4000 2000" + "\n", err => { if (err) console.error(err); });
        //     } else if (button1Click === 2) {
        //         console.log("Button 1 Double-clicked!");
        //     }
    
        //     if (button2Click === 1) {
        //         console.log("Button 2 Clicked!");
        //         port.write("fade 0 34 183 121 150 80 4000 2000" + "\n", err => { if (err) console.error(err); });
        //     } else if (button2Click === 2) {
        //         console.log("Button 2 Double-clicked!");
        //     }
        // } else {
        //     console.error('Unexpected string format: ', string);
        // }
    }
}

async function onPortOpen() {
    console.log("Serial Port Opened");

    events.connectToEventServer('Hardware_IO');

    // Startup "Animation"
    port.write("fade 0 117 160 17 0 180 0 1000" + "\n", err => { if (err) console.error(err); });
    port.write("fade 1 117 160 17 0 180 0 1000" + "\n", err => { if (err) console.error(err); });
    port.write("meter 10" + "\n", err => { if (err) console.error(err); });
    await delay(100);
    port.write("meter 30" + "\n", err => { if (err) console.error(err); });
    await delay(100);
    port.write("meter 50" + "\n", err => { if (err) console.error(err); });
    await delay(100);
    port.write("meter 70" + "\n", err => { if (err) console.error(err); });
    await delay(100);
    port.write("meter 90" + "\n", err => { if (err) console.error(err); });
    await delay(600);
    port.write("fade 0 117 160 17 180 0 0 500" + "\n", err => { if (err) console.error(err); });
    port.write("fade 1 117 160 17 180 0 0 500" + "\n", err => { if (err) console.error(err); });
    await delay(500);
    port.write("meter 0" + "\n", err => { if (err) console.error(err); });
}

function onPortError(err) {
    console.error('SERIAL ERROR', err?.message || err);
}

function onPortClose() {
    console.warn('SERIAL CLOSED');
    scheduleReopen();
}

function scheduleReopen() {
    if (reopenTimer) return;
    reopenTimer = setTimeout(() => {
        reopenTimer = null;
        try { port?.removeAllListeners(); } catch {}
        openPort();
    }, 1000);
}

// Heartbeat + stale detection
setInterval(() => {
    if (!port?.isOpen) return;
    try {
        let msg = `PING ${seq++}`;
        msg += "\n";
        port.write(msg);
    } catch (err) {
        console.error('ping write fail', err);
    }

    if (Date.now() - lastPong > 3000) {
        lastPong = Date.now();
        console.warn('No PONG; cycling port');
        try { port.close(); } catch{}
    }
}, 1000);

openPort();