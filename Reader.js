const fs = require("fs");
const Stream = {
        scroll : fs.readFileSync('test.scroll').toString().split(" ").join("").toString().split("\n").toString()
            .split("\r").join("")};
const Reader = Object.create(Stream);

//console.log(Reader.scroll);
 module.exports = {Reader};
