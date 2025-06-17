
/**
 * Utility class to configure and build service
 */

import { StracaOperation, StracaOperationDescription, StracaOperationHandler, StracaService, StracaServiceDescription } from "./straca";

export class ServiceConfigurator
{
   service:StracaService;

   constructor(servicedesc:StracaServiceDescription)
   {
      this.service = Object.assign(servicedesc,{
         operations:[]});
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
   operation(operation:string,handler:StracaOperationHandler,description:StracaOperationDescription)
   {
      var op:StracaOperation = this.service.operations.find((op:StracaOperation)=>op.operation == operation);
      if(op == null)
      {
         op = Object.assign({
            operation:operation,
            handle:handler
           
         },description);
         this.service.operations.push(op);
      }
  
     
      return this;
   }
}