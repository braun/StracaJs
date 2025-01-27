import { error } from "console";
import { CawSubscribeRequest } from "../common/models/caw";
import { StracaStoreRequest, StracaStoreResponse } from "../common/models/stracadefs";
import { StracaInHandful } from "./handful";
import { EventStreamContentType, fetchEventSource } from '@microsoft/fetch-event-source';
import { Callbacker } from "./callbacker";


class RetriableError extends Error { }
class FatalError extends Error { }

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

export interface CawLifecycleListener
{
    onOpen():Promise<void>;
}
/**
 * listener for caw events
 * Events by SSE from straca server
 */
export class CawListener
{
    serviceId:string;
    straca:StracaInHandful;
    eventAbortController:AbortController;

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
      
       // if(!this.eventAbortController)
        //    await this.listen(null);

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

    lifecycleCallbacker:Callbacker<CawLifecycleListener> = new Callbacker();        
    /**
     * connects to cawservice on straca server.
     * Establishes SSE channel to receive events of straca server
     */
    async listen(lifecycleListener:CawLifecycleListener):Promise<void>
    {
        if(lifecycleListener != null)
            this.lifecycleCallbacker.addListener(lifecycleListener);
        const rv = new Promise<void>( (resolve,reject)=>{
        const req =  this.straca.formRequest(this.serviceId,"listen");

        const url = this.straca.formUrlForRequest(req);
        this.eventAbortController =  new AbortController();
        const caw = this;
         const srcPromise =  fetchEventSource(url,{
            method:"POST",
            body: JSON.stringify(req),
            signal: this.eventAbortController.signal,
            headers:{
               'Content-Type': 'application/json',
            },

            async onopen(response) {
                if (response.ok && response.headers.get('content-type') === EventStreamContentType) {
                 {
                    // clear the callbacks, should be readded by subscribe in onOpen handlers
                    caw.callbacks = {};
                    await caw.lifecycleCallbacker.fire((cb)=>cb.onOpen());  
                    resolve();
                    return; // everything's good
                 }  
                } else if (response.status >= 400 && response.status < 500 && response.status !== 429) {
                    // client-side errors are usually non-retriable:
                    throw new FatalError();
                } else {
                    throw new RetriableError();
                }
            },
            async onmessage(msg) {
                // if the server emits an error message, throw an exception
                // so it gets handled by the onerror callback below:
                if (msg.event === 'FatalError') {
                    throw new FatalError(msg.data);
                }

                const data = JSON.parse(msg.data)
                const evres = data.data as StracaStoreResponse;
                const evid = evres.operation;
                for(const cbsk in caw.callbacks)
                {
    
                if(!evid.startsWith(cbsk))
                    continue;
                const cbs = caw.callbacks[cbsk];
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
            },
            onclose() {
                // if the server closes the connection unexpectedly, retry:
                throw new RetriableError();
            },
            onerror(err) {
                console.error("Caw",err)
                if (err instanceof FatalError) {
                    throw err; // rethrow to stop the operation
                } else {
                    // do nothing to automatically retry. You can also
                    // return a specific retry interval here.
                }
            }
        });

        srcPromise.then(()=>{
            console.log("Caw", "fetch exit");
        }).catch((reason)=>{
            console.error("Caw", "fetch error",reason);
        })
        
        // firefox does not fire the onopen event
        // const removeto =   setTimeout(()=>resolve(null),1000);
        // this.eventSource.onopen=(e:Event)=>{
        //     clearTimeout(removeto);
        //     resolve(null);
        // };
       
      
    });
    return rv;
    }

}