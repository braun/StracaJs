import { HejlElement, HTMLElementHejl, IHejlElementOptions } from "hejl/base/hejlElement";
import { HejlDIV, SPAN, SPANT } from "hejl/base/hejlHtmlTags";
import { HTTPGETS } from "helpers/hejlutils";
import { jwtDecode } from "jwt-decode";
import { AuthCallback, AuthenticationProvider, ProviderCallback } from "../provider";
import { HCONTSB, VCONT } from "hejl/base/containers";
import { IMG } from "hejl/base/image";
import { Callbacker } from "../../callbacker";
import { IAuthPayload } from "../../../common/auth/securitymodels";
import { IGoogleTokenPayload } from "../../../common/auth/google/googlemodels";
import { Remix } from "hejl/theme/remix";
import { ALERTDIALOG, HejlDialog } from "hejl/eggs/dialogs";
import { labeled } from "hejl/eggs/labeled";
import { INPUT } from "hejl/base/input";
import { IEmailCredentials, IEmailOtpPayload, IEmailOtpValidationpPayload } from "src/lib/straca/common/auth/email/emailauthmodels";
import { StracaInHandful } from "../../handful";
import { EmailAuthProviderStracaWrapper } from "./emailauthops";

declare global {
    var google:any;
}


/**
 * encapsulates the google sign in button to hejl element
 */
export class EmailAuthButton extends HejlDIV
{
 
  auth:EmailAuth
  constructor(auth:EmailAuth,id:string = 'emailauthbutton',opts?:IHejlElementOptions)
  {
    super(id,opts);
    this.auth = auth;
      this.binder(()=>this.auth);
   this.class('email-auth-button');
   this.stack([SPAN('icon').class([Remix._2x,Remix.mail_line]), SPANT('Přihlásit se E-mailem').class('grow')])
  }
  setupHejlElement()
  {
    this.class('authbutton');
    this.click(() => {
      const dlg = new HejlDialog(app,'emailauthdialog');
      dlg.title('Přihlášení E-mailem');
      dlg.content([VCONT('emailauthcontent')
        .stack([
          labeled(INPUT('emailinput').type('email').placeholder('Zadejte svůj E-mail')
           .textBinder([() => this.auth.enteredEmail || '',
            (v:string) => this.auth.enteredEmail = v?.toLocaleLowerCase()
            ]), 'E-mail')
           
            ])]);
        dlg.addOk(async () => {
          const email = this.auth.enteredEmail;
          if(email == null || email.length === 0)
          {
            app.showDialog(ALERTDIALOG('E-mail je povinný',app).title('Chyba'));
            return;
          }
          const payload:IEmailOtpPayload = { email:email.toLocaleLowerCase() };
          const res = await this.auth.ops.sendEmailChallengeFormFetch(payload);
          if(!res.ok)
          {
            app.showDialog(ALERTDIALOG(res.comment,app).title('Chyba'))
            return;
          }
          this.showPinDialog();
        });
        dlg.addCancel(()=>{

        })
      app.showDialog(dlg);
    });
  }
    showPinDialog()
    {
         const dlg = new HejlDialog(app,'emailauthdialog');
      dlg.title('Přihlášení E-mailem');
      dlg.content([VCONT('emailauthcontent')
        .stack([
         
          labeled(INPUT('emailpin').placeholder('Zadejte 6 místný kód, který vám přišel E-mailem')
          .textBinder([() => this.auth.enteredPin || '',
            (v:string) => this.auth.enteredPin = v
            ]), 'PIN'),
        ])]);
        dlg.addOk(async () => {
           this.auth.enteredPin = this.auth.enteredPin?.trim();
           this.auth.verifyOtp();
        });
        dlg.addCancel(()=>{

        })
      app.showDialog(dlg);
    }
  
  




  async bind(data: any) {
    const rv = await super.bind(data)
  
    return rv;
  }
}


/**
 * OTP by email authentification provider

 */
export class EmailAuth implements AuthenticationProvider
{
 
    enteredEmail:string;
    enteredPin:string;
    authCallbacks:Callbacker<ProviderCallback> = new Callbacker();
 
    // creds of logged user
    credentials:IEmailCredentials;

    straca:StracaInHandful;
    ops:EmailAuthProviderStracaWrapper
    constructor(straca:StracaInHandful)
    {
      this.straca = straca;
      this.ops = new EmailAuthProviderStracaWrapper(straca);
    }
 async verifyOtp() {
    const rv = await this.ops.verifyOtpFormFetch({email:this.enteredEmail,enteredPin:this.enteredPin});
    if(!rv.ok)
    {
      app.showDialog(ALERTDIALOG("Nepodařilo se ověřit PIN:" + rv.comment,app).title('Chyba'));
      return;
    }
    this._jwtToken = rv.data.jwtToken;
    this.credentials = 
    {
      email: rv.data.email.toLocaleLowerCase(),
      createdAt: new Date(),
    }
    this.fireLoginCallback();
    this.fireAuthorizedCallback();

  }
  
  getStracaAuthPayload(): IAuthPayload {
   const rv:IAuthPayload<IEmailOtpValidationpPayload> = {
     provider: "email",
     providerData: {
      jwtToken: this._jwtToken
    }
   }
   return rv;
  }

    relogin(): boolean {
      
      return false;
    }

    renderAuthButton(): HejlElement {
      const rv =  new EmailAuthButton(this);
    
      rv.bind(this)
      return rv;
    }
    renderUserInfo(): HejlElement {
      const rv = HCONTSB('userinfostrip').stack([SPAN('name').textBinder(()=>this.credentials.email)]);
      return rv;
    }
    addProviderCallback(cb: ProviderCallback): void {
      this.authCallbacks.addListener(cb);
    }

    loggedUserId(): string {
      return this.credentials.email;
    }

    id(): string {
      return "email";
    }

    protected _jwtToken:string = null;

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
      * return id of logged user
      */
     get userId() {
      return this.credentials.email;
     }
     /**
     * revokes both the google identity api credentials and oauth2 acess token
     */
    logout()
    {
    
      this.credentials = null;
      this.loginCallbackCalled = false;
      this._jwtToken = null;
      this.authCallbacks.fire(t=>t?.onLogout(this));
    }


  

}