const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const events = require('event-client-lib');

require('dotenv').config();

const BAUD = 9600;

const TARGETS = [
    { vendorId: '2341', productId: '0070' },
];

let port, parser;
let seq = 0;
let lastPong = Date.now();
let reopenTimer = null;

class Channel {
    static ButtonState = Object.freeze({
        UP: "up",
        DOWN: "down"
    });

    constructor(index, channel = null, r = 0, g = 0, b = 0) {
        this.index = index;
        this.channel = channel || index;
        this.buttonState = Channel.ButtonState.UP;  // default
        this.r = r;
        this.g = g;
        this.b = b;

        console.log(`Registered channel of index ${this.index} to audio channel ${this.channel}`)
    }

    SetRGB(r, g, b) {
        this.r = r;
        this.g = g;
        this.b = b;
    }

    GetRGB() {
        return {
            r: this.r, 
            g: this.g, 
            b: this.b
        }
    }

    SetChannel(channel) {
        this.channel = channel;
        console.log(`Set channel of index ${this.index} to audio channel ${this.channel}`)
    }

    GetChannel() {
        return this.channel;
    }

    SetButtonState(state) {
        if (Object.values(Channel.ButtonState).includes(state)) {
            this.buttonState = state;
        } else {
            throw new Error("Invalid button state!");
        }
    }

    IsButtonState(state) {
        return this.buttonState === state;
    }
}

let channels = [new Channel(0), new Channel(1)];

function looksLikeTarget(p) {
    const vid = (p.vendorId || '').toLowerCase();
    const pid = (p.productId || '').toLowerCase();
    return TARGETS.some(t => t.vendorId === vid && t.productId === pid)
        || /arduino|wch|silabs|usb serial/i.test(p.manufacturer || '');
}

async function findCandidatePorts() {
    const ports = await SerialPort.list();
    return ports.filter(looksLikeTarget);
}

async function tryHandshake(path) {
    return new Promise((resolve) => {
        const port = new SerialPort({ path, baudRate: BAUD, autoOpen: false });
        let resolved = false;
        port.open(err => {
            if (err) return resolve(false);

            port.write('HELLO?\n');

            const timeout = setTimeout(() => {
                if (!resolved) { resolved = true; port.close(() => resolve(false)); }
            }, 1200);

            port.on('data', buf => {
                const s = buf.toString('utf8');
                if (/^OK:NANO_ESP32_KNOBLIN\b/.test(s)) {
                    clearTimeout(timeout);
                    if (!resolved) { resolved = true; resolve(port); }  // keep it open
                }
            });

            port.on('error', () => {
                if (!resolved) { resolved = true; resolve(false); }
            });

            port.on('close', () => {
                if (!resolved) { resolved = true; resolve(false); }
            })
        })
    });
}

async function connectArduino() {
    const candidates = await findCandidatePorts();

    candidates.sort((a,b) => (b.serialNumber?1:0) - (a.serialNumber?1:0));

    for (const c of candidates) {
        const port = await tryHandshake(c.path);
        if (port) {
            console.log('Connected to Arduino at ', c.path, c.friendlyName || c.manufacturer || '');
            return port;
        }
    }
}

async function openPort() {
    clearTimeout(reopenTimer);

    port = await connectArduino();

    if (port) {
        parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

        console.log("!!!!!!!!!!!!!");

        parser.on('data', onData);

        port.on('error', onPortError);
        port.on('close', onPortClose);

        onPortOpen();
    } else {
        scheduleReopen(); 
        return;
    }
    
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

            if (data.event == "click") {
                lastButtonClickIndex = data.btn;
                events.emit('IO-button-clicked', { 
                    button: data.btn,
                    channel: channels[data.btn]
                });
            } else if (data.event == "doubleClick") {
                events.emit('IO-button-double-clicked', { 
                    button: data.btn,
                    channel: channels[data.btn]
                });
            } else if (data.event == "rotation") {
                events.emit('IO-encoder-rotation', { 
                    encoder: data.encoder, 
                    channel: channels[data.encoder.channel], 
                    rotation: data.value, 
                    isButtonDown: channels[data.encoder].IsButtonState(Channel.ButtonState.DOWN)
                });
            } else if (data.event == "buttonDown") {
                channels[data.btn].SetButtonState(Channel.ButtonState.DOWN);
                events.emit('IO-button-down', { button: data.btn });
            } else if (data.event == "buttonUp") {
                channels[data.btn].SetButtonState(Channel.ButtonState.UP);
                events.emit('IO-button-up', { button: data.btn });
            }
        } catch (err) {
            console.error(`Error when reading JSON data!\nData: ${string}\nError: ${err}`);
        }
    }
}

async function onPortOpen() {
    console.log("Serial Port Opened");

    events.connectToEventServer('Hardware_IO');

    // Startup "Animation"
    // Fade: fade channel red green blue startBrightness endBrightness delay fadeTime
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



    events.on("new-volume", (data) => {
        let channel = channels.find(obj => obj.GetChannel() === data.channel);
        if (channel) {
            port.write(`fade ${channel.index} ${channel.r} ${channel.g} ${channel.b} 200 80 1200 800 \n`, err => { if (err) console.error(err); });
            port.write("meter " + data.volume + "\n", err => {if (err) console.error(err); });
        }
        
    });

    events.on("new-channel-selected", (data) => {
        let channel = channels[data.btn];
        channel.SetChannel(data.channel);
        channel.SetRGB(data.rgb.r, data.rgb.g, data.rgb.b);

        port.write(`fade ${channel.index} ${channel.r} ${channel.g} ${channel.b} 200 80 2500 1500 \n`, err => { if (err) console.error(err); });
        port.write(`meter ${data.volume} \n`, err => { if (err) console.error(err); });
    });
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

// Uncomment to turn the example handler on
require('./exampleHandler');

openPort();
console.log("[HARDWARE OK]");