

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
export interface StracaStoreRequest<T=any>
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

    /** data/parameters of the request, actuall type depends on the called operation */
    data?:T;
}

/**
 * General response from straca server
 * Response encapsulating json
 */
export interface StracaStoreResponse<T=any>
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
    data:T;

    /**
     * the operation is still pending, dont send response now, or the handler handles the response itself
     */
    dontsend?:boolean


}