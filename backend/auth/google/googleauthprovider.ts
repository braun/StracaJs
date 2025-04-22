import { IAuthPayload, IProviderResult, IStracaAuthProvider } from "@straca/backend/stracauth";
import { IGoogleTokenPayload } from "@straca/common/auth/google/googlemodels";
import { OAuth2Client } from 'google-auth-library';


export interface IGoogleAuthProviderOptions
{
    client_id:string,
}
export class GoogleAuthProvider implements IStracaAuthProvider
{


     client:OAuth2Client
     options:IGoogleAuthProviderOptions;

     constructor(options:IGoogleAuthProviderOptions)
        {
            this.options = options;
            this.client = new OAuth2Client(options.client_id);
        }

    async validate(authpayload: IAuthPayload<IGoogleTokenPayload>): Promise<IProviderResult> {
        try {
            const { tokenToValidate } = authpayload.providerData;
            const ticket = await this.client.verifyIdToken({
              idToken: tokenToValidate,
              audience: this.options.client_id, // stejné jako na frontendu
            });
        
            if(ticket == null)
                return {isValid:false,message:"No ticket returned",userId:"",provider:"google",providerData:null};
            
            const payload = ticket.getPayload();
        
            if(payload == null)
                return {isValid:false,message:"No token payload extracted", userId:"",provider:"google",providerData:null};
                
            // paload obsahuje informace o uživateli (jméno, email, atd.)
            const result: IProviderResult = {
              isValid: true,
              userId:payload.email,
              provider: "google",
              providerData: payload
            }
            return result;
          } catch (err) {
            console.error("Token není platný:", err);
            return {isValid:false,message:`returned error ${err}`,userId:"",provider:"google",providerData:null};
            
          }
    }
    
}