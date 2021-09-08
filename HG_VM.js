const the_parser = require("./Parser");
const parser = new the_parser.Parser();
const HGVM =
    {
    scopes: parser.structure_code(),
        body: function() {
            let list_of_expr= [];
            let  n = [];

            for (let scope_index = 0; scope_index < this.scopes.length; scope_index ++)
        {
            list_of_expr.push(this.scopes[scope_index].body);
            n.push(this.scopes.scope_name + " " + " " + parser.the_scope.dss_lib.assignment.data_struct_val(this.scopes[scope_index].body));
            //console.log(n)
            if (n.length >=0 ) {
               // console.log(n[scope_index])
            };
            if (scope_index >= this.scopes.length-1){
          return list_of_expr}
        }},

    }
;

const new_HGVM = Object.create(HGVM);
console.log(new_HGVM.scopes);
//console.log(new_HGVM.scopes.values)
