import {useEffect,useRef,useState} from 'react';
import {eventBus} from '../data/eventBus';
import {MockMarketStream,type StreamStatus} from '../realtime/mockStream';
/** Starts a WebSocket client when configured, otherwise uses local simulated polling. */
export function useMarketStream(paused:boolean){const [status,setStatus]=useState<StreamStatus>('connecting');const streamRef=useRef<MockMarketStream|null>(null);useEffect(()=>{const url=import.meta.env.VITE_MARKET_WS_URL as string|undefined;const stream=new MockMarketStream(tick=>eventBus.emit('PRICE_TICK',tick),setStatus,2000,url);streamRef.current=stream;stream.connect();return()=>{stream.disconnect();streamRef.current=null;};},[]);useEffect(()=>{if(paused)streamRef.current?.pause();else streamRef.current?.resume();},[paused]);return status;}
