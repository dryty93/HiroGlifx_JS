const vm = require('./HG_VM');
const tk = require('./Tokenizer.js');
const reader = require('./Reader.js');
const fs = require("fs");


const HGVM = vm.new_HGVM;

let main_scope = [];
const new_object = {

    def_obj: {
        name: {
            value: "",
        }
    }
}

const eval_expr = {
    map_operator : {
        assign: "=",
        look_up : ">"

    }
}

const assign_attr_vals = function (obj_name,key, new_val) {
    obj_name.params = []
    obj_name.key = obj_name.key.toString().split(";");
    for (let k =0; k < obj_name.key.length; k++){
        if (obj_name.key[k].match(",")) {
            obj_name.key[k] = obj_name.key[k].split(",")[1]
        }
    }
    new_val.forEach(function callback(v,count) {

        if (obj_name.key.length  >= new_val.length) {
            obj_name.params.push({
                key_name: obj_name.key[count].match(",") ?
                    obj_name.key[count].split(",")[1] :
                    obj_name.key[count],
                value: v
            })

        }

    })

}
const get_obj_attributes = function (object, parent) {
        let attr_list = object.toString().split(";");
    for (let item =0; item < attr_list.length; item ++) {
            if (attr_list[item]!== "") {

                list_of_attrs.push(
                    {
                        key: attr_list[item].split("=")[0].toString().replace(",", " "),
                        value: attr_list[item].split("=")[1].toString().replace(",", "")
                    });

                new_object.def_obj = {
                    parent: parent,
                    attrs: list_of_attrs,
                }
            }

        }
        return new_object

};

for (let i = 0; i <= HGVM.nested_scopes.length; i++) {
        if (HGVM.nested_list[i].parent === 'Main') {


            main_scope.push(HGVM.nested_list[i]);


            if (HGVM.nested_list[i].type.match("&")){
            let obj = get_obj_attributes(HGVM.nested_list[i].val,HGVM.nested_list[i].scope_parent);

                copy.push(HGVM.nested_list[i].name.split("[").toString().replace(",", "."));
                obj.copy = copy;
                obj.key = HGVM.nested_list[i].name.split(">")[0];
                HGVM.nested_list[i].val= obj.def_obj
            }

        }

}
//let n =main_scope[1].val.attrs[0].value = "r"


const updateObjects =function() {
    HGVM.nested_list.forEach( (element, index) => {

                if (element.type === "&") {
                    let n = assign_attr_vals(HGVM.nested_list[index].val.look_up, HGVM.nested_list[index].val.look_up[index], HGVM.nested_list[index].val.value)


                }

        }

    )
}
//console.log(HGVM.nested_list[1].val.look_up)
updateObjects();

//console.log(HGVM.nested_list)
const scroll_as_json ="const json_scroll="+ JSON.stringify(HGVM.nested_list)+
    "\n" +
    "document.write(JSON.stringify(json_scroll))"

/*fs.writeFile('markup.js',scroll_as_json , function ()
{

    }

)
*/
