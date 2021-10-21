

const DeadSeaScrolls = {

    assignment :{
        data_struct_val: function (data_struct_unformated) {
            try {

                return data_struct_unformated.split("new").join("")
            }
            catch (e) {
             //   console.log(e)
            }
        },
        data_struct_name: function (data_struct_unformated) {
            return data_struct_unformated.toString().split("new").toString().split("=")[0]

        },



    },

    declarations: {

        data_structure: {
            name: "",
            is_bp: false,
            is_fun: false,
            is_var: false,

            type: function(statement){
                return statement.toString().split("=")[0].split("new")[0]
            },
            blueprint: {

                params: function (statement) {
                    let params = function (string_of_params) {
                        return string_of_params.toString().split(",");
                    }

                },

                bp_body:{
                    name: "",
                    value: function (item) {
                        console.log(item.toString().split(">").toString().split(","))

                    }
                }
            },

        },

        function: {

            fn_name: function (statement) {

                return statement.toString().split(":");
            },
            params: {
                has_params: false,
                function (statement) {
                    let params = function (string_of_params) {
                        return string_of_params.toString().split(",");
                    }
                },

            },
            variable: {
                type: {
                    int: false,
                    string: false,
                    bool: false,
                },
                name: function (statement) {
                    return statement.toString().split("=").toString()[0]
                },

                type: function(statement){
                    return statement.toString().split("=")[0].split("new")[0]
                },
                value: function(statement){
                        return statement.toString().split("=").toString()[1]


                },
            }
            }
        },

        genesis_functions: {


            write: function (write_this) {
                console.log(write_this);

            },
            if_statement: function (condition,exec)  {
                if (condition) {
                    for (let operations= 0; operations < exec.length; operations ++ ){
                        this.write(exec.split(",")[0].toString().split(":")[1])


                    }
                }
            },

        }
    }
module.exports ={DeadSeaScrolls};
