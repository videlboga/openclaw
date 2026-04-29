import { WebSocket } from "ws";
const ws = new WebSocket(`ws://127.0.0.1:19004/ws`);
ws.on('open', () => {
    ws.send(JSON.stringify({ kind: "req", id: 1, method: "chat.send", params: { sessionKey: "dm:lain-head", message: "hello" } }));
});
ws.on('message', m => {
    let s = m.toString();
    console.log('msg:', s);
    if(s.includes("connect.challenge")) {
         let p = JSON.parse(s).payload;
         ws.send(JSON.stringify({kind:"req", id:2, method:"connect", params:{nonce:p.nonce, signature: p.nonce}}));
         ws.send(JSON.stringify({ kind: "req", id: 3, method: "chat.send", params: { sessionKey: "dm:lain-head", message: "hello test" } }));
    }
});
setTimeout(() => process.exit(0), 4000);
