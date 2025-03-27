import { HejlElement, HTMLElementHejl } from "hejl/base/hejlElement";
import { HejlDIV, SPAN } from "hejl/base/hejlHtmlTags";
import { HTTPGETS } from "helpers/hejlutils";
import { jwtDecode } from "jwt-decode";
import { AuthCallback, AuthenticationProvider, ProviderCallback } from "./provider";
import { HCONTSB } from "hejl/base/containers";
import { IMG } from "hejl/base/image";
import { Callbacker } from "../callbacker";

declare global {
    var google:any;
}


/**
 * encapsulates the google sign in button to hejl element
 */
export class GoogleButton extends HejlDIV
{
 
  setupHejlElement()
  {
    this.class('google-button');
   
  
  }

  build(): HTMLElementHejl {
    const rv = super.build();
    this.renderGoogleButton();
    return rv;
  }

  protected renderGoogleButton() {
    google.accounts.id.renderButton(
      this.domElement,
      { theme: "outline", size: "large", type: "standard" }
    );
  }

  async bind(data: any) {
    const rv = await super.bind(data)
    this.renderGoogleButton();
    return rv;
  }
}

/**
 * google app properties
 */
export interface AppSpec
{
  client_id:string,
  secret?:string,
  scopes?:string[],
  useAuthentification?:boolean
}

export interface GoogleProfile
{
  id: string;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
}
export interface GoogleGisProfile extends GoogleProfile
{
  iss?: string;
  nbf?: number;
  aud?: string;
  sub?: string;
  email?: string;
  email_verified?: boolean;
  azp?: string;

  iat?: number;
  exp?: number;
  jti?: string;
}



/**
 * Encapsulats google identity api authentification and oauth2 authorization
 * authentification byl the google "prompt" and "google button"
 * authorization by token client implicit flow
 */
export class GoogleAuth implements AuthenticationProvider
{
    appid:AppSpec;
    access_token:any;
    client:any;
    credentials:GoogleGisProfile;
    authCallbacks:Callbacker<ProviderCallback> = new Callbacker();
 

    get useAuthentification()
    {
      return this.appid.useAuthentification == true;
    }

    constructor(appid:AppSpec)
    {
        this.appid = appid;
    
        if(appid.useAuthentification)
           this.initClient();
        else
          this.initTokenClient();
    }

    relogin(): boolean {
      this.issuePrompt();
      return true;
    }

    renderAuthButton(): HejlElement {
      return new GoogleButton();
    }
    renderUserInfo(): HejlElement {
      const rv = HCONTSB('googleinfo').stack([IMG('avatar').srcbinder(()=>this.credentials.picture),SPAN('name').textBinder(()=>this.credentials.name)]);
      return rv;
    }
    addProviderCallback(cb: ProviderCallback): void {
      this.authCallbacks.addListener(cb);
    }

    loggedUserId(): string {
      return this.credentials.email;
    }

    id(): string {
      return "google";
    }

    /** 
     * inits the google identity api 
     * */
    initClient()
    {
     
      google.accounts.id.initialize({
        client_id: this.appid.client_id,
        ux_mode: "popup",
      //  prompt_parent_id: "signinBox",
        context: "use",
        cancel_on_tap_outside: false,
        auto_select: true,
            callback: (response:any)=>
            {
              const decoded = jwtDecode(response.credential)
                console.log("decoded",JSON.stringify(decoded,null,2))
                this.credentials = decoded as GoogleProfile;
                this.credentials.id = this.credentials.sub;
              this.fireLoginCallback();
           //     this.client.requestAccessToken();
                this.initTokenClient();
                this.authorize();
            }
          });
         
    }

  loginCallbackCalled = false;

   /**
    * fires the authentificated callback, method called when the authentification state changes
    */ 
  protected fireLoginCallback() {
    
    if(!this.loginCallbackCalled)
       this.authCallbacks.fire(t=>{ t?.onProviderSelected(this); t?.onAuthentificated(this);});
    this.loginCallbackCalled = true;
  }
  /**
    * fires the authorized callback, method called when the authentification state changes
    */ 
   protected fireAuthorizedCallback() {
       this.authCallbacks.fire(t=>t?.onAuthorized(this));
  }

/**
 *  inits the oauth2 token client for authorizations to call google apis
 */
    initTokenClient() {
      if(this.appid.scopes == null)
        this.appid.scopes = [];
      if( this.appid.scopes.indexOf("https://www.googleapis.com/auth/userinfo.profile") == -1)
        this.appid.scopes.push('https://www.googleapis.com/auth/userinfo.profile')
      const conf:any = {
        client_id: this.appid.client_id,
        scope: this.appid.scopes?.join(' '),
        secret:this.appid.secret,
       
        callback: async (tokenResponse:any) => {
          this.access_token = tokenResponse.access_token;
          console.log("got token",this.access_token)
         
         // const decoded = jwt_decode(JSON.stringify(tokenResponse))
       //   console.log("decoded",JSON.stringify(decoded,null,2))
          gapi.load('client', async ()=>{
              await gapi.client.init({
                  // NOTE: OAuth2 'scope' and 'client_id' parameters have moved to initTokenClient().
                })
              await gapi.client.load('https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',null);
              await gapi.client.load('https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',null);
            
              console.log("got token",this.access_token)
              gapi.client.setToken(tokenResponse);
              await this.userInfo();
              this.fireAuthorizedCallback();
          });
          
        },
      }
      if(this.useAuthentification)
        conf.prompt = '';
      if(this.credentials && this.credentials.id)
        conf.login_hint = this.credentials.id;
        if(this.credentials && this.credentials.email)
        conf.login_hint = this.credentials.email;
        this.client = google.accounts.oauth2.initTokenClient(conf);
    }


    /**
     * creates the google identity one tap prompt
     */
    issuePrompt()
    {
      google.accounts.id.prompt(); 
    }

    /**
     * authorizes the app to call google APIS (performs the google authorization by calling requestAcessToken)
     */
     authorize() {
      this.client.requestAccessToken();
     }

     /**
      * return id of logged user
      */
     get userId() {
      return this.credentials.id;
     }
     /**
     * revokes both the google identity api credentials and oauth2 acess token
     */
    logout()
    {
      google.accounts.id.disableAutoSelect(); // Zabrání automatickému přihlášení

      google.accounts.id.revoke((<any>this.credentials).sub, (done:any) => {
        console.log(done);
      })
      google.accounts.oauth2.revoke(this.access_token, (done:any) => {
        console.log(done);
      })
      this.credentials = null;
      this.loginCallbackCalled = false;
      this.authCallbacks.fire(t=>t?.onLogout(this));
    }

    /**
   * gets google user's profile
   */
     async userInfo()
     {
       const resp = await this.fetch("https://www.googleapis.com/oauth2/v1/userinfo?alt=json")
    
    
       this.credentials =  Object.assign(this.credentials||{}, JSON.parse(resp));
         console.log(JSON.stringify(this.credentials,null,2));
     
     }
 
    /**
     * 
     * @param url performs generic google api call
     * @param options customize the request (method etc)
     * @returns returned data as string
     */
     async fetch(url:string,options?:RequestInit)
      {
        options = options || {};
        options.headers = options.headers || [];
        (<any>(options.headers)).push(['Authorization','Bearer ' + this.access_token]);
        const rv = await HTTPGETS(url,options);
        return rv;
      }

      /**
       *  test method to work with calendar
       * @returns calendar entries
       */
       loadCalendar() {
        //  return this.fetch( 'https://www.googleapis.com/calendar/v3/calendars/primary/events');
      
       return  gapi.client.calendar.events.list({ 'calendarId': 'primary' })
      }


      /**
       * saves data as file to google user's driver into appdata folder
       * @param data data to be saved
       * @param fileName name of file
       * @param parent directory (not used yet)
       */
       saveFile(data:any, fileName:string,parent?:string) {
        const rv = new Promise((resolve, reject) => {
          var file = new Blob([JSON.stringify(data)], {type: 'application/json'});
          var metadata = {
              'name': fileName, // Filename at Google Drive
              'mimeType': 'application/json', // mimeType at Google Drive
              'parents': ['appDataFolder'], // Folder ID at Google Drive
          };

          //var accessToken = gapi.auth.getToken().access_token; // Here gapi is used for retrieving the access token.
          var form = new FormData();
          form.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}));
          form.append('file', file);

          var xhr = new XMLHttpRequest();
          xhr.open('post', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id');
          xhr.setRequestHeader('Authorization', 'Bearer ' + this.access_token);
          xhr.responseType = 'json';
          xhr.onload = () => {
              console.log(xhr.response.id); // Retrieve uploaded file ID.
              if(xhr.response.status == null || xhr.response.status === 200)
                  resolve(xhr.response);
              else
                  reject(xhr.response)
          };
          xhr.send(form);
      })
    }

      /**
       * saves data as file to google user's driver into appdata folder
       * @param data data to be saved
       * @param fileName name of file
     
       */
      async saveAppData(data:any,fileName: string) {
        await this.saveFile(data,fileName)
      }

      /**
       * loads data from specified file from app data folder
       * @param fileName name of file to be loaded 
       * @param defaultVal default value when the app data file is not found
       * @returns loaded data
       */
      async loadAppData(name:string,defaultVal:string = null)
      {
        const res = await gapi.client.drive.files.list({
          spaces: 'appDataFolder',
          q: `name='${name}'`
        });
        var ffile:gapi.client.drive.FileResource = null;
       (<any> res.result).files.forEach(function(file:any) {
         ffile = file;
         console.log('FOUND FILE',JSON.stringify(file,null,2))
        });
        if(ffile == null)
          return defaultVal;
        var getres = await gapi.client.drive.files.get(<any>{ fileId: ffile.id, alt: 'media'})
        return getres.body;
      }
      /**
       * removes data from specified file from app data folder
       * @param fileName name of file to be deleted 
       */
      async deleteAppData(name:string)
      {
    
        const res = await gapi.client.drive.files.list({
          spaces: 'appDataFolder',
          q: `name='${name}'`
        });
      
      
        for(const file of (<any> res.result).files) {
        
          console.log('DELETING FILE',JSON.stringify(file,null,2))
          await gapi.client.drive.files.delete({
            fileId: file.id
          });
        };
        
      }

      /**
       * hint for name of local database for this app and logged user
       */
      get dbNameHint()
      {
        return `${this.appid.client_id}_${this.credentials.id}`
      }
}