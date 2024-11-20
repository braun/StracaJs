import { Message } from "@straca/common/models/message";
import { MessageLoadRequest, MessageStoreManager, MessageTypeCallback, MessageTypeOptions, MessageTypeSetup } from "@straca/common/models/mstore";

export interface StracaMessageTypeOptions extends MessageTypeOptions
{
    messageTypePrefix:string;

    callbacks:{[key:string]:any}
}
export class StracaMessageStoreManager implements MessageStoreManager
{
    protected _mtypes:{ [key:string]:StracaMessageTypeOptions} = {}

    addMessageType(messageType: string, options: MessageTypeOptions): MessageTypeSetup {
       const rec:StracaMessageTypeOptions =
       {
           messageTypePrefix: messageType,
           callbacks:{}
       }
       Object.assign(rec,options);
       this._mtypes[messageType] = rec;

       return {
         onNewMessage(callback) {
            rec.callbacks.onNewMessage = callback;
            return this;
        },
        onMessageNotFound(callback:(loadreq:MessageLoadRequest)=>Promise<Message>)
        {
            rec.callbacks.onMessageNotFound = callback;
            return this;
        }
       }
    }

    findMessageType(messageType:string)
    {
        for(const mt in this._mtypes)
        {
            if(messageType.startsWith(mt))
            {
                return this._mtypes[mt];
            }
        }
        return null;
    }
}