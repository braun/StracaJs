import { Guid } from "helpers/stringextender";
import { Message } from "../common/models/message";
import { MessageListenerContext, MessageLoadRequest, MessageLoadResult, MessageSaveResult, MessageStore, MessageTypeOptions, MessageTypeSetup } from "../common/models/mstore";
import { StracaInHandful } from "./handful";
import dayjs = require("dayjs");
import { StracaOperations, StracaStoreRequest, StracaStoreResponse } from "../common/models/stracadefs";
import { MessageListenerRecord, MessageStoreBase } from "../common/mstorebase";

const TAG="urlstore";

/**
 * simple MessageStore implementation using straca's stracastore service accessed by http
 */
export class UrlStore extends MessageStoreBase
{
    async deleteByExample(req: MessageLoadRequest): Promise<void> {
       
    }

    protected _straca:StracaInHandful;
    constructor(straca:StracaInHandful)
    {
        super();
        this._straca = straca;
        
    }


   
    
    async saveInternal(msg: Message): Promise<MessageSaveResult> {
        if(msg.meta.messageUid == null)
            msg.meta.messageUid = Guid.newGuid();
        
        msg.meta.created = dayjs().toISOString();
        msg.meta.device = this._straca.appToken;
        msg.meta.creator = this._straca.userId;

        const req = this._straca.formRequest(StracaOperations.Stracatore,StracaOperations.Save);
        req.data = msg;

       const res =  (await this._straca.fetch(req));
       return res.data;
    }
    async loadByExample(req: MessageLoadRequest): Promise<MessageLoadResult> {
        const request = this._straca.formRequest(StracaOperations.Stracatore,StracaOperations.Load);
        request.data = req;
        const res =  (await this._straca.fetch(request));
        if(!res.ok)
            return null;
       return res.data;
    }
   
   
    
}