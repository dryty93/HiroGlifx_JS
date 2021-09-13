


class Tokenizer {
    constructor(stream) {
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

        };
    };




    getSymbols() {
        return this.symbols;
    }


    getAllChars() {
        return this.total_chars;
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

    token_match(reader) {
        const valid_tokens = [];
        const symbols = this.symbols;
        const syntax =Object.values(symbols.syntax);
        const keywords = Object.values(symbols.keywords);
        const operations = Object.values(symbols.operations);
        const numbers = Object.values(symbols.numbers);
        const control_flow = Object.values(symbols.control_flow);
        let tokens = 0;
        let stream_pos= 0;
        let symbol_table = {};
        let holder = [];
        let bp_name = "";


        for (let n =0;n< reader.length; n++){
            if (bp_name[n].toString() === ""){
                let char= bp_name[n];
                if (!bp_name.match(",").input.match(/^[0-9a-z]+$/)){
                    holder += "";

                }
                else {
                    holder += char;
                    //console.log(holder)
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
