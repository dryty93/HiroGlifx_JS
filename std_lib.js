
const std_lib= {
js_lib: {
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
module.exports={std_lib};
