//import std_lib from "std_lib"
const json_scroll=[{"name":"Iimports","val":"User~Server","type":"I","parent":"Main"},{"name":"&buyer","val":{"0":"$username=late","1":",$password=pass","2":",$email=em","3":",#age=19","name":"User","imported_as":"&buyer","body":",[$username;,$password;,$email;,#age;],:login<a~b~c>=[,echo:a+b;],:logout<a~b~c>=echo:a+b;,,break;,,,,","parent":"Main","value":["late","pass","em","19]"],"look_up":{"key":["$username","$password","$email","#age",""],"params":[{"key_name":"$username","value":"late"},{"key_name":"$password","value":"pass"},{"key_name":"$email","value":"em"},{"key_name":"#age","value":"19]"}]}},"type":"&","parent":"Main","vals":["late","pass","em","19"]},{"name":"&wsgi","val":{"0":"$username=late","1":",$password=pass","name":"Server","imported_as":"&wsgi","body":",[#port;,$host;],:start_server=echo\"K\";,,break;,","parent":"Main","value":["30","1270008000]"],"look_up":{"key":["#port","$host",""],"params":[{"key_name":"#port","value":"30"},{"key_name":"$host","value":"1270008000]"}]}},"type":"&","parent":"Main","vals":["30","1270008000"]},{"name":"#r","val":"3","type":"#","parent":"Main"},{"name":"$a","val":"'de'","type":"$","parent":"Main"},{"name":"[object Object]","type":"[","parent":"Main"},{"name":"[object Object]","type":"[","parent":"Main"}]

const copy_json_scroll= JSON.stringify(json_scroll)
const st = std_lib();
document.write(copy_json_scroll)
console.log(copy_json_scroll)
console.log(std_lib)
for (let i = 0; i < json_scroll.length; i++) {
    if (json_scroll[i].type===":") {

        console.log(json_scroll[i].type)
    }

}
