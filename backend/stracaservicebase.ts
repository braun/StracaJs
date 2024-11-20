import { Straca, StracaOperation, StracaOperationHandler, StracaService } from "./straca";

/**
 * Base class for straca service implementations
 */
export class StracaServiceBase implements StracaService
{
    service:string;

    straca:Straca;
    operations: StracaOperation[] = [];

    /**
     * Creates new base for a service
     * @param straca straca this service belongs to
     * @param serviceName 
     */
    constructor(straca:Straca,serviceName:string)
    {
        this.service = serviceName;
        this.straca = straca;
    }

    /**
     * Adds new operation to service
     * @param operation id of operation
     * @param handler handler of operation
     */
    addHandler(operation:string,handler:StracaOperationHandler)
    {
        this.operations.push({
            operation:operation,
            handle:handler
        })
    }
}