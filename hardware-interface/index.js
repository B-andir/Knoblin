const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

const port = new SerialPort({ path: '/dev/cu.usbmodem142201', baudRate: 19200 });
const parser = port.pipe(new ReadlineParser({ deliminer: '\n' }));

parser.on('data', (data) => {
    const parts = data.trim().split(',');
    if (parts.length === 3) {
        const volumeChange = parseFloat(parts[0]);
        const buttonDown = parseInt(parts[1], 10);
        const buttonClick = parseInt(parts[2], 10);

        if (volumeChange !== 0.00) {
            console.log(volumeChange);
        }

        if (buttonDown === 1) {
            console.log("Button Is Down");
        } else if (buttonDown === -1) {
            console.log("Button Is Up");
        }

        if (buttonClick === 1) {
            console.log("Button Clicked!");
        } else if (buttonClick === 2) {
            console.log("Button Double-clicked!");
        }
    } else {
        console.error('Unexpected data format: ', data);
    }
});