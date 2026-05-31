import { Straca } from "./straca";
import * as expressWs from "express-ws"
import { Request } from "express"
import { WebSocket } from "ws"
import { StracaCaw, StracaCawClient } from "./stracacaw";
import { prepareResponse, StracaStoreRequest } from "@straca/common/models/stracadefs";
import * as http from "http"

const  TAG="StracaCawWs";

export interface StracaWsEvent<T=any> {
    event: string;
    req: StracaStoreRequest<T>;
}
export class StracaCawWs extends StracaCaw
{
    constructor(straca:Straca)
    {
        super(straca);
     
    }
    listening(server:any) {
           console.log("StracaCawWs","init");
      
        const expressWsInstance = expressWs(this.straca.app,server);
        expressWsInstance.app.ws("/ws", (ws: WebSocket, req: Request) => {
            let token:string = null;
            ws.on('close', () => {
                console.log(TAG,this.service,'client dropped me');
                if(token == null)
                    return;
                const r = this.map[token as string];
                if(r != null)
                    r.dropAll();
                delete this.map[token as string]
              
                ws.close();
            })
            ws.on('message', data => {
                console.log('Client says:', data.toString())
                try {
                    // Convert Buffer or ArrayBuffer to string (if needed)
                    const str = typeof data === "string" ? data : data.toString()

                    // Parse JSON safely
                    const wsev = JSON.parse(str) as StracaWsEvent<any>
                   const stracaReq = wsev.req as StracaStoreRequest<any>;
                    const token = stracaReq.deviceId;
                    if(token == null) 
                    {
                        console.error(TAG,this.service,"Attempt to connect without token!")
                        ws.close();
                        return;
                    }
                     if(!this.validateNewConnection(stracaReq))
                    {
                        console.error(TAG,this.service,"Attetmp to connect with invalid token!")
                        ws.close();
                        return;
                    }
                    const stracaRes = prepareResponse(stracaReq, true, null);
                    const clientCawer = new StracaCawClientWs();
                    clientCawer.straca = this.straca;
                    clientCawer.ws = ws;
                    clientCawer.req = stracaReq;
                    clientCawer.res = stracaRes;
                    this.map[token as string] = clientCawer;
                
                    clientCawer.sendEv("connected",stracaRes);
                    clientCawer.runPing();
             
                } catch (e) {
                    console.error("❌ Invalid JSON message", e)
                    return
                }
            })

        
        });

    }
    async init()
    {
  
    }

}

export class StracaCawClientWs extends StracaCawClient
{
    
  
    dropAll() {
        clearInterval(this.interval);
        for(const n of this.nodeList)
        {
            n.remove(this);
        }
    }
    
   
    ws: WebSocket;
    

    sendEv(eventId:string,data:any)
    {
        const mres = Object.assign({},this.res);
        mres.ok = true;
        mres.operation = eventId;
        mres.data = data;
        console.log(TAG,"sending event",eventId,this.res.oprationId);
       this.ws.send(JSON.stringify({ event: eventId,data: mres}));
    }
}