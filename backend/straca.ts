
import * as express from 'express';
import { MessageStoreFactory, StracaStore } from './stracastore';
import { join } from 'path';
import { MessageStoreManager } from '@straca/common/models/mstore';
import { StracaStoreRequest, StracaStoreResponse } from '@straca/common/models/stracadefs';
import { StracaMessageStoreManager } from './stracastoremanager';

const TAG="STRACA";

/**
 * Main class of Strace services backend
 */
export  class Straca
{
    app:express.Express
    stracastore:StracaStore;
    
    protected services:{[key:string]:StracaService} = {}
    protected handlers:{[key:string]:StracaHandler} = {}

    /**
     * installs new service in straca
     * @param service service to be installed
     * @returns this
     */ 
    addService(service:StracaService)
    {
      this.services[service.service] = service;
      for(const h of service.handlers)
      {
         this.handlers[`${service.service}.${h.operation}`] = h;
      }

      return this;
    }

    /**
     * default data directory to store application persistent data
     */
    get datadir()
    {
       const rv = join(process.cwd(),"..","data");
       return rv; 
    };

    constructor(app:express.Express)
    {
        this.app = app;

        this.app.use("/straca/:service/:operation",async (req,res,next)=>{
            try
            {
               const body = req.body as any;
               const sreq = body as StracaStoreRequest;
               const servname = sreq.service;
               const opname = sreq.operation;
               const rqdata = sreq.data;
            
               const devid = sreq.deviceId;
               console.log(TAG,"CALL:",servname,opname,devid)

               const rv: StracaStoreResponse = {
                  operation: sreq.operation,
                  oprationId: sreq.oprationId,
                  ok: true,
                  data: null
               }
               const service = this.services[servname];
               if(service == null)
               {
                  rv.ok = false;
                  rv.comment = "service not found: "+servname;
                  this.sendJsonResult(res,rv);
                  return;
               }
               const handler = this.handlers[`${servname}.${opname}`];
               if(handler == null)
                  {
                     rv.ok = false;
                     rv.comment = "handler not found: "+opname;
                     this.sendJsonResult(res,rv);
                     return;
                  }
               await handler.handle(sreq,rv,req);
               this.sendJsonResult(res,rv);
               
            }
            catch(err)
            {
                  console.error(TAG,err);
                  res.status(500);
                  res.send(err);
            }
      });
   }

    /**
     * override this generate custom StracaStore
     */
     protected async createStore()
     {
        const rv  = new StracaStore(this);
        return rv;
     }

     /**
      * inits stracastore and adds it as service to straca
      */
     async initStore(messageStoreFactory:MessageStoreFactory)
     {
       this.stracastore = await this.createStore();
       this.stracastore.setFactory(messageStoreFactory)
       this.addService(this.stracastore);
       this.onStoreCreated(this.stracastore.mtManager);
     }

     /**
      * override this to config message store, bind message lister callbacks etc.
      * @param manager manager to config store
      */
     protected async onStoreCreated(manager:StracaMessageStoreManager)
     {
     }

        /**
     * 
     * @param res express response to use
     * @param rv payload to send
     */
    protected sendJsonResult(res:express.Response,rv:StracaStoreResponse)
    {

        res.type('json');
        res.status(200);
        res.send(JSON.stringify(rv,null,2));
    }

     
}

export interface StracaService
{
   service:string;
 
   handlers:StracaHandler[];
}

export interface StracaHandler
{
   operation:string;
   handle(req:StracaStoreRequest,res:StracaStoreResponse,expressReq:express.Request): Promise<void>

}