const the_parser = require("./Parser");
const parser = new the_parser.Parser();
const dss = require("./DSS_Lib");
const dss_lib = dss.DeadSeaScrolls;
const HGVM =
    {
        nested_list:[],
parse :parser,
scopes: parser.structure_code(),
        body: function() {
            let  list_of_expr = [];

            for (let scope_index = 0; scope_index < this.scopes.length; scope_index ++)
        {
            list_of_expr.push( parser.the_scope.dss_lib.assignment.data_struct_val(this.scopes[scope_index].body));
           // console.log(n)

            if (scope_index >= this.scopes.length-1){
          return list_of_expr}}
        },
        nested_scopes: {
            name: "",
            type:"",
            val:"",
            parent: "",
            nested_obj: {},
        }

    }
;

const new_HGVM = Object.create(HGVM);
for (let i = 0; i < new_HGVM.body().length; i++) {
    let statement = new_HGVM.body()[i].toString().split(";").toString().split(",");
    for (let s_index = 0; s_index < statement.length; s_index++) {
        new_HGVM.scopes[i].scope_name = new_HGVM.scopes[i].scope_name.split("=")[0]

        if (statement[s_index].length > 1) {
            new_HGVM.body()[i] = statement[s_index].toString()
            if (statement[s_index].toString().match("=")) {
                new_HGVM.nested_scopes.type = statement[s_index].split("=")[0].split("")[0];
                new_HGVM.nested_scopes.name = statement[s_index].split(new_HGVM.nested_scopes.type.toString())[1].split("").join("").split("=")[0];
                new_HGVM.nested_scopes.parent = new_HGVM.scopes[i].scope_name;
                new_HGVM.nested_scopes.val = statement[s_index].split("=")[1]
            }if (new_HGVM.nested_scopes.type === "#") {
                    try {
                        new_HGVM.nested_scopes.val = eval(statement[s_index].split("=")[1])
                    }
                    catch (e) {
                        if (statement[s_index].split("=")[1].toString() ===
                            new_HGVM.nested_scopes.val){
                            new_HGVM.nested_scopes.name = statement[s_index].split(new_HGVM.nested_scopes.type.toString())[1].split("").join("").split("=")[0];
                            let s = statement[s_index].split("=")[1]
                            for (let n = 0; n< s.length; n ++){

                                new_HGVM.nested_scopes.val = eval(new_HGVM.nested_scopes.nested_obj.val.toString() +"+" + statement[s_index].split("=").toString().split("+")[1])

                            }

                        //    new_HGVM.nested_scopes.val = new_HGVM.nested_scopes.nested_obj.val

                           // new_HGVM.nested_list.push(new_HGVM.nested_scopes.nested_obj)
                        }


                    }


            }
        if (new_HGVM.nested_scopes.nested_obj.name.toString().length >0){
        new_HGVM.nested_list.push(new_HGVM.nested_scopes.nested_obj)}

        }


                for (let sc = 0; sc < parser.scope_list.length; sc++) {
                        if (new_HGVM.nested_scopes.type.toString().match("&")) {
                            if(parser.scope_list[sc].scope_name.split("=")[0].toString().toLocaleLowerCase()===
                            new_HGVM.nested_scopes.name){
                                new_HGVM.nested_scopes.val = new_HGVM.body()[sc]
                            }
                        }
                    new_HGVM.nested_scopes.nested_obj = {
                        name: new_HGVM.nested_scopes.name,
                        type: new_HGVM.nested_scopes.type,
                        parent: new_HGVM.nested_scopes.parent,
                        val: new_HGVM.nested_scopes.val
                    };


                }

                if (statement[s_index].toString().match("is")) {
                    new_HGVM.nested_scopes.type = "?";
                    new_HGVM.nested_scopes.name = "is";

                    let exp = statement[s_index].toString().split("?")[0].toString().split("is")[1].toString()
                    let isTrrue = eval(exp);
                    let exps_exec = [];
                    let exp_to_exec = statement.toString().split("?")[1].split(";")
                    exp_to_exec = exp_to_exec[0].split(",");
                    for (let exp = 0; exp < exp_to_exec.length; exp++) {

                        if (exp_to_exec[exp].length > 0) {
                            exps_exec.push(exp_to_exec[exp])
                            //   exp_to_exec.splice(exp)
                        }
                    }
                    new_HGVM.nested_scopes.val = isTrrue;
                    new_HGVM.nested_scopes.parent = new_HGVM.scopes[i].scope_name;


                    new_HGVM.nested_scopes.nested_obj = {
                        name: new_HGVM.nested_scopes.name,
                        type: new_HGVM.nested_scopes.type,
                        parent: new_HGVM.nested_scopes.parent,
                        val: new_HGVM.nested_scopes.val,
                        exp_to_execute: exps_exec
                    };
                    new_HGVM.nested_list.push(new_HGVM.nested_scopes.nested_obj)



                }


    }

        }
        //

    for (let items = 0; new_HGVM.nested_list.length > items; items++) {
        if (new_HGVM.nested_list[items].parent.toString() === "Main") {
        //    console.log(new_HGVM.nested_list[items].name)//,new_HGVM.scopes)
        }
        else {
          //  console.log(new_HGVM.nested_list[items].name,'erogep')

        }
    }

console.log(new_HGVM.nested_list);
