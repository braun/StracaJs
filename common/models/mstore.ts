
import { Message } from "./message";
import { StracaStoreRequest, StracaStoreResponse } from "./stracadefs";


export interface MessageListenerContext
{
    removeListener():void;
    onNewMessage(callback:  (msg:Message)=>Promise<void>):void;
}

export interface MessageSaveResult 
{
    data:Message;
}

/**
 * result of loadByExample operation
 * @see MessageStore.loadByExample
 * @see MessageLoadRequest
 */
export interface MessageLoadResult 
{
    /**
     * messages found by request
     */
    data:Message[];
}

/**
 * request of loadByExample operation
 * @see MessageStore.loadByExample
 * @see MessageLoadResponse
 */
export interface MessageLoadRequest 
{
    /**
     * example (partial) message
     */
    example:Message;

    /**
     * skip firs number of messages
     */
    skip?:number;

    /**
     * limit number of returned messages
     */
    limit?:number;
}
/**
 * Store for messages. 
 * Messages are stored in the MessageStore. They can be saved there and loaded back. 
 * Messages are stored in the MessageStore with attributes like expiration (to avoid uncontrollable grow of the store)
 */
export interface MessageStore
{

    
    /**
     * deletes message(s) by example. This allows to clean message store by various criteria
     * like concrete messageUid or messageType prefix.
     * @param request request for delete messages
     */
    deleteByExample(req: MessageLoadRequest): Promise<void>;
    
    /**
     * Stores the message.
     * @param msg message to be stored
     */
    save(msg:Message):Promise<MessageSaveResult>;

    /**
     * loads message(s) by example. This allows to search message store by various criteria
     * like concrete messageUid or messageType prefix.
     * @param request request for load messages
     */
    loadByExample(request:MessageLoadRequest):Promise<MessageLoadResult>;

    /**
     * listens for message events in message store.
     * Message event is for example the new message incoming (onNewMessage)
     * The events are narrowed for specific message type prefix
     * @param tag tag (id) of listener
     * @param mtype message type to listen
     */
    listen(tag:string,mtype:string):MessageListenerContext;

}

/**
 * Message store manager is intended for configuring the message store
 */
export interface MessageStoreManager
{
    /**
     * Configures various features of new messages with given message type prefix 
     * @param messageType message type to configure
     * @param options features of the message store
     */
    addMessageType(messageType:string,options:MessageTypeOptions):MessageTypeSetup;
}


/**
 * options or features of new messages. 
 * used by message store manager to configure defaults for messages with given message type prefix
 */
export interface MessageTypeOptions
{
    /**
     * keep in message store only one message with specific full message type 
     */
    knockOut?:boolean;

    /**
     * default expiration time of messages with given message type prefix
     */
    expirationMinutes?:number;
}

export type MessageTypeCallback = (msg:Message,previous?:Message)=>Promise<void>
/**
 * allows hook listeners/processor to message store for messages with message types with related message type.
 */
export interface MessageTypeSetup
{
    onNewMessage(callback:  MessageTypeCallback):MessageTypeSetup;
}

