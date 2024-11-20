
/**
 * model for caw subscribe straa request
 */
export interface CawSubscribeRequest
{
    /**
     * list of subscribed events
     */
    subscribe: CawEventRecord[];
}

/**
 * event description
 */
export interface CawEventRecord
{
    /**
     * id of subscribed event
     */
    eventId:string;
}