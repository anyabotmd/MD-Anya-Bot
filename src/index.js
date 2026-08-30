import qrcodeTerminal from "qrcode-terminal";
import QRCode from "qrcode";
import http from "node:http";
import makeWASocket,{useMultiFileAuthState,DisconnectReason,fetchLatestBaileysVersion,jidNormalizedUser} from "@whiskeysockets/baileys"; import P from "pino"; import fs from "node:fs"; import {config} from "./config.js"; import {dispatch} from "./commands/index.js"; import * as d from "./db.js";
fs.mkdirSync(config.auth,{recursive:true}); const log=P({level:"info"});
const port=Number(process.env.PORT)||10000;
let latestQR=null; let qrUpdatedAt=0;
const server=http.createServer(async(req,res)=>{
 if(req.url==="/health"){res.writeHead(200,{"content-type":"text/plain; charset=utf-8"});return res.end("ok")}
 if(req.url==="/qr"){
  if(!latestQR){res.writeHead(200,{"content-type":"text/html; charset=utf-8"});return res.end("<h1>🌸 Anya Bot</h1><p>QR ainda não disponível. Atualize em alguns segundos.</p>")}
  try{const png=await QRCode.toDataURL(latestQR,{width:420,margin:2});res.writeHead(200,{"content-type":"text/html; charset=utf-8"});return res.end(`<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Anya QR</title><body style="font-family:Arial;text-align:center;background:#f7f7f7;padding:24px"><h1>🌸 Anya Bot</h1><p>Escaneie este QR Code com o WhatsApp</p><img src="${png}" width="420" height="420" style="max-width:90vw;background:white;padding:10px"><p>QR atualizado: ${new Date(qrUpdatedAt).toLocaleTimeString()}</p><meta http-equiv="refresh" content="10"></body></html>`)}
  catch(e){res.writeHead(500);return res.end("Erro ao gerar QR")}
 }
 res.writeHead(200,{"content-type":"text/html; charset=utf-8"});res.end("🌸 Anya Bot está online!<br><a href='/qr'>Abrir QR Code</a>");
});
server.keepAliveTimeout=120000; server.headersTimeout=120000; server.requestTimeout=120000;
server.listen(port,"0.0.0.0",()=>console.log("🌐 HTTP server listening on 0.0.0.0:"+port));
const start=async()=>{const {state,saveCreds}=await useMultiFileAuthState(config.auth);const {version}=await fetchLatestBaileysVersion();const sock=makeWASocket({version,auth:state,logger:log,printQRInTerminal:false,browser:["Anya Bot","Chrome","0.1.0"]});sock.ev.on("creds.update",saveCreds);
let pairingStarted=false;
const requestPairingCode=async()=>{if(pairingStarted||state.creds.registered||config.qrCode||!config.phone)return;try{
 const phone=config.phone.replace(/\D/g,"");
 if(phone.length<8)throw new Error("PHONE_NUMBER inválido. Use DDI + DDD + número, somente dígitos.");
 pairingStarted=true;
 const code=await sock.requestPairingCode(phone);
 console.log("\n╔══════════════════════════════╗\n║       🌸 ANYA BOT 🌸         ║\n╠══════════════════════════════╣\n║ 🔑 PAIRING CODE: "+code+"     ║\n║ 📱 WhatsApp → Dispositivos   ║\n║    conectados → conectar     ║\n║    com número de telefone    ║\n╚══════════════════════════════╝\n");
}catch(e){pairingStarted=false;log.error(e,"❌ Falha no Pairing Code");}};
sock.ev.on("connection.update",async u=>{
 if(u.qr){
   if(config.qrCode){latestQR=u.qr;qrUpdatedAt=Date.now();console.log("📱 QR Code recebido — abra https://md-anya-bot.onrender.com/qr");qrcodeTerminal.generate(u.qr,{small:true});}
   else console.log("📱 QR interno recebido; Pairing Code será solicitado.");
 }
 if(u.connection==="connecting"&&!state.creds.registered&&!config.qrCode)setTimeout(requestPairingCode,500);
 if(u.connection==="open"){console.log("🌸 Anya Bot conectada! Waku waku!!");pairingStarted=true;}
 if(u.connection==="close"&&u.lastDisconnect?.error?.output?.statusCode!==DisconnectReason.loggedOut){setTimeout(start,3000)}
});
sock.ev.on("messages.upsert",async({messages,type})=>{if(type!=="notify")return;for(const m of messages){try{if(!m.message||m.key.fromMe)continue;const jid=m.key.remoteJid;if(!jid||jid==="status@broadcast")continue;const text=m.message.conversation||m.message.extendedTextMessage?.text||m.message.imageMessage?.caption||"";const sender=jidNormalizedUser(m.key.participant||jid);const isGroup=jid.endsWith("@g.us");let participants=[],admins=new Set();if(isGroup){const md=await sock.groupMetadata(jid);participants=md.participants.map(p=>p.id);admins=new Set(md.participants.filter(p=>p.admin).map(p=>p.id));d.group(jid)}
const a=d.afkGet(sender);if(a&&!text.startsWith((isGroup?d.group(jid).prefix:config.prefix))){const old=d.afkClear(sender);await sock.sendMessage(jid,{text:"👀 @"+sender.split("@")[0]+" voltou!\n💤 Tempo em AFK: "+Math.floor((Date.now()-old.since)/60000)+"min.",mentions:[sender]})}
if(!text.startsWith(isGroup?d.group(jid).prefix:config.prefix)){if(isGroup)for(const p of participants){if(text.includes("@"+p.split("@")[0])){const af=d.afkGet(p);if(af)await sock.sendMessage(jid,{text:"💤 @"+p.split("@")[0]+" está AFK.",mentions:[p]})}}continue}
const prefix=isGroup?d.group(jid).prefix:config.prefix;const body=text.slice(prefix.length).trim();const z=body.split(/\s+/);const cmd=(z.shift()||"").toLowerCase();const mentioned=m.message.extendedTextMessage?.contextInfo?.mentionedJid||[];const args=[...mentioned,...z.filter(x=>!x.startsWith("@"))];const name=m.pushName||sender.split("@")[0];
const admin=isGroup&&admins.has(sender);const botAdmin=isGroup&&admins.has(jidNormalizedUser(sock.user.id));const adminCmd=["menuadm","kick","ban","promover","rebaixar","add","mutar","unmutar","antilink","antispam","antiflood","antipalavra","antifake","anticall","antipv","antimedia","bemvindo","despedida","regras","setregras","autoresposta","marcar","hidetag","marcaradmins","marcarativos","listadmins","listmembros","config","configurar","prefix","logs","limpar","warn"];
if(adminCmd.includes(cmd)&&!admin){await sock.sendMessage(jid,{text:"😤 Só admins podem usar esse comando!"});continue}
if(adminCmd.includes(cmd)&&["kick","ban","promover","rebaixar","add","mutar","unmutar"].includes(cmd)&&!botAdmin){await sock.sendMessage(jid,{text:"😭 Anya não tem permissão de admin!"});continue}
if(isGroup&&admin){
if(["kick","ban"].includes(cmd)){const t=args[0];if(!t){await sock.sendMessage(jid,{text:"👥 Mencione quem será removido."});continue}await sock.groupParticipantsUpdate(jid,[t],"remove");await sock.sendMessage(jid,{text:"👋 Removido com sucesso!",mentions:[t]});continue}
if(cmd==="promover"||cmd==="rebaixar"){const t=args[0];if(!t){await sock.sendMessage(jid,{text:"👥 Mencione o usuário."});continue}await sock.groupParticipantsUpdate(jid,[t],cmd==="promover"?"promote":"demote");await sock.sendMessage(jid,{text:cmd==="promover"?"👑 Promovido!":"📉 Rebaixado!",mentions:[t]});continue}
if(cmd==="add"){const t=args[0];if(!t){await sock.sendMessage(jid,{text:"👥 Informe o JID/telefone."});continue}await sock.groupParticipantsUpdate(jid,[t.includes("@")?t:t+"@s.whatsapp.net"],"add");continue}
if(["antilink","antispam","antiflood"].includes(cmd)){const g=d.group(jid);const key=cmd;const val=g[key]?0:1;d.setGroup(jid,key,val);await sock.sendMessage(jid,{text:"🔒 "+cmd+" "+(val?"ativado":"desativado")+"!"});continue}
if(cmd==="warn"){const t=args[0];if(!t){await sock.sendMessage(jid,{text:"⚠️ Mencione o usuário."});continue}d.raw().prepare("INSERT INTO warnings(group_jid,user_jid,count) VALUES(?,?,1) ON CONFLICT(group_jid,user_jid) DO UPDATE SET count=count+1").run(jid,t);const row=d.raw().prepare("SELECT count FROM warnings WHERE group_jid=? AND user_jid=?").get(jid,t);await sock.sendMessage(jid,{text:"⚠️ @"+t.split("@")[0]+" recebeu uma advertência!\nWarnings: "+row.count+"/"+d.group(jid).warnings_limit,mentions:[t]});if(row.count>=d.group(jid).warnings_limit&&botAdmin)await sock.groupParticipantsUpdate(jid,[t],"remove");continue}
if(cmd==="marcar"||cmd==="hidetag"||cmd==="marcarativos"){await sock.sendMessage(jid,{text:participants.map(x=>"@"+x.split("@")[0]).join(" "),mentions:participants});continue}
if(cmd==="marcaradmins"||cmd==="listadmins"){await sock.sendMessage(jid,{text:"👑 ADMINS\n"+[...admins].map(x=>"@"+x.split("@")[0]).join("\n"),mentions:[...admins]});continue}
if(cmd==="listmembros"){await sock.sendMessage(jid,{text:"👥 Membros: "+participants.length});continue}
if(cmd==="logs"||cmd==="config"||cmd==="configurar"){await sock.sendMessage(jid,{text:"⚙️ Configuração registrada no banco."});continue}
if(cmd==="limpar"){await sock.sendMessage(jid,{text:"🧹 Anya não vai apagar mensagens aleatórias."});continue}
}
if(cmd==="prefix"&&isGroup){if(args[0]){d.setGroup(jid,"prefix",args[0]);await sock.sendMessage(jid,{text:"✨ Prefixo alterado para "+args[0]})}else await sock.sendMessage(jid,{text:"🌸 Prefixo: "+prefix});continue}
if(cmd==="setregras"&&isGroup){d.setGroup(jid,"rules",args.join(" "));await sock.sendMessage(jid,{text:"📜 Regras atualizadas!"});continue}
if(cmd==="regras"&&isGroup){await sock.sendMessage(jid,{text:d.group(jid).rules||"📜 Nenhuma regra configurada."});continue}
await dispatch({sock,jid,cmd,args,sender,group:isGroup,participants,name,admin,botAdmin,admins});}catch(e){log.error(e)}}});};start();