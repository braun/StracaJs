

/**
 * common operation names
 */
export class StracaOperations
{
    static Stracatore="stracatore";
    static Save="save";
    static Load="load"
}

/**
 * Request encapsulating json
 */
export interface StracaStoreRequest
{

    /**
     * service called
     */
    service:string
    /**
     * operation name
     */
    operation:string;

    /**
     * unique id of operation
     */
    oprationId:string;

    /** http method default POST*/
    method?:string;
    /**
     * id of device sending the request
     */
    deviceId:string;

    /** id of user creted the request */
    userId:string;

    /** data/parameters of the rquest, actuall type depends on the called operation */
    data?:any;
}

/**
 * General response from straca server
 * Response encapsulating json
 */
export interface StracaStoreResponse
{
    /**
     * operation name from request
     */
    operation:string;

    /**
     * unique id of operation from request
     */
    oprationId:string;

    /**
     * general status of operation
     */
    ok:boolean;

    /**
     * displayable error text
     */
    display?:string;

    /**
     * longer text describing the error, not intended to be displayed
     */
    comment?:string;

    /**
     * response data
     */
    data:any

    /**
     * the operation is still pending, dont send response now, or the handler handles the response itself
     */
    dontsend?:boolean


}