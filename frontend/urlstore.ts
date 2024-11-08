import { Guid } from "helpers/stringextender";
import { HeaderDevice } from "../common/constants";
import { Message } from "../common/models/message";
import { MessageListenerContext, MessageStore } from "../common/models/mstore";
import { StracaInHandful } from "./handful";
import dayjs = require("dayjs");

export class UrlStore implements MessageStore
{

    protected _straca:StracaInHandful;
    constructor(straca:StracaInHandful)
    {
        this._straca = straca;
        
    }

    async fetch(msg:Message,method:string)
    {
        const h:Headers = new Headers();
        h.append(HeaderDevice,this._straca.appToken);
        h.append('content-type','application/json');
        const rv = await fetch("stracastore",{
            body: JSON.stringify(msg),
            headers: h,
            method:method,
            
        });

        return rv;
    }

    async save(msg: Message): Promise<boolean> {
        if(msg.meta.messageUid == null)
            msg.meta.messageUid = Guid.newGuid();
        
        msg.meta.created = dayjs().toISOString();
        msg.meta.device = this._straca.appToken;
        msg.meta.creator = this._straca.userId;

       const rv =  (await this.fetch(msg,"PUT")).ok;
       return rv;
    }
    async loadByExample(example: Message): Promise<Message[]> {
        const res =  (await this.fetch(example,"POST"));
        if(!res.ok)
            return null;
        const rv: Message[] = await res.json();
        return rv;
    }
    listen(mtype: string, callback: (m: Message) => void): MessageListenerContext {
        throw new Error("Method not implemented.");
    }
    
}