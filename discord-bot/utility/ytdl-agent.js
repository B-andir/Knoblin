const ytdl = require("@distube/ytdl-core");
const fs = require("fs");
const agentOptions = {
    pipelining: 5,
    maxRedirections: 2,
    localAddress: "192.168.1.120"
}

const agent = ytdl.createAgent(JSON.parse(fs.readFileSync("./utility/cookies.json")), agentOptions);

module.exports = {agent};