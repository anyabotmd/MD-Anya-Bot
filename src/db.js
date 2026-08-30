import fs from "node:fs"; import path from "node:path"; import Database from "better-sqlite3"; import {config} from "./config.js";
fs.mkdirSync(path.dirname(config.db),{recursive:true}); const db=new Database(config.db); db.pragma("journal_mode=WAL");
db.exec("CREATE TABLE IF NOT EXISTS users(jid TEXT PRIMARY KEY,name TEXT,coins INTEGER DEFAULT 0,xp INTEGER DEFAULT 0,level INTEGER DEFAULT 1,wins INTEGER DEFAULT 0,created INTEGER);"+
"CREATE TABLE IF NOT EXISTS groups(jid TEXT PRIMARY KEY,prefix TEXT DEFAULT '.',rules TEXT DEFAULT '',warnings_limit INTEGER DEFAULT 3,antilink INTEGER DEFAULT 0,antispam INTEGER DEFAULT 0,antiflood INTEGER DEFAULT 0);"+
"CREATE TABLE IF NOT EXISTS jobs(jid TEXT PRIMARY KEY,job TEXT,worked INTEGER DEFAULT 0,last_work INTEGER DEFAULT 0);"+
"CREATE TABLE IF NOT EXISTS pets(id INTEGER PRIMARY KEY AUTOINCREMENT,jid TEXT,species TEXT,rarity TEXT,price INTEGER,level INTEGER DEFAULT 1,xp INTEGER DEFAULT 0,hunger INTEGER DEFAULT 100,happiness INTEGER DEFAULT 100,hp INTEGER DEFAULT 100);"+
"CREATE TABLE IF NOT EXISTS relations(jid TEXT PRIMARY KEY,partner TEXT,type TEXT,since INTEGER);"+
"CREATE TABLE IF NOT EXISTS achievements(jid TEXT,achievement TEXT,created INTEGER,PRIMARY KEY(jid,achievement));"+
"CREATE TABLE IF NOT EXISTS afk(jid TEXT PRIMARY KEY,since INTEGER,reason TEXT);"+
"CREATE TABLE IF NOT EXISTS warnings(group_jid TEXT,user_jid TEXT,count INTEGER DEFAULT 0,PRIMARY KEY(group_jid,user_jid));"+
"CREATE TABLE IF NOT EXISTS gifts(id INTEGER PRIMARY KEY AUTOINCREMENT,sender TEXT,receiver TEXT,item TEXT,created INTEGER);"+
"CREATE TABLE IF NOT EXISTS houses(jid TEXT PRIMARY KEY,house TEXT,level INTEGER DEFAULT 1);"+
"CREATE TABLE IF NOT EXISTS market(id INTEGER PRIMARY KEY AUTOINCREMENT,seller TEXT,item TEXT,price INTEGER,amount INTEGER,status TEXT DEFAULT 'open',created INTEGER);");
export const now=()=>Date.now();
export function user(jid,name){let u=db.prepare("SELECT * FROM users WHERE jid=?").get(jid);if(!u){db.prepare("INSERT INTO users(jid,name,created) VALUES(?,?,?)").run(jid,name||"",now());u=db.prepare("SELECT * FROM users WHERE jid=?").get(jid)}return u}
export function group(jid){let g=db.prepare("SELECT * FROM groups WHERE jid=?").get(jid);if(!g){db.prepare("INSERT INTO groups(jid) VALUES(?)").run(jid);g=db.prepare("SELECT * FROM groups WHERE jid=?").get(jid)}return g}
export function setGroup(jid,key,val){db.prepare("UPDATE groups SET "+key+"=? WHERE jid=?").run(val,jid)}
export function coins(jid,n){user(jid);return db.transaction(()=>{let c=db.prepare("SELECT coins FROM users WHERE jid=?").get(jid).coins; if(c+n<0)throw Error("saldo"); c+=n;db.prepare("UPDATE users SET coins=? WHERE jid=?").run(c,jid);return c})()}
export function xp(jid,n){const u=user(jid);const x=u.xp+n,l=Math.floor(Math.sqrt(x/50))+1;db.prepare("UPDATE users SET xp=?,level=? WHERE jid=?").run(x,l,jid);return {xp:x,level:l}}
export function setJob(jid,job){db.prepare("INSERT INTO jobs(jid,job) VALUES(?,?) ON CONFLICT(jid) DO UPDATE SET job=excluded.job").run(jid,job)}
export function getJob(jid){return db.prepare("SELECT * FROM jobs WHERE jid=?").get(jid)}
export function work(jid,salary){const j=getJob(jid);if(!j)return {e:"job"};const t=now(),cd=5400000;if(t-j.last_work>=cd){db.prepare("UPDATE jobs SET worked=0,last_work=? WHERE jid=?").run(t,jid)}const q=getJob(jid);if(q.worked>=5)return {e:"limit",left:cd-(t-q.last_work)};db.prepare("UPDATE jobs SET worked=worked+1,last_work=? WHERE jid=?").run(t,jid);coins(jid,salary);xp(jid,10);return {ok:true}}
export const pets=jid=>db.prepare("SELECT * FROM pets WHERE jid=?").all(jid);
export function buyPet(jid,p){return db.transaction(()=>{coins(jid,-p.price);db.prepare("INSERT INTO pets(jid,species,rarity,price) VALUES(?,?,?,?)").run(jid,p.species,p.rarity,p.price);xp(jid,15)})()}
export function pet(jid){return db.prepare("SELECT * FROM pets WHERE jid=? ORDER BY id LIMIT 1").get(jid)}
export function petAction(jid,field,delta){const p=pet(jid);if(!p)return null;const v=Math.max(0,Math.min(100,p[field]+delta));db.prepare("UPDATE pets SET "+field+"=? WHERE id=?").run(v,p.id);return v}
export function relation(jid){return db.prepare("SELECT * FROM relations WHERE jid=?").get(jid)}
export function marry(a,b){db.transaction(()=>{db.prepare("INSERT INTO relations(jid,partner,type,since) VALUES(?,?,?,?) ON CONFLICT(jid) DO UPDATE SET partner=excluded.partner,type=excluded.type,since=excluded.since").run(a,b,"marriage",now());db.prepare("INSERT INTO relations(jid,partner,type,since) VALUES(?,?,?,?) ON CONFLICT(jid) DO UPDATE SET partner=excluded.partner,type=excluded.type,since=excluded.since").run(b,a,"marriage",now())})()}
export function divorce(jid){const r=relation(jid);if(r)db.prepare("DELETE FROM relations WHERE jid IN (?,?)").run(jid,r.partner);return r}
export function afkSet(jid,reason){db.prepare("INSERT INTO afk(jid,since,reason) VALUES(?,?,?) ON CONFLICT(jid) DO UPDATE SET since=excluded.since,reason=excluded.reason").run(jid,now(),reason||"");}
export function afkGet(jid){return db.prepare("SELECT * FROM afk WHERE jid=?").get(jid)}
export function afkClear(jid){const a=afkGet(jid);db.prepare("DELETE FROM afk WHERE jid=?").run(jid);return a}
export function achievement(jid,a){return db.prepare("INSERT OR IGNORE INTO achievements(jid,achievement,created) VALUES(?,?,?)").run(jid,a,now()).changes}
export const achievements=jid=>db.prepare("SELECT * FROM achievements WHERE jid=?").all(jid);
export const topCoins=()=>db.prepare("SELECT * FROM users ORDER BY coins DESC LIMIT 10").all();
export const topXp=()=>db.prepare("SELECT * FROM users ORDER BY xp DESC LIMIT 10").all();
export const raw=()=>db;