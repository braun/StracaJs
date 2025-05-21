
import * as express from 'express';
import { MessageStoreFactory, StracaStore } from './stracastore';
import { join } from 'path';
import { MessageStoreManager } from '@straca/common/models/mstore';
import { StracaStoreRequest, StracaStoreResponse } from '@straca/common/models/stracadefs';
import { StracaMessageStoreManager } from './stracastoremanager';
import { StracaCaw } from './stracacaw';
import * as ejs from 'ejs';
import multer = require('multer');
import { ISessionKeyPayload } from './stracauth';


const TAG="STRACA";



export interface StracaExpressRequest extends express.Request
{
   user?: ISessionKeyPayload
}




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
    
      const formHandlerKey = 
         (serviceName:string,operationName:string) => `${serviceName}.${operationName}`;
      this.services[service.service] = service;
      for(const h of service.operations)
      {
         if(h == null)
            continue;
         try
         {
         let handle = h.handle;
         this.handlers[formHandlerKey(service.service,h.operation)] = h;
         let multerMiddleware :express.RequestHandler = (r,q,next:express.NextFunction)=>{ next(); };
         if( h.multer != null)
         {
            
            const multerOptions = h.multer?.options || {dest:this.datadir};
            const multmid = h.multer?.multerMiddleware || ((multer)=>multer.any());
            const m = multer(multerOptions);
            (h as any)._multer = m;
             multerMiddleware = (req,res,next)=>
               {
                  multmid(m)(req,res,()=>{
                     (req as any).formFields = req.body;
                     req.body = JSON.parse(req.body.data as string);
                     next();
                  });
               }

               // stracat handler wrapping middleware called when multer is used
               handle = async (req,res,surrounding,expressReq,expressRes)=>{
                  const mfiles= expressReq.files as { [fieldName:string]: Express.Multer.File[]};
                  const files:{ [fieldName:string]: Express.Multer.File} = {}; 
                  for(const key in mfiles)
                  {
                     surrounding.files[key] = mfiles[key][0];
                  } 
                  await h.handle(req,res,surrounding,expressReq,expressRes);
               }
         }

    
         
         this.app.use(`/straca/${service.service}/${h.operation}`,
            async (req,res,next)=>{
               (req as any).surrounding = {
                  files:{}, // files uploaded by multer  
               }
               next();
            },
            multerMiddleware,
            async (req,res,next)=>{
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
                  const servname = sreq.service|| req.params.service;
                   const opname = sreq.operation|| req.params.operation;
                 
               
                  const devid = sreq.deviceId;
                  console.log(TAG,"CALL:",servname,opname,devid)
   
                 
              
                  const surrounding = (req as any).surrounding as StracaSurroundingData;
                  const rv = await executeRequestLogic.bind(this)(handle,sreq,  surrounding);
                  if(!rv.dontsend)
                    this.sendJsonResult(res,rv);
                  
               }
               catch(err)
               {
                     console.error(TAG,err);
                     res.status(500);
                     res.send(err);
               }

               async function executeRequestLogic(handle: StracaOperationHandler<any, any>, sreq: StracaStoreRequest<any>, surrounding: StracaSurroundingData)
               {

                  const rv: StracaStoreResponse = {
                     operation: sreq.operation,
                     oprationId: sreq.oprationId,
                     ok: true,
                     chainOk:true,
                     data: null
                  } 
                  await handle(sreq, rv, surrounding, req, res);
                 

                  if (rv.ok && sreq.subrequest != null) {

                     const subreq = sreq.subrequest as StracaStoreRequest;
                     const subopname = subreq.operation ;
                     const subservname = subreq.service;

                     const coresult:CoRequest = {
                        request: sreq,
                        response: rv
                     }

                     if(surrounding.parentCoRequest == null)
                     {
                        // top level request
                        surrounding.toplevelCoRequest = surrounding.parentCoRequest = coresult
                     }
                     else
                     {
                        // subrequest
                        coresult.parent = surrounding.parentCoRequest;
                        if(surrounding.parentCoRequest != null)   
                           surrounding.parentCoRequest.subrequest = coresult;
                     
                     }

                     const subhandler = this.handlers[formHandlerKey(subservname, subopname)];
                     const parentResponse = surrounding.parentCoRequest?.response;  
                   
                     var subrv = null;
                     if (subhandler != null) {
                        surrounding.parentCoRequest = coresult;
                         subrv = await executeRequestLogic.bind(this)(subhandler.handle,subreq, surrounding);

                        rv.chainOk = subrv.ok;
                        
                        
                     }
                     else
                     {
                         subrv = {
                           operation: subreq.operation,
                           oprationId: subreq.oprationId,
                           display: `Service ${subservname} not found`,
                           comment: `Service ${subservname} not found`,
                           ok: false,
                           chainOk: false,
                           data: undefined
                        }
                        rv.chainOk = false;
                       
                     }
                     // chain output for calling client
                     if(parentResponse != null)
                        parentResponse.subresponse = subrv;
                  }
                  return rv;
               }
         });
      }
      catch(err)
      {
         console.error(TAG,"Error while adding service",service.service,err);
       //  throw err;
      }
      
      }

      return this;
    }

    /**
     * Installs express middleware to be used for all requests to straca services 
     * Intended for authentication, logging etc.
     * @param mw express middleware to be used for all requests to straca
     */
    installFilterMiddleware(mw: express.RequestHandler) {
      
         this.app.use("/straca",(req,res,next)=>{
            if(req.url.indexOf("/straca/doc") > -1)
               next();
            mw(req,res,next);
         });
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
      const mult = multer();
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

export interface CoRequest
{
   request:StracaStoreRequest;
   response:StracaStoreResponse;
   parent?:CoRequest;
   subrequest?:CoRequest;
}
export interface StracaSurroundingData
{

   files:{ [fieldName:string]: Express.Multer.File}
   toplevelCoRequest?:CoRequest;
   parentCoRequest?:CoRequest;
}
/**
 * handler (executioner) of a upload operation
 */
export type StracaOperationHandler<T=any,R=any> = (req:StracaStoreRequest<T>, res:StracaStoreResponse<R>,surrounding:StracaSurroundingData,expressReq:StracaExpressRequest,expressRes:express.Response)=> Promise<void>


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
    * meaningful service should have defined the handle or upload handler
    */
   handle?:StracaOperationHandler;



   /**
    * customization of multer handling upload process
    */
   multer?: {
      /**
     * options for constructor of multer handling the call
     */
     options?:multer.Options ;
     /**
       * Allows custimization of multer middleware. This is place to manually call .any .fields .single on multer
       * @param multer multer to handle requests
       * @returns middleware to be passed to express use chain 
       */
     multerMiddleware?:(multer:multer.Multer)=>express.RequestHandler;
   } 

   
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