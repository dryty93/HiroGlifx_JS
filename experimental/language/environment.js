'use strict';
class Environment {
 constructor(parent=null){this.parent=parent;this.values=new Map();}
 define(name,value){if(this.values.has(name))throw Error('Duplicate declaration '+name);this.values.set(name,value);return value;}
 get(name){if(this.values.has(name))return this.values.get(name);if(this.parent)return this.parent.get(name);throw Error('Undefined variable '+name);}
 assign(name,value){if(this.values.has(name)){this.values.set(name,value);return value;}if(this.parent)return this.parent.assign(name,value);throw Error('Undefined variable '+name);}
 child(){return new Environment(this);}
}
module.exports={Environment};
