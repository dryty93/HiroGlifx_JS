const fs = require("fs");
//const dss = require("DSS_Lib");
const Stream = {
        scroll : fs.readFileSync('test.scroll').toString().split(" ").join("").toString().split("\n").toString()
            .split("\r").join("")};
const Reader = Object.create(Stream);

//console.log(Reader.scroll);
 module.exports = {Reader};
