
 const dss = require('./DSS_Lib.js');


const Scope = {
        scope_name: "",
        return_val: "",
        body : [],
        scope_types : dss.DeadSeaScrolls.declarations,
        dss_lib: dss.DeadSeaScrolls,
        nested_scopes: []
};

module.exports ={Scope};
