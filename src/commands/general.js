import * as d from "../db.js";
import {config} from "../config.js";

const menuText = `╭━━━〔 🌸 ANYA BOT 🌸 〕━━━╮
┃ 🧠 Waku waku! Menu principal
┣━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ 🎮 JOGOS
┃ ┣ .arcade
┃ ┗ .menurpg
┃
┃ 🥜 ECONOMIA
┃ ┣ .economia
┃ ┣ .empregos
┃ ┣ .ranking
┃ ┣ .conquistas
┃ ┗ .presentes
┃
┃ 🐾 SOCIAL
┃ ┣ .petshop
┃ ┣ .perfil
┃ ┣ .casa
┃ ┗ .afk
┃
┃ ⚙️ OUTROS
┃ ┣ .menuadm
┃ ┣ .ajuda
┃ ┣ .info
┃ ┗ .ping
┣━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ 🥜 Mendoim • Alpha V0.1
╰━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

export async function general(c){
 const {sock,jid,cmd,sender,name}=c;
 if(cmd==="menu") return sock.sendMessage(jid,{text:menuText,mentions:[sender]});
 if(cmd==="ping") return sock.sendMessage(jid,{text:"🏓 PONG! Anya está vivinha!! ✨"});
 if(cmd==="info") return sock.sendMessage(jid,{text:"🌸 "+config.name+" Alpha V0.1\nNode.js + Baileys + SQLite"});
 if(cmd==="ajuda") return sock.sendMessage(jid,{text:"❓ Use .menu para ver os comandos!"});
 if(cmd==="afk"){d.afkSet(sender,c.args.join(" ")||"sem motivo");return sock.sendMessage(jid,{text:"💤 Anya anotou! Você está AFK."})}
 if(cmd==="perfil"){const u=d.user(sender,name);return sock.sendMessage(jid,{text:"👤 "+(u.name||sender)+"\n🥜 "+u.coins+" | ⭐ XP "+u.xp+" | Lv "+u.level})}
 return false;
}