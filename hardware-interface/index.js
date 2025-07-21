const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

const port = new SerialPort({ path: '/dev/cu.usbmodem3485187B1A6C2', baudRate: 9600 });
const parser = port.pipe(new ReadlineParser({ deliminer: '\n' }));

let ledOn = false;

function parseKeyValueString(s) {
    return Object.fromEntries(
        s
            .trim()
            .split(/[;,]\s*/)
            .filter(pair => pair.length)
            .map(pair => {
                const [key, raw] = pair.split('=');
                const num = Number(raw);
                return [ key, isNaN(num) ? raw : num ];
            })
    );
}

let rValue = 0;
parser.on('data', (string) => {
    if (string.startsWith("Echo:") || string.startsWith("System:")) {
        console.log(`Arduino ${string}`);
    } else if (string.startsWith('{')) {
        try {
            const data = JSON.parse(string);
            console.log(data);

            if (data.event == "click") {
                if (data.btn == 0) port.write("fade 0 255 0 255 150 80 4000 2000" + "\n", err => { if (err) console.error(err); });
                else if (data.btn == 1) port.write("fade 1 154 232 30 150 80 4000 2000" + "\n", err => { if (err) console.error(err); });
            } else if (data.event == "rotation") {
                if (data.encoder == 0) {
                    port.write("fade 0 148 209 35 200 80 4000 2000" + "\n", err => { if (err) console.error(err); });
                } else if (data.encoder == 1) {
                    port.write("fade 1 121 34 183 200 80 4000 2000" + "\n", err => { if (err) console.error(err); });
                }
            }
        } catch (err) {
            console.error(`Error when reading JSON data!\nData: ${string}\nError: ${err}`);
        }
    } else {
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
});