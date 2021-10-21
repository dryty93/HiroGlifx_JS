const the_parser = require("./Parser");
const parser = new the_parser.Parser();
const dss = require("./DSS_Lib");

const HGVM =
    {
        dead_sea_scrolls: dss.DeadSeaScrolls,
        nested_list:[],

parse :parser,
        statement_list: {
            line_num: "",
            statement: "",
            all_statements: []
        },
        imported_modules: parser.imported_modules(),
scopes: parser.structure_code(),

        body: function() {
            let  list_of_expr = [];
            list_of_expr.push(this.scopes[0].body)

                for (let scope_index = 0; scope_index < this.scopes.length; scope_index ++) {

                    //list_of_expr.push(this.scopes[0].body.toString().split(",,,,")[0])
                   // console.log(this.imported_modules.length)
                     try{
                         list_of_expr.push({
                             name: this.imported_modules[scope_index].name,
                             body: this.imported_modules[scope_index].body

                     }
                         )
                     }

                     catch (e) {

                     }
                }
             //   console.log(list_of_expr)
                return list_of_expr}

        ,
        nested_scopes: {
            name: "",
            type:"",
            val:"",
            parent: "",
            nested_obj: {},
                    },

 }

;

const new_HGVM = Object.create(HGVM);
let imports = new_HGVM.parse.imported_modules();

const create_statement_list = function() {
    let document = new_HGVM.body().toString().split(";").toString().split(",");
    for (let lines = 0; lines < document.length; lines++)
        if (document[lines].length > 2) {
            new_HGVM.statement_list.all_statements.push(document[lines])
        }

    let statement = new_HGVM.statement_list.all_statements;
        return statement
}
const create_expressions = function (body) {

    //This for loop makes the vm go through each scope and find statements

        //s_index represents the amount of statements in a scope
        for (let s_index = 0; s_index < body.length; s_index++) {

            new_HGVM.nested_scopes.type = body[s_index].split("=")[0].split("")[0];
            new_HGVM.nested_scopes.val = body[s_index].split("=")[1];
            new_HGVM.nested_scopes.name = body[s_index].split("=")[0];
            new_HGVM.nested_scopes.parent = "Main";
            new_HGVM.nested_scopes.nested_obj = {
                name: new_HGVM.nested_scopes.name,
                val: new_HGVM.nested_scopes.val,
                type: new_HGVM.nested_scopes.type,
                parent: new_HGVM.nested_scopes.parent
            }
            if (new_HGVM.nested_scopes.type==="&") {

                HGVM.nested_scopes.nested_obj = create_bp_copy(new_HGVM.nested_scopes.nested_obj);

                HGVM.nested_scopes.nested_obj.val = imports[s_index - 1]


                HGVM.nested_scopes.nested_obj.val.imported_as = statement_list[s_index].split("=")[0].toString().split("[")[0]
                HGVM.nested_scopes.nested_obj.val.value = statement_list[s_index].split("=")[0].toString().split("[")[1].split("~")
                let new_key =HGVM.nested_scopes.nested_obj.val.body.split("]")[0].split("[").toString().replace(",,","")
                //console.log(new_key[0])
                for (let k_index = 0 ; k_index < new_key.length; k_index++) {
                    if (! new_key[k_index].split("\n") < 2) {
                        new_key[k_index] = new_key[k_index]
                    }
                }
                let aKey = new_key
                HGVM.nested_scopes.nested_obj.val.look_up = {
                    key: aKey,
                }
                  //  console.log(statement_list[s_index])
            }

                new_HGVM.nested_list.push(new_HGVM.nested_scopes.nested_obj)

//Function declaration


    }
    return new_HGVM.nested_list

}


let statement_list = create_statement_list();
const create_bp_copy = function(s_list){
        try {
            new_HGVM.nested_scopes.val = s_list

        }
    catch{}
    return new_HGVM.nested_scopes.val

}



let syntax_tree = create_expressions(statement_list);
let values = []
let bp_look_up_list = []

for (let node_index = 0; node_index < syntax_tree.length; node_index ++) {

        let a_node = syntax_tree[node_index];


        if (a_node.type.toString()==="&"){
            a_node.vals = a_node.name.toString().split("[")[1].split("]")[0].split("~")
            a_node.name = a_node.name.toString().split("[")[0]
            let a_val =a_node.val.toString().split("~");
            //console.log(a_node.vals)
            let k_list =a_node.val.look_up.key.split(";")
            for (let i=0; i < k_list.length; i++){
                if (k_list[i].length > 1){
                values.push({
                    obj: k_list[i].toString() + "=" + a_node.vals[i]
                })
                    a_node.val[i] = values[i].obj
                 //   console.log(a_node.val,'ppik')

                }}


}
    }


module.exports ={new_HGVM};
