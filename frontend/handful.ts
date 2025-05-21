import { Guid } from "helpers/stringextender";
import { Manifest } from "../common/models/manifest";
import { MessageStore } from "../common/models/mstore";
import { UrlStore } from "./urlstore";
import { StracaOperations, StracaStoreRequest, StracaStoreResponse } from "../common/models/stracadefs";
import { MessageLoadRequestBuilder } from "../common/mstorequery";
import { CawListener } from "./cawlistener";
import { AuthenticationProviderBattery } from "./auth/provider";


const APPTOKEN = "apptoken";

const TAG="StracaInHandful"

export interface StracaOptions
{
    urlBase:string;
}

/**
 * frontend class to simplify access to Straca's services
 */
export class StracaInHandful
{
    messageStore:MessageStore;

    caw:CawListener;

    options:StracaOptions;
    auth: AuthenticationProviderBattery;

    constructor(opts?:StracaOptions)
    {
        this.options = {
            urlBase:"straca"
        }
        if(opts != null)
            this.options = Object.assign(this.options,opts);

        this.messageStore = new UrlStore(this);
        this.caw = new CawListener(this);
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
     * @param service straca service to be called 
     * @param operation RPC operation to be invoked
     * @param method HTTP method to use (default POST)
     * @returns envelope JSON
     */
    formRequest(service:string,operation:string, method:string = "POST"):StracaStoreRequest
    {
        const rv:StracaStoreRequest = {
            service:service,
            operation: operation,
            oprationId: Guid.newGuid(),
            deviceId: this.appToken,
            userId: this.userId,
            method:method
        }
        return rv;
    }

    /**
     * Constructs url for request, adds body as query parameter for http GET method
     * @param req request to form url for
     * @returns url
     */
    formUrlForRequest(req:StracaStoreRequest)
    {
        const base = `${this.options.urlBase}/${req.service}/${req.operation}`;
        var url = base;
        if(req.method == "GET")
           url = `${url}?body=${encodeURIComponent(JSON.stringify(req))}`;
        return url;
    }


    /**
     * Handy for easy quick call without request creation and result handling
     * @param service service to call
     * @param operation operation to call
     * @param requestData data to send
     * @returns operation result data
     */
    async simpleFetch(service:string,operation:string,requestData?:any,formData?:FormData):Promise<any>
    {
        const req = this.formRequest(service,operation);
        req.data = requestData;
        const res = await this.fetch(req,formData);
        const rv = res.ok ? res.data: null;
        return rv;
    }
    
    /**
     * Sents request to straca
     * @param req request to be sent

     * @returns response from server or dummy response in case of http error
     */
    async fetch(req:StracaStoreRequest,formData?:FormData):Promise<StracaStoreResponse>
    {
        const h:Headers = new Headers();
      
        if(req.method == null)
            req.method = "POST";

      

        if(this.auth != null)
        {
            const token = await this.auth.getSessionToken(req);
            if(token != null)
                h.append("Authorization",token);
        }
        if(formData != null)
        {
            const fd = new FormData();
            fd.append('data',JSON.stringify(req));
            for(const e of formData.keys())
            {
                fd.append(e,formData.get(e));
           
            }
            formData = fd;
          //  h.append('content-type','multipart/form-data');
        }
        else
           h.append('content-type','application/json');
        const url = this.formUrlForRequest(req);
        const rv = await fetch(url,{
            body: formData == null ? JSON.stringify(req): formData,
            headers: h,
            method:req.method,
            
        });
        if(rv.status == 401 || rv.status == 403)
        {
            console.error(TAG,"Unauthorized access, please login again");
            this.auth.sessionToken = null;
            return {
                operation:req.operation,
                oprationId:req.oprationId,
                ok:false,
                chainOk:false,
                data:null,
                comment:"Unauthorized access, please login again"
            };
        }
        if(!rv.ok)
        {
            const comment = `Call ${req.operation} failed with HTTP status ${rv.status}`
            console.error(TAG,comment,JSON.stringify(rv,null,2));
            return {
                operation:req.operation,
                oprationId:req.oprationId,
                ok:false,
                chainOk:false,
                data:null,
                comment:comment
            };
        }
        
        const res = (await rv.json()) as StracaStoreResponse;

        return res;
    }

      
}