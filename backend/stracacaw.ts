
import { StracaStoreRequest, StracaStoreResponse } from "../common/models/stracadefs";
import { Straca } from "./straca";
import { StracaServiceBase } from "./stracaservicebase";
import * as express from 'express';

import { CawEventRecord, CawSubscribeRequest } from "../common/models/caw";
const  TAG="StracaCaw";
/**
 * Back flow event channel. brings events to clients
 */
export class StracaCaw extends StracaServiceBase {

 

    protected map:{[key:string]:StracaCawClient} = {};
    constructor(straca:Straca,serviceName="caw")
    {
        super(straca,serviceName);
    
    
        /**
         * SSE will connect to this endpoint
         */
        this.addHandler("listen",async (stracaReq,stracaRes,req,res)=>{
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Connection', 'keep-alive');
            res.flushHeaders(); // flush the headers to establish SSE with client
            const token = stracaReq.deviceId;
            if(token == null) 
            {
                console.error(TAG,this.service,"Attempt to connect without token!")
                res.end();
                return;
            }
            if(!this.validateNewConnection(stracaReq))
            {
                console.error(TAG,this.service,"Attetmp to connect with invalid token!")
                res.end();
                return;
            }
            res.on('close', () => {
                console.log(TAG,this.service,'client dropped me');
                const r = this.map[token as string];
                if(r != null)
                    r.dropAll();
                delete this.map[token as string]
              
                res.end();
            });
           
            const clientCawer = new StracaCawClient();
            clientCawer.straca = this.straca;
            clientCawer.req = stracaReq;
            clientCawer.res = stracaRes;
            clientCawer.expressReq = req;
            clientCawer.expressRes = res;
            this.map[token as string] = clientCawer;
            stracaRes.dontsend = true;
            clientCawer.runPing();
       
         });

         /** 
          * handles subscription of events
         */
         this.addHandler("subscribe",async (stracaReq:StracaStoreRequest,stracaRes,req,res)=>{
            const client = this.map[stracaReq.deviceId];
            if(client == null)
            {
                this.straca.sendNoFound(res,stracaRes);
            
                return;
            }
            const subsc = stracaReq.data as CawSubscribeRequest;
            for(const evrecord of subsc.subscribe)
            {
                this.subscribe(client,evrecord);
            }

         });
    }

    fireEvent(eventId:string,data:any)
    {
        console.log(TAG,"fireEvent",eventId)
        const toSend:StracaCawClient[] = [];
        this.topNode.find(toSend,eventId);
        console.log(TAG,"found subscribers",eventId,toSend.length)
        for(const c of toSend)
        {
            c.sendEv(eventId,data);
        }
    }
    protected subscribe(client: StracaCawClient, evrecord: CawEventRecord) {

            const evid = evrecord.eventId;
            for(const r of client.eventList)
            {
                if(evid == r.eventId)
                    return;
            }
            this.topNode.install(evid,client);
            client.eventList.push(evrecord);
    }
    protected validateNewConnection(stracaReq: StracaStoreRequest) {
       return true;
    }

    topNode:StracaCawTreeNode = new StracaCawTreeNode();
}


export class StracaCawTreeNode
{
   
    remove(c:StracaCawClient)
    {
        const idx = this.subscribers.indexOf(c);
        if(idx != -1)
            this.subscribers.splice(idx,1);
    }
    nextPointers:{[key:string]:StracaCawTreeNode} = {}
    subscribers:StracaCawClient[] = []

    find(result:StracaCawClient[],eventId:string)
    {
        
        result.push(...this.subscribers);

        if(eventId == null || eventId.length == 0)
            return;

        const firstChar = eventId[0];
        const restOfEventId = eventId.substring(1);

        const next = this.nextPointers[firstChar];

        if(next != null)
          next.find(result,restOfEventId);
    }

    install(eventId:string,client: StracaCawClient)
    {
        if(eventId == null || eventId.length == 0)
          {
            if(this.subscribers.indexOf(client) == -1)
            this.subscribers.push(client);
            client.nodeList.push(this);
            return;
          }

        const firstChar = eventId[0];
        const restOfEventId = eventId.substring(1);
        if(this.nextPointers[firstChar] == null)
            this.nextPointers[firstChar] = new StracaCawTreeNode();

        this.nextPointers[firstChar].install(restOfEventId,client);

    }
}
export class StracaCawClient
{
    
    sendPing()
    {
        this.sendEv("ping","{}");
    }

    interval:NodeJS.Timeout;

    runPing()
    {
        this.interval = setInterval(()=>this.sendPing(),10*1000);
    }
    dropAll() {
        clearInterval(this.interval);
        for(const n of this.nodeList)
        {
            n.remove(this);
        }
    }
    straca:Straca;
    req:StracaStoreRequest;
    res:StracaStoreResponse;
    expressReq:express.Request;
    expressRes:express.Response;

    eventList:CawEventRecord[] = [];
    nodeList:StracaCawTreeNode[] = [];

    sendEv(eventId:string,data:any)
    {
        const mres = Object.assign({},this.res);
        mres.ok = true;
        mres.operation = eventId;
        mres.data = data;
        console.log(TAG,"sending event",eventId,this.res.oprationId);
       this.expressRes.write(`data: ${JSON.stringify({ event: eventId,data: mres})}\n\n`);
    }
}