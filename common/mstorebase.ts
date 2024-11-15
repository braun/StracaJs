import { Message } from "./models/message";
import { MessageListenerContext, MessageLoadRequest, MessageLoadResult, MessageSaveResult, MessageStore, MessageTypeOptions, MessageTypeSetup } from "./models/mstore";


/**
 * record in data listener related data structures of MessageListeer base
 */
export class MessageListenerRecord
{
    tag:string;
    mtype:string;
    context:MessageListenerContext;
    eventHandlers:{[key:string]:(msg:Message)=>void}
}

/** 
 * suxiliary class, intended to serve as base class form MessagStore implementations.
 * It containes predefined listener management
 */
export abstract class MessageStoreBase implements MessageStore
{
    abstract deleteByExample(req: MessageLoadRequest):Promise<void>;

    /**
     * loads message(s) by example. This allows to search message store by various criteria
     * like concrete messageUid or messageType prefix.
     * @param request request for load messages
     */
    abstract loadByExample(request: MessageLoadRequest): Promise<MessageLoadResult>;


     /**
     * Stores the message.
     * @param msg message to be stored
     */
    abstract saveInternal(msg: Message) : Promise<MessageSaveResult>;

    protected _listeners:MessageListenerRecord[] = [];
    protected _listenerMap:{[key:string]: MessageListenerRecord} = {}

     /**
     * listens for message events in message store.
     * Message event is for example the new message incoming (onNewMessage)
     * The events are narrowed for specific message type prefix
     * @param tag tag (id) of listener
     * @param mtype message type to listen
     */
    listen(tag:string,mtype: string): MessageListenerContext {
        if(this._listenerMap.hasOwnProperty(tag))
            throw `listener with tag ${tag} already exists`;

        const listener = new MessageListenerRecord();
        const thiz = this;
        listener.tag = tag;
        listener.mtype = mtype;
        listener.eventHandlers = {};
        listener.context = {
            removeListener()
            {
               delete thiz._listenerMap.tag;
               const idx = thiz._listeners.indexOf(this);
               if(idx > -1)
                thiz._listeners.splice(idx,1);
            

            },
            onNewMessage(callback:  (msg:Message)=>Promise<void>)
            {
                listener.eventHandlers.onNewMessage = callback;
            }
        }


        return listener.context;
    }

    protected async fireListeners(event:string, msg:Message)
    {
        for(let listener of this._listeners)
        {
            try
            {
                listener.eventHandlers[event](msg);
            }
            catch(err)
            {
                console.error("MessageStore.fireListeners",event,listener.tag,err);
            }
        }
    }

    save(msg: Message): Promise<MessageSaveResult> {
        const rv = this.saveInternal(msg)
        this.fireListeners("onNewMessage",msg);
        return rv;
    }
   }

