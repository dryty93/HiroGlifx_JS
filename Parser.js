//const fs = require("FileReader");
//const FR =  FileReader;
//FR.readAsText(".test.scroll")
//console.log(FR);
const tk = require('./Tokenizer.js');
const scope = require('./Scope.js');
//const reader = require('./fs')fs.FileReader;
class Parser {
    constructor() {

        this.tokenizer = new tk.Tokenizer(
            ".Add(){" +
                "new # a = 2; " +
                "new # b = 8; " +
                "new fn addUp = (a,b)=> " +
                    "new # amt = 2+3;" +
                    "echo amt;" +

            "  };" +

            ".Sub(){" +
            "new # q = 2-0;" +
            "new # l = 1; };," +
            ".Main()" +
            "{" +
            "new # m = 3;" +
            "}," +
            ".Mul(){" +
            "new # y = 2*1;" +
            " new x = 3;");
        this.scope_list = [];
        this.token_list = this.tokenizer.token_match();
        this.exp_list = []
        this.the_scope = Object.create(scope.Scope);
    }




    structure_code(){
       // (this.tokenizer.readScroll());
        const stream = this.tokenizer.stream;
        let statement_index = [];
        let scope_list = this.scope_list;


        let statement_amt =stream.toString().split("()").length;

       for(let items = 0; items < statement_amt; items ++) {

           const newScope = Object.create(scope.Scope);
           newScope.scope_name = stream.toString().split(".")[items].toString();
           try {


               newScope.body = newScope.scope_name.toString().split("{")[1].split(";").toString()
                   .replace("}"," ").replace(","," ");
           }
           catch (e) {

           }
           newScope.scope_name = newScope.scope_name.split("){")[0].split('(')[0];

           if( newScope.body && newScope.scope_name ){

               scope_list.push(newScope);
           }
       }


        for(let tk = 0; tk < scope_list.length; tk++) {
          //  console.log(scope_list[tk].body)



            //Blueprint Declaration
            if (stream[tk] === ".") {
                 scope_list[tk].scope_types.data_structure.is_bp = true;
               //  scope_list[tk].scope_types.data_structure.name = true;
                // console.log(stream.split("(){")[tk])

            }

            //End of Statement
            if (stream[tk] === ";") {

                let statement = Object.create(Statement);
                statement.type.block = statement.type;
                let block = this.token_list[tk];
              //  console.log(scope_list[tk].body);
                statement_index += block;
             //  console.log( this.statement_list,'oij')
            }

        };
       // const class_scope = scope.Scope;
        //class_scope.scope_name = this.tokenizer.token_match()[0];
        //class_scope.body = this.scope_list[0];

        return this.scope_list;
    }





};
Statement= {
    type:{
        name: "name",
        evals_to: 0,
        block: function (inp) {
            console.log('k')

        },

    },
};
module.exports ={Parser};
