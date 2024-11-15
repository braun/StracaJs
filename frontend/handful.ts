import { Guid } from "helpers/stringextender";
import { Manifest } from "../common/models/manifest";
import { MessageStore } from "../common/models/mstore";
import { UrlStore } from "./urlstore";
import { StracaOperations, StracaStoreRequest, StracaStoreResponse } from "../common/models/stracadefs";
import { MessageLoadRequestBuilder } from "../common/mstorequery";


const APPTOKEN = "apptoken";

const TAG="StracaInHandful"
/**
 * frontend class to simplify access to Straca's services
 */
export class StracaInHandful
{
    messageStore:MessageStore;

    constructor()
    {
        this.messageStore = new UrlStore(this);
    }

    /**
     * 
     * @returns creates message load request builder on message store
     */
    loadMessages()
    {
        return new MessageLoadRequestBuilder().messageStore(this.messageStore);
    }
    /**
     * id of current user
     */
    get userId()
    {
        return "anonymous";
    }
    /**
     * gets app token.
     * app token is id of the application installation on the device. 
     */
    get appToken()
    {
        var token = localStorage.getItem(APPTOKEN);
        if(token == null)
        {
            token = Guid.newGuid();
            localStorage.setItem(APPTOKEN,token);
        }
        return token;
    }

    protected _manifest:Manifest;
    /**
     * get's app's manifest
     * @returns manifest
     */
    async getManifest():Promise<Manifest>
    {
        if(this._manifest == null)
        {
            const response = await fetch("/manifest.json");
            this._manifest = (await response.json()) as Manifest;
        }
        return this._manifest;
    }


    /**
     * constructs json envelope for straca RPC call 
     * @param operation RPC operation to be invoked
     * @returns envelope JSON
     */
    formRequest(service:string,operation:string):StracaStoreRequest
    {
        const rv:StracaStoreRequest = {
            service:service,
            operation: operation,
            oprationId: Guid.newGuid(),
            deviceId: this.appToken,
            userId: this.userId
        }
        return rv;
    }

    /**
     * Sents request to straca
     * @param req request to be sent
     * @param method HTTP method default POST
     * @returns response from server or dummy response in case of http error
     */
    async fetch(req:StracaStoreRequest,method:string = "POST"):Promise<StracaStoreResponse>
    {
        const h:Headers = new Headers();
        h.append('content-type','application/json');
        const rv = await fetch(`straca/${req.service}/${req.operation}`,{
            body: JSON.stringify(req),
            headers: h,
            method:method,
            
        });
        if(!rv.ok)
        {
            const comment = `Call ${req.operation} failed with HTTP status ${rv.status}`
            console.error(TAG,comment,JSON.stringify(rv,null,2));
            return {
                operation:req.operation,
                oprationId:req.oprationId,
                ok:false,
                data:null,
                comment:comment
            };
        }
        
        const res = (await rv.json()) as StracaStoreResponse;

        return res;
    }

}