

//const file = require("File").FileReader;
class Tokenizer {
    constructor(stream) {
//        this.file = new File()
        this.stream = stream;
        this.total_chars = [];
        this.symbols = {

            syntax: {
                colon: ":",
                left_parenthesis: "(",
                right_parenthesis: ")",
                end_expr: ";",


            },

            numbers: {
                0: "0",
                1: "1",
                2: "2",
                3: "3",
                4: "4",
                5: "5",
                6: "6",
                7: "7",
                8: "8",
                9: "9",
            },

            control_flow: {
                statement_begin: "{",
                statement_end: "}",
                new_scope: ";,",
                end_scope: ";},"

            },
            keywords:
                {
                    if: "if",
                    write: "write",
                    break: "break",
                    loop: "loopThrough",
                    bp: ".",
                    in: "in",
                    def: "def",
                    dec: "dec",
                    create: "create",
                    new : "new",
                    fn: "fn",
                    echo:"echo",
                    return:"return",

                },


            operations: {

                add: "+",
                subtract: "-",
                assign: "=",
                multiply: "*",
                equal_to: "==",
                grtr_than: ">",
                less_than: "<",
            }

        }
    };


    getSymbols() {
        return this.symbols;
    }


    getAllChars() {
        return this.total_chars;
    }

    readScroll(){


      //  const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

   //     const scroll = new FileReader();


      //  let init_stream = scroll.readAsText("test.scroll").files[0];
    //    console.log(init_stream);

    };

    getChars() {
        //Converts stream into single chars or keywords
        let position = 0;
        const total_chars = this.getAllChars();
  //      console.log(total_chars)
        const stream = this.stream;
        const symbols = this.symbols;
      //  console.log(stream.length)
        while (position < stream.length) {
            //console.log(this.symbols.keywords)
            for (const key in symbols.keywords) {
                let space_needed = symbols.keywords[key].length;
               // console.log(stream[position] + stream[position+1])
                if (key.toString().includes(
                    (stream[position] + stream[position+1]))) {
                    if (key.toString().includes(
                    )) {
                     //   console.log(total_chars[position])
                        total_chars[position] = key;
                      //  console.log(total_chars)
                    }
                    //   this.total_chars[position] = stream.slice(posit);
                    position += space_needed;

                } else {
                    total_chars[position] = stream[position];

                }
            }

            position += 1;
        }

        return total_chars
    }
    findType(tk){
        const type_table = {

            syntax:
                {
                    state: false,
                    name: "",
                },
            keywords:
                {
                    state: false,
                    name: "",
                },
            operations: {
                state: false,
                name: "",
            },

            numbers: {
                state: false,
                name: "",
            },
            control_flow: {
                state: false,
                name: "",
            },
        };
        switch (tk) {

            case this.symbols.keywords[tk] === tk:
                type_table.keywords.state = true;
                type_table.keywords.name = tk;
         //       console.log(tk)
                break;

            case this.symbols.numbers[tk]===tk:
                type_table.numbers.state = true;
                type_table.numbers.name = tk;
             //   console.log(this.symbols.numbers[tk])
                break;

            case this.symbols.operations[tk]=tk:
                type_table.syntax.state = true;
                type_table.operations.name = tk;
                break;
            case this.symbols.control_flow[tk]=tk:
                type_table.syntax.state = true;
                type_table.numbers.name = tk;

                break;
            default:
             //   console.log("not found")
               // console.log(tk);


        }
        return type_table;
    }

    token_match() {
        const stream = this.getChars();
        const valid_tokens = [];
        const symbols = this.symbols;
        const syntax =Object.values(symbols.syntax);
        const keywords = Object.values(symbols.keywords);
        const operations = Object.values(symbols.operations);
        const numbers = Object.values(symbols.numbers);
        const control_flow = Object.values(symbols.control_flow)
        let tokens = 0;
        let stream_pos= 0;
        let symbol_table = {};
        let holder = [];
        let bp_name = "";

        while (stream.length >= tokens) {
            //  if (syntax[tokens] === stream[tokens]) {

            for (const items in keywords){
                if(keywords[items]=== stream[tokens]){
                    valid_tokens.push(keywords[items]);
                    let type = this.findType(keywords[items]);
                    symbol_table.content= {
                        "valid_tokens": valid_tokens,
                        "type": type.keywords,
                        "name": keywords[items]

                    };
                }
            }


            for(const items in syntax) {
                if (syntax[items] === stream[tokens]) {
                    valid_tokens.push(syntax[items]);
                 //   console.log(syntax[items]);
                    symbol_table.content= {
                        "valid_tokens": valid_tokens,
                        "type": syntax,
                 }}

            }

            for(const items in control_flow) {
                if (control_flow[items] === stream[tokens]) {
                    valid_tokens.push(control_flow[items]);
                    let type = this.findType(control_flow[items]);
                 //   console.log(type)

                }

            }
            for (let i =0; i < numbers.length; i++){
                //console.log(numbers[i],stream[tokens])
                if(numbers[i].toString() === (stream[tokens]))
                {
                    valid_tokens.push(numbers[i]);
                   // let type = this.findType(control_flow[i]);

                };
            }

            for (const items in operations){
                //  console.log(operations[items])
                if(operations[items]===stream[tokens]){
                    valid_tokens.push(operations[items]);
                    let type = this.findType(control_flow[items]);

                }
            }


            for (let i = 0; i < this.getChars().length; i++){
                if ("." === stream[i]){
                    //console.log(stream.toString().split(".").toString().split("("))


                    bp_name = stream.toString().split("(")[0].split(".")[1];
                    bp_name = bp_name.split(",").toString().trim();

                }

             //   console.log(this.getChars())
            }


            tokens += 1;
            if(stream_pos <= stream.length){
                stream_pos = stream.length-1
            }
            valid_tokens.push(holder);

        }


             bp_name = stream.toString().split("(")[0].split(".")[1];



        for (let n =0;n< bp_name; n++){
            if (bp_name[n].toString() !== ","){
                let char= bp_name[n];
                if (!bp_name.match(",").input.match(/^[0-9a-z]+$/)){
                    holder += "";

                }
                else {
                    holder += char;
                    console.log(holder)
                }
                if (holder.length <= bp_name.length) {
                    holder += char;

               //     console.log(holder.length, n,bp_name.length)
                }



            }
        //console.log(holder)
        }

           valid_tokens[0] = holder;
        return valid_tokens;
    }
}
module.exports ={Tokenizer};
