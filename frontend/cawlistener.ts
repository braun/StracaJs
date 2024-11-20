import { error } from "console";
import { CawSubscribeRequest } from "../common/models/caw";
import { StracaStoreRequest, StracaStoreResponse } from "../common/models/stracadefs";
import { StracaInHandful } from "./handful";

/**
 * api to work with event subsription
 */
export interface CawSubscriptionApi
{
    /**
     * cancels the subscription
     */
    remove():Promise<StracaStoreResponse>,
    /**
     * registers listener for the subscribed event
     * @param callback callback fired when subscrbed event arrive
     */
    onCaw(callback:(event:StracaStoreResponse)=>void):CawSubscriptionApi;
}

/**
 * listener for caw events
 * Events by SSE from straca server
 */
export class CawListener
{
    serviceId:string;
    straca:StracaInHandful;
    eventSource:EventSource;

    callbacks:{[key:string]:((event:StracaStoreResponse)=>void)[]} = {}

    constructor(straca:StracaInHandful,cawservice:string = "caw")
    {
        this.straca = straca;
        this.serviceId = cawservice
    }
    

    /**
     * Subscribes events to listen
     * @param eventId id of event to subscribe
     * @returns api for further work with the subscription
     */
    async subscribe(eventId:string):Promise<CawSubscriptionApi>
    {
        const data:CawSubscribeRequest = {
            subscribe: [{
                eventId: eventId
            }]
        }

        const cbs = this.callbacks;
        const rv =  {
            async remove()
            {
                const req =  s.formRequest(this.serviceId,"remove");
                req.data = data;
                const res = await s.fetch(req);
                delete cbs[eventId];
                return res;
            },

            onCaw(callback:(event:StracaStoreResponse)=>void) {
                cbs[eventId].push(callback);
                return this;
            },
        }
        if(this.callbacks.hasOwnProperty(eventId))
            return rv;
      
        if(!this.eventSource)
            await this.listen();

        const s = this.straca;
        const req =  s.formRequest(this.serviceId,"subscribe");
        req.data = data;
        const res = await s.fetch(req);
        if(res.ok)
        {
            cbs[eventId] = [];
            return rv;
        }
    }


    /**
     * connects to cawservice on straca server.
     * Establishes SSE channel to receive events of straca server
     */
     listen():Promise<void>
    {
        const rv = new Promise<void>((resolve,reject)=>{
        const req =  this.straca.formRequest(this.serviceId,"listen","GET");

        const url = this.straca.formUrlForRequest(req);
        this.eventSource = new EventSource(url);

        // firefox does not fire the onopen event
        const removeto =   setTimeout(()=>resolve(null),1000);
        this.eventSource.onopen=(e:Event)=>{
            clearTimeout(removeto);
            resolve(null);
        };
        this.eventSource.onerror = (event)=>{
            console.error("Caw",event)
        }
        this.eventSource.onmessage = async (event)=>{
            const data = JSON.parse(event.data)
            const evres = data.data as StracaStoreResponse;
            const evid = evres.operation;
            for(const cbsk in this.callbacks)
            {

            if(!evid.startsWith(cbsk))
                return;
            const cbs = this.callbacks[cbsk];
            for(const cb of cbs)
                try
                {
                  await cb(evres);  
                }
                catch(err)
                {
                    console.error("onCaw",err);
                }         
            }
        }
      
    });
    return rv;
    }

}