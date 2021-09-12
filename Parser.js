//
//const FR =  FileReader;
//FR.readAsText(".test.scroll")
//console.log(FR);
const tk = require('./Tokenizer.js');
const scope = require('./Scope.js');
const reader = require('./Reader');
class Parser {
    constructor() {

        this.tokenizer = new tk.Tokenizer(reader.scroll);
        this.scroll = new tk.Tokenizer();
        this.scope_list = [];
        this.exp_list = []
        this.the_scope = Object.create(scope.Scope);
    }

    structure_code() {
        // (this.tokenizer.readScroll());
        const stream = Object.create(reader.Reader).scroll;
        let scope_list = this.scope_list;


        let class_scopes =stream.toString().split("()").length;

               for(let items = 0; items < class_scopes; items ++) {

                   const class_scope = Object.create(scope.Scope);
                       let bd = stream.toString().split("()")[items].split("new").toString().split('.')[1];

                        class_scope.scope_name = bd;

                   bd = stream.toString().split("break")[items].toString().split(".")[1]
                    class_scope.body = bd;
                   //console.log(class_scope);
                //   console.log(class_scope.scope_name);

//                   newScope.scope_name = newScope.scope_name.toString().split(")")[0].toString().split('(')[0];

                        if (class_scope.scope_name && class_scope.body) {
                            class_scope.scope_name = class_scope.body.split("()")[0]
                            class_scope.body = class_scope.body.split("()")[1]
                            scope_list.push(class_scope);
                        }

               }


                for(let tk = 0; tk < stream.length; tk++) {



                    //Blueprint Declaration
                    if (stream[tk] === ".") {
//                         scope_list[0].scope_types.blueprint = true;
//                         scope_list[tk].scope_types.data_structure.name = true;

                    }

                    //End of Statement
                    if (stream[tk] === ";") {

                        let statement = Object.create(Statement);
                        statement.type.block = statement.type;
                       // console.log(statement.type.block)
                       //console.log( this.statement_list,'oij')
                    }

                };
               // const class_scope = scope.Scope;
                //class_scope.scope_name = this.tokenizer.token_match()[0];
                //class_scope.body = this.scope_list[0];

                return scope_list;
            }

};
Statement= {
    type:{
        name: "name",
        evals_to: 0,
        block: function (inp) {

        },

    },
};
const st = new Parser().structure_code();
//console.log(st)
module.exports ={Parser};
