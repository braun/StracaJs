import { Straca } from "@straca/backend/straca";
import { IStracaAuthProvider } from "@straca/backend/stracauth";
import { IEmailChallengeResponse, IEmailCredentials, IEmailOtpPayload, IEmailOtpPendingChallenge, IEmailOtpVerificationResponse, IEmailOtpValidationpPayload } from "@straca/common/auth/email/emailauthmodels";
import { IAuthPayload, IProviderResult } from "@straca/common/auth/securitymodels";
import { StracaStoreRequest, StracaStoreResponse } from "@straca/common/models/stracadefs";
import * as nodemailer from 'nodemailer';
import SMTPTransport = require("nodemailer/lib/smtp-transport");
import * as jwt from 'jsonwebtoken';
import * as ms from 'ms';
/**
 * google app properties
 */
export interface EmailAppSpec
{
  sessionSecret: string;
  sessionExpiration:ms.StringValue|number; // '1h' or in seconds; 
  transporterConfig:SMTPTransport.Options ; // nodemailer transporter configuration

}

export class EmailAuthProvider implements IStracaAuthProvider
{
    appSpec:EmailAppSpec;
    straca:Straca;
    transporter:nodemailer.Transporter<SMTPTransport.SentMessageInfo, SMTPTransport.Options>;
    pendingChallenges:Map<string,IEmailOtpPendingChallenge> = new Map(); // map of pending challenges by email
    constructor(appSpec:EmailAppSpec,straca:Straca)
    {
        this.appSpec = appSpec;
        this.straca = straca;
        this.installStracaServices();

         this.transporter = nodemailer.createTransport(this.appSpec.transporterConfig);
        // service: 'gmail',
        // auth: {
        //     user: 'tvůj.email@gmail.com',
        //     pass: 'app_password',
        // },
        // });
    }
    installStracaServices() {
      this.straca.addService({
        service: "emailAuthProvider",
        rationale: "OTP Email authentication provider",
        operations: [
            {
                operation:"sendEmailChallenge",
                rationale:"Sends email with OTP challenge to user",
                payload: "IEmailOtpPayload",
                payloadRationale: "user email to send OTP to",
                response: "IEmailChallengeResponse",
                responseRationale: "response with email and sent status",
                handle: async (req:StracaStoreRequest<IEmailOtpPayload>,
                                res:StracaStoreResponse<IEmailChallengeResponse>,surroundings,ereq,eres) =>
                {
                    const email = req.data.email;
                    if(email == null || email.length === 0)
                    {
                        res.ok = false;
                        res.comment ="Email is required";
                        return;
                    }
                    // generate OTP and send email
                    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP
                  
                    if(!this.pendingChallenges.has(email))
                    {
                          this.pendingChallenges.set(email,  {
                            email: email,
                            attempts: 0,
                            sent:false,
                            otp: otp,
                            verified: false,
                            jwtToken: null,
                            createdAt: new Date(),
                            expiresAt: new Date(Date.now() + 5 * 60 * 1000) ,    // expires in 5 minutes
                        });
                    }
                    const challengeResponse: IEmailOtpPendingChallenge = this.pendingChallenges.get(email);
                    
                    // Here you would implement the actual email sending logic using your preferred email service
                    console.log(`Sending OTP ${otp} to ${email}`);
                    
                     await this.transporter.sendMail({
                            from: '"H&F Sprint" <stanislav.kunt@gmail.com>',
                            to: email,
                            subject: 'Přihlášení do aplikace – ověřovací PIN',
                            text: `Tvůj ověřovací kód je: ${otp}`,
                            html: `<p>Tvůj ověřovací kód je:</p><h2>${otp}</h2><p>Platí 5 minut.</p>`,
                        });
                        challengeResponse.otp = otp; // update OTP in challenge
                        challengeResponse.sent = true;
                        challengeResponse.attempts++;
                        challengeResponse.expiresAt = new Date(Date.now() + 5 * 60 * 1000); // reset expiration time
                    res.data = {email: challengeResponse.email, sent: true};

                }
            },
              {
                operation:"verifyOtp",
                rationale:"Verifies OTP entered by user",
                payload: "IEmailOtpPayload",
                payloadRationale: "user email and OTP to verify",
                response: "IEmailOtpVerificationResponse",
                responseRationale: "response with email and verification status",
                handle: async (req:StracaStoreRequest<IEmailOtpPayload>,
                                res:StracaStoreResponse<IEmailOtpVerificationResponse>,surroundings,ereq,eres) =>
                {
                    const email = req.data.email;
                    const otp = req.data.enteredPin;
                    if(email == null || email.length === 0 || otp == null )
                    if(email == null || email.length === 0)
                    {
                        res.ok = false;
                        res.comment ="Email and OTP is required";
                        return;
                    }
         
                    const challenge: IEmailOtpPendingChallenge = this.pendingChallenges.get(email);
           
                    if(challenge == null)
                    {
                        res.ok = false;
                        res.comment = "No pending challenge for email";
                        return;
                    }
                    if(challenge.otp !== otp)
                    {
                        challenge.attempts++;
                        if(challenge.attempts >= 3 || challenge.expiresAt < new Date())
                        {
                            
                            res.ok = false;
                            res.comment = "Challenge expired or too many attempts";
                            return;
                        }
                        res.ok = false;
                        res.comment = "Invalid OTP";
                        return;    
                    }
                    challenge.verified = true;
                    challenge.attempts = 0; // reset attempts on successful verification
                    const credentials:IEmailCredentials = {
                        email: email,
                        createdAt: new Date(),
                    }
                    challenge.jwtToken = 
                    jwt.sign(credentials, this.appSpec.sessionSecret, { expiresIn: this.appSpec.sessionExpiration }); // token platný 1 hodinu
                    res.data = {
                        email: challenge.email,
                        verified: true,
                        message: "OTP verified successfully",
                        jwtToken: challenge.jwtToken
                    }
                }
            }
            ]});
    }
    async validate(payload: IAuthPayload<IEmailOtpValidationpPayload>): Promise<IProviderResult> {
       if(payload.provider !== "email")
       {
           return {isValid:false,message:"Invalid provider",userId:"",provider:"email",providerData:null};
       }
         if(payload.providerData == null || payload.providerData.jwtToken == null)
         {
            return {isValid:false,message:"No JWT token provided",userId:"",provider:"email",providerData:null};
         }
          const jwtoken = payload.providerData.jwtToken;

          const rv = new Promise<IProviderResult>((resolve, reject) => {
            // Ověříme JWT token
            jwt.verify(jwtoken, this.appSpec.sessionSecret, (err, decoded) => {
                if (err) {
                    console.error("Invalid JWT token:", err);
                    resolve( {isValid:false,message:"Invalid JWT token",userId:"",provider:"email",providerData:null});
                }
                // Token je platný, můžeme pokračovat
                const email = (decoded as IEmailCredentials).email;
                const result: IProviderResult = {
                    isValid: true,
                    userId: email,
                    provider: "email",

                }
                resolve( result);
            });
        });
        return rv;
    }
    
}