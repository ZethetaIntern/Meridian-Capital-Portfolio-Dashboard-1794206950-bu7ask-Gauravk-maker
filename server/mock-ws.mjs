import { WebSocketServer } from 'ws';
const port=Number(process.env.WS_PORT||3001);
const wss=new WebSocketServer({port});
const base={RELIANCE:1284.5,TCS:3921,INFY:1842.6,HDFCBANK:1765.2,NIFTY:24328};
let sequence=0;
const timer=setInterval(()=>{for(const client of wss.clients){if(client.readyState!==1)continue;for(const [ticker,price] of Object.entries(base)){const change=Math.sin((sequence+ticker.length)*1.7)*.0015;client.send(JSON.stringify({ticker,price:Number((price*(1+change)).toFixed(2)),changePct:change*100,timestamp:Date.now(),sequence:++sequence}));}}},2000);
wss.on('listening',()=>console.log(`Meridian mock WebSocket listening on ws://localhost:${port}`));
process.on('SIGINT',()=>{clearInterval(timer);wss.close(()=>process.exit(0));});
