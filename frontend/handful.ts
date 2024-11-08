import { Guid } from "helpers/stringextender";
import { Manifest } from "../common/models/manifest";
import { MessageStore } from "../common/models/mstore";
import { UrlStore } from "./urlstore";

const APPTOKEN = "apptoken";

/**
 * frontend class to simplyfy access to Straca's services
 */
export class StracaInHandful
{
    messageStore:MessageStore;

    constructor()
    {
        this.messageStore = new UrlStore(this);
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


}