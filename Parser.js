
const scope = require('./Scope.js');
const reader = require('./Reader');
class Parser {
    constructor() {
        this.scope_list = [];
        this.the_scope = Object.create(scope.Scope);
        this.import_mods = []
    }


    structure_code()
    {


        const stream = Object.create(reader.Reader).scroll;
        let scope_list = this.scope_list;

        let class_scopes =stream.toString().split("()").length;

               for(let items = 0; items < class_scopes; items ++) {

                   const class_scope = Object.create(scope.Scope);
                       let bd = stream.toString().split("()")[items].split("new").toString().split('.')[1];

                        class_scope.scope_name = bd;
                        //let imports = this.imported_modules();
                   bd = stream.toString().split("break")[items].toString().split(".")[1];
                    class_scope.body = bd;
                        if (class_scope.scope_name && class_scope.body) {
                            class_scope.scope_name = class_scope.body.split("()")[0];
                            class_scope.body = class_scope.body.split("()")[1].toString();
                            scope_list.push(class_scope);
                        }

               }


                for(let tk = 0; tk < stream.length; tk++) {



                    //Blueprint Declaration
                    if (stream[tk] === ".") {
//                         scope_list[0].scope_types.blueprint = true;
//                         scope_list[tk].scope_types.data_structure.name = true;

                    }

                    if (stream[tk] === "//"){
                        tk+=1
                        console.log(tk)
                    }

                    //End of Statement
                    if (stream[tk] === ";") {

                        let statement = Object.create(Statement);
                        statement.type.block = statement.type;
                    }

                };


               // const class_scope = scope.Scope;
                //class_scope.scope_name = this.tokenizer.token_match()[0];
                //class_scope.body = this.scope_list[0];

                return scope_list;
            }

    imported_modules (){
        let module_list = [];


            if (this.structure_code()[0].body.split("I").toString().split(";")[0].toString().split("=")[0].replace(",,","") === "imports") {
              //  console.log(this.structure_code())
                const new_reader = Object.create(reader.Reader);
                let mod_names  = this.structure_code()[0].body.split("&").toString().split(";")[0].toString().split("=")[1].toString().split("~")
                for (let items = 0; items < mod_names.length;items++){
                    let imported_module = new_reader.file(mod_names[items].toString() +".scroll")
                    module_list.push({
                       name: mod_names[items],
                        imported_as: "",
                        body: imported_module.split(")")[1],
                        parent:"Main",
                    })


                   //  this.scope_list[0].body += imported.imports.toString() + " "+ imported.body



            }
        }
        return module_list;

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
const st = new Parser();
//console.log(st.imported_modules())
module.exports ={Parser};
