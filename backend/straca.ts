
import * as express from 'express';
import { MessageStoreFactory, StracaStore } from './stracastore';
import { join } from 'path';
import { MessageStoreManager } from '@straca/common/models/mstore';
import { StracaStoreRequest, StracaStoreResponse } from '@straca/common/models/stracadefs';
import { StracaMessageStoreManager } from './stracastoremanager';
import { StracaCaw } from './stracacaw';

const TAG="STRACA";

/**
 * Main class of Strace services backend
 */
export  class Straca
{
    app:express.Express
    stracastore:StracaStore;
    caw:StracaCaw;
    protected services:{[key:string]:StracaService} = {}
    protected handlers:{[key:string]:StracaOperation} = {}

    /**
     * installs new service in straca
     * @param service service to be installed
     * @returns this
     */ 
    addService(service:StracaService)
    {
      this.services[service.service] = service;
      for(const h of service.operations)
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
        this.caw = new StracaCaw(this,"caw");
        this.addService(this.caw);

        this.app.use("/straca/:service/:operation",async (req,res,next)=>{
            try
            {
               // for get encody body in url query param
               if(req.method == "GET")
               {
                 const b =  req.query.body;
                 if(b != null)
                 {
                   const qbody = JSON.parse(b as string);
                   req.body = qbody;
                 }
               }
               const body = req.body as any;
               const sreq = body as StracaStoreRequest;
               const servname = sreq.service;
               const opname = sreq.operation;
             
            
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
               await handler.handle(sreq,rv,req,res);
               if(!rv.dontsend)
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
     sendJsonResult(res:express.Response,rv:StracaStoreResponse)
    {

         if(!rv.dontsend) //dont send headers again
         {
            res.type('json');
            res.status(200);
         }
        res.send(JSON.stringify(rv,null,2));
    }

     
      /**
     * Sends not found HTTP error
     * @param res express response to use
     * @param rv payload to send
     */
      sendNoFound(res:express.Response,rv:StracaStoreResponse)
      {
  
          res.type('json');
          res.status(404);
          res.send(JSON.stringify(rv,null,2));
          rv.dontsend = true;
      }
}

/**
 * General interface of service installed in Straca
 */
export interface StracaService
{
   /**
    * service name
    * Can be part of URL called by client
    */
   service:string;
 
   /**
    * list of operations provided by service
    */
   operations:StracaOperation[];
}

/**
 * handler (executioner) of a operation
 */
export type StracaOperationHandler = (req:StracaStoreRequest,res:StracaStoreResponse,expressReq:express.Request,expressRes:express.Response)=> Promise<void>


/**
 * operation provided by service
 */
export interface StracaOperation
{
   /**
    * name of operation
    * Can be part of URL called by client
    */
   operation:string;

   /**
    * handler of operation
    */
   handle:StracaOperationHandler;

}