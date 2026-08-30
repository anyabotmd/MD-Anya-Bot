import "dotenv/config";
const bool=(v,def=false)=>v==null?def:["true","1","yes","sim"].includes(String(v).toLowerCase());
export const config={prefix:process.env.PREFIX||".",name:process.env.BOT_NAME||"Anya Bot",db:process.env.DB_PATH||"./data/anya.sqlite",auth:process.env.AUTH_DIR||"./data/auth",phone:process.env.PHONE_NUMBER||"",qrCode:bool(process.env.QR_CODE,false)};