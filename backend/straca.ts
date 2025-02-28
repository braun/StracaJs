
import * as express from 'express';
import { MessageStoreFactory, StracaStore } from './stracastore';
import { join } from 'path';
import { MessageStoreManager } from '@straca/common/models/mstore';
import { StracaStoreRequest, StracaStoreResponse } from '@straca/common/models/stracadefs';
import { StracaMessageStoreManager } from './stracastoremanager';
import { StracaCaw } from './stracacaw';
import * as ejs from 'ejs';

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
     * Creates service configurator for a service.
     * Service is created when not exists
     * @param serviceName name of service to configure
     * @returns service configurator object
     */
    configureService(serviceName:string)
    {
        
         if(this.services[serviceName] == null)
            this.addService({
               service: serviceName,
               operations: []
            });
         const service = this.services[serviceName];
         return new ServiceConfigurator(service);
   
    }
    /**
     * default data directory to store application persistent data
     */
    get datadir()
    {
       const rv = join(process.cwd(),"..","data");
       return rv; 
    };

    /** 
    * default assets of straca
    */
   get assetdir()
   {
      const rv = join(process.cwd(),"backend","straca-assets");
      return rv; 
   };

    constructor(app:express.Express)
    {
        this.app = app;
        this.caw = new StracaCaw(this,"caw");
        this.addService(this.caw);

        this.app.get("/straca/doc/services",async (req,res,next)=>{
         res.type('json');
         this.sendJsonResult(res,this.services,(key:string,val:any)=>{
               if(key == "caw" || key =="straca")
                  return undefined;
               if(key == "payload" || key == "response")
               {
                  return {
                     class:val.name,
                   //  location:Reflect.getMetadata("design:type",val)
                  }
               }
               return val;
            })
        });
        this.app.get("/straca/doc/clientstub/:service",async (req,res,next)=>{
      
         const servicename = req.params.service;
         const service = this.services[servicename];
         if(service == null)
         {
            res.status(404);
            res.send("Service not found: "+servicename);
            return;
         }
         res.type('text/x-typescript');
         const text = await ejs.renderFile(join(this.assetdir,"clientstub.ejs"),service);
         res.send(text);
      });
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
     sendJsonResult(res:express.Response,rv:any,replacer:(key:string,val:any)=>any = null)
    {

         if(!rv.dontsend) //dont send headers again
         {
            res.type('json');
            res.status(200);
         }
        res.send(JSON.stringify(rv,replacer,2));
    }

     
      /**
     * Sends not found HTTP error
     * @param res express response to use
     * @param rv payload to send
     */
      sendNoFound(res:express.Response,rv:any)
      {
  
          res.type('json');
          res.status(404);
          res.send(JSON.stringify(rv,null,2));
          rv.dontsend = true;
      }

       /**
     * Sends  HTTP server error
     * @param res express response to use
     * @param rv payload to send
     */
       sendError(res:express.Response,rv:any)
       {
   
           res.type('json');
           res.status(500);
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
    * description of service
    */
   rationale?:string;

   /**
    * list of operations provided by service
    */
   operations:StracaOperation[];
}

/**
 * handler (executioner) of a operation
 */
export type StracaOperationHandler<T=any,R=any> = (req:StracaStoreRequest<T>,res:StracaStoreResponse<R>,expressReq:express.Request,expressRes:express.Response)=> Promise<void>


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
    * description of operation
    */
   rationale?:string;

   /** TS interface of json data */
   payload?:any;
   /** short comment to payload  data*/
   payloadRationale?:string;

   /** TS interface of json response data */
   response?:any;

   /** short comment to response data */
   responseRationale?:string;

   /**
    * handler of operation
    */
   handle:StracaOperationHandler;

}

/**
 * Utility class to configure and build service
 */

export class ServiceConfigurator
{
   service:StracaService;

   constructor(service:StracaService)
   {
      this.service = service;
   }

   /**
    * Adds or replaces operation in service
    * @param operation operation to be added
    * @param handler handler for a service
    * @param rationale description of operation
    * @param payload TS class or string name of interface of json data
    * @param response TS class or string name of interface of json response data
    * @returns this
    */
   operation(operation:string,handler:StracaOperationHandler,rationale:string,payload?:any,response?:any)
   {
      var op:StracaOperation = this.service.operations.find((op)=>op.operation == operation);
      if(op == null)
      {
         op = {
            operation:operation,
            handle:handler,
            rationale:rationale
         }
         this.service.operations.push(op);
      }
      op.handle = handler;
      op.rationale = rationale;
      op.payload = payload;
      op.response = response;

     
      return this;
   }
}