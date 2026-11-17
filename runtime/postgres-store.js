"use strict";
/** Postgres-backed collection store. Inject an existing pg Pool; no arbitrary SQL names. */
const crypto=require("node:crypto");
const COLLECTION=/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/;
function name(value){if(typeof value!=="string"||!COLLECTION.test(value))throw new Error("Invalid collection name");return value;}
function fields(value){
  if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("Record must be an object");
  const keys=Object.keys(value);
  if(keys.length>50||JSON.stringify(value).length>16000)throw new Error("Record too large");
  if(keys.some(k=>["__proto__","constructor","prototype"].includes(k)))throw new Error("Forbidden property");
  const {id,owner_id,...data}=value;
  return data;
}
class PostgresStore{
  constructor(pool){if(!pool||typeof pool.query!=="function")throw new Error("A pg Pool is required");this.pool=pool;}
  async migrate(){
    await this.pool.query(`CREATE TABLE IF NOT EXISTS hg_collections (
      name VARCHAR(64) PRIMARY KEY
    )`);
    await this.pool.query(`CREATE TABLE IF NOT EXISTS hg_records (
      id UUID PRIMARY KEY,
      collection VARCHAR(64) NOT NULL REFERENCES hg_collections(name),
      owner_id VARCHAR(64) NOT NULL,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
    await this.pool.query("CREATE INDEX IF NOT EXISTS hg_records_owner_idx ON hg_records (collection, owner_id, created_at)");
  }
  async create(collection){
    const id=name(collection);
    await this.pool.query("INSERT INTO hg_collections (name) VALUES ($1) ON CONFLICT DO NOTHING",[id]);
  }
  async exists(collection){
    const result=await this.pool.query("SELECT 1 FROM hg_collections WHERE name = $1",[name(collection)]);
    return result.rows.length>0;
  }
  async list(collection,owner){
    const result=await this.pool.query(
      "SELECT id, payload, created_at FROM hg_records WHERE collection = $1 AND owner_id = $2 ORDER BY created_at, id",
      [name(collection),owner]
    );
    return result.rows.map(row=>({...row.payload,id:row.id,created_at:row.created_at}));
  }
  async insert(collection,owner,data){
    name(collection);
    if(!owner||typeof owner!=="string"||owner.length>64)throw new Error("Invalid owner");
    const id=crypto.randomUUID(),payload=fields(data);
    const result=await this.pool.query(
      "INSERT INTO hg_records (id,collection,owner_id,payload) VALUES ($1,$2,$3,$4::jsonb) RETURNING id, payload, created_at",
      [id,collection,owner,JSON.stringify(payload)]
    );
    const row=result.rows[0];
    return {...row.payload,id:row.id,created_at:row.created_at};
  }
  async delete(collection,owner,id){
    name(collection);
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))return false;
    const result=await this.pool.query(
      "DELETE FROM hg_records WHERE collection = $1 AND owner_id = $2 AND id = $3 RETURNING id",
      [collection,owner,id]
    );
    return result.rows.length>0;
  }
}
module.exports={PostgresStore,name,fields};
