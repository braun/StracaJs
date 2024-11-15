import { Message } from "./models/message";
import { MessageLoadRequest, MessageStore } from "./models/mstore";

export class MessageLoadRequestBuilder
{


    req:MessageLoadRequest = {
        example: {
            meta: {
                messageType: null,
            },
            content: {}
        }
    }

    protected _mstore:MessageStore;
    messageStore(ms:MessageStore)
    {
        this._mstore = ms;
        return this;
    }

    load()
    {
        return this._mstore.loadByExample(this.req);
    }

   async loadOne()
    {
        const res = await this._mstore.loadByExample(this.req);
        if(res.data != null && res.data.length > 0)
            return res.data[0];
        return null;
    }

    async delete()
    {
        const res = await this._mstore.deleteByExample(this.req);
        return res;
    }
    
    example(e:Message)
    {
        this.req.example = e;
        return this;
    }
    uid(messageUid:string)
    {
        this.req.example.meta.messageUid = messageUid;
        return this;
    }
    mtype(mtype:string)
    {
        this.req.example.meta.messageType = mtype;
        return this;
    }

}

export const MLOADREQ = ()=>new MessageLoadRequestBuilder();