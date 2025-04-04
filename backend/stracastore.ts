

import "reflect-metadata"


import {MessageStore} from "../common/models/mstore";
import { SqlStore } from "./sql/sqlstore";
import { Straca, StracaOperation, StracaService } from "./straca";
import { join } from "path";
import * as Express from "express";

import { StracaOperations, StracaStoreRequest, StracaStoreResponse } from "../common/models/stracadefs";
import { StracaMessageStoreManager } from "./stracastoremanager";
import { Message } from "@straca/common/models/message";
import { MLOADREQ } from "@straca/common/mstorequery";

const TAG="STRACATORE";

/**
 * factory for message store instance.
 */
export type MessageStoreFactory = (stracaStore:StracaStore,req:StracaStoreRequest)=>MessageStore;

/**
 * HTTP adapter for MessageStore implementation
 * publishes message store services to frontend applications 
 */
export class StracaStore implements StracaService
{
    messageStoreFactory: MessageStoreFactory;

    protected straca:Straca;

    mtManager:StracaMessageStoreManager = new StracaMessageStoreManager();

 

    /**
     * set the factory for message store.
     *  the factory it is called on each request to straca store. so caching is recommended. it allows to server different requests with different stores. 
     * @param messageStoreFactory factory for message store implementations
     */
    setFactory(messageStoreFactory:MessageStoreFactory)
    {
        this.messageStoreFactory = messageStoreFactory;
        return this;
    }
    /**
     * creates new straca store and mounts its url path
     * @param straca straca instance
       */
    constructor(straca:Straca)
    {
        this.straca = straca;
    }
        // strcastore listens on one endpoint. the {operation} has there only "documentation" purpose
        // real operation name is taken from the payload
     operations = [
    {
      
      operation: StracaOperations.Save,
      handle: async (req:StracaStoreRequest,res:StracaStoreResponse)=>{ 
     
                const mstore = this.messageStoreFactory(this,req);
                const rqdata = req.data;
             
                const msg:Message = rqdata as Message;
                const mtype = msg.meta.messageType;
                console.log(TAG,"SAVE MESSAGE", mtype, msg.meta.messageUid);
        
                const rec = this.mtManager.findMessageType(mtype);
                
                if(rec != null)
                {
                    var prev:Message = null;
                    if(rec.knockOut)
                    {
                        const query =  MLOADREQ().messageStore(mstore).mtype(mtype);
                        prev = await query.loadOne();
                        await query.delete();
                    }
                    if(rec.callbacks.onNewMessage)
                        try
                        {
                            await rec.callbacks.onNewMessage(msg,prev);
                        }
                        catch(ex)
                        {
                            console.error("Stracastore.onNewMessage",ex);
                        }
                }
                res.data =  await mstore.save(msg);
               res.ok = true;
            }
        },{
            operation:StracaOperations.Load,
            handle: async(req:StracaStoreRequest,res:StracaStoreResponse)=>{
                const mstore = this.messageStoreFactory(this,req);
                const rqdata = req.data;
                const mtype = rqdata.example.meta.messageType;
                console.log(TAG,"LOAD MESSAGE(s)", mtype, rqdata.example.meta.messageUid);
                const loaded = await mstore.loadByExample(rqdata);
                if(mtype != null && (loaded.data == null || loaded.data.length == 0))
                {
                    const rec = this.mtManager.findMessageType(mtype);
                
                    if(rec != null)
                    {
                        if(rec.callbacks.onMessageNotFound)
                           loaded.data = [await rec.callbacks.onMessageNotFound(rqdata)];
                    }
                }
                res.data = loaded;
                res.ok = true;
              
            }
        }
    ]
          service=StracaOperations.Stracatore; 
}