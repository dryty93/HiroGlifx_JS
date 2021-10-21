const fs = require("fs");
const Stream = {
        file:
            function(read_me){
                let scroll =  fs.readFileSync(read_me).toString().split(" ").join("").toString().split("\n").toString()
                    .split("\r").join("");
                return scroll

        },
        scroll : fs.readFileSync('test.scroll').toString().split(" ").join("").toString().split("\n").toString()
            .split("\r").join(""),
        all_lines : fs.readFileSync('test.scroll').toString().split("\n"),
        count_lines: fs.readFileSync('test.scroll').toString().split("\n").length -1
};
const Reader = Object.create(Stream);
 module.exports = {Reader};
