const events = require('event-client-lib');

function Log(string) {
    console.log("ExampleHandler: " + string);
}

(() => {
    Log("Started!");
    
    events.connectToEventServer('ExampleIOHandler');

    events.on('IO-encoder-rotation', HandleRotation);
    events.on('IO-button-clicked', HandleClick);
    events.on('IO-button-double-clicked', HandleDoubleClick);
})();

function HandleRotation(data) {
    Log(`Rotation occured! Encoder: ${data.encoder}, rotation: ${data.rotation}, isButtonDown: ${data.isButtonDown}`);
}

function HandleClick(data) {
    Log(`Click occured! Button: ${data.button}`)
}

function HandleDoubleClick(data) {
    Log(`Double click occured! Button: ${data.button}`)
}