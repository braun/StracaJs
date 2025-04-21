import { HejlElement } from "hejl/base/hejlElement";
import { Callbacker } from "../callbacker";


/**
 * authentication/authorization lifecycle callbacks
 */
export interface AuthCallback
{
  /**
   * on authentificaion completes
   */
  onAuthentificated?: (auth:AuthenticationProvider)=>void,

  /**
   * on authorization completes
   */
  onAuthorized?: (auth:AuthenticationProvider)=>void,

  /**
   * onUser is logged off
   */
  onLogout?: (auth:AuthenticationProvider)=>void
}


/**
 * extends AuthCallback with ProviderCallback
 */
export interface ProviderCallback extends AuthCallback
{
    /**
     * invoked when a provider was select for authorization
     * for example by clicking its login button
     * @param auth provider selected
     */
    onProviderSelected(auth:AuthenticationProvider):void;
}

const KEY_CURRENT="currentProvider";

/**
 * auxiliary class
 * Set of auth providers used by the application
 */
export class AuthenticationProviderBattery
{
  
  protected _provider: { [key:string]:AuthenticationProvider} = {}
  protected _providerList: AuthenticationProvider[] = [];

  protected _callbacker = new Callbacker<ProviderCallback>();

  protected _auth:AuthenticationProvider;

  /**
   * list of installed providers
   */
  get providers()
  {
        return this._providerList;
  }
  /**
   * current selected provider
   */
  get currentProvider()
  {
    if(this._auth == null)
    {
        const id = localStorage.getItem(KEY_CURRENT);
        if(id != null)
            this._auth = this._provider.hasOwnProperty(id) ? this._provider[id] : null;
        localStorage.setItem(KEY_CURRENT,null);
    }
    return this._auth;
  }

  /**
   * adds callback to authentification events
   * @param cb callback to add
   * @returns this
   */
  addCallback(cb:ProviderCallback)
  {
    this._callbacker.addListener(cb);
    return this;
  }

  /**
   * adds provider to battery
   * @param auth provider to add
   */
  addProvider(auth:AuthenticationProvider)
  {
     this._provider[auth.id()] = auth;
     this._providerList.push(auth);
     const cbs = this._callbacker;
     auth.addProviderCallback({
         onProviderSelected(auth: AuthenticationProvider): void {
            this._auth = auth;
            localStorage.setItem(KEY_CURRENT,auth.id());
            cbs.fire((t)=>t?.onProviderSelected(auth));
         },
         onAuthentificated(auth) {
             cbs.fire((t)=>t?.onAuthentificated(auth));
         },
         onAuthorized(auth)
         {
            cbs.fire((t)=>t?.onAuthorized(auth));
         },
         onLogout(auth) {
            this._auth = null;
            localStorage.setItem(KEY_CURRENT,null);
            cbs.fire((t)=>t?.onLogout(auth));
         }
     })
  }


}

/**
 * interface of  a authentification provider
 */
export interface AuthenticationProvider
{
    /**
     * runs authorization flow for credentials stored in previous session
     * @returns false when the flow cannot be started
     */
    relogin(): boolean;

    /**
     * renders the button for select auth popup dialog
     */
    renderAuthButton():HejlElement;

    /**
     * renders mini detail of logged in user
     */
    renderUserInfo():HejlElement;

    /**
     * signs off the user logged on via this provider
     */
    logout():void;

    /**
     * adds callback to auth provider events
     * @param cb callback
     */
    addProviderCallback(cb: ProviderCallback):void;


    /**
     * id of user logged via this provider
     */
    loggedUserId(): string;

    /**
     * id of the provider
     */
    id():string;
}