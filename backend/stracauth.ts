import { StracaApp } from "stracapp";
import { Straca, StracaExpressRequest } from "./straca";
import { StracaStoreRequest, StracaStoreResponse } from "@straca/common/models/stracadefs";
import * as jwt from 'jsonwebtoken';
import * as ms from 'ms';
import * as express from 'express';
import { IAuthPayload, IAuthResponse, IProviderResult } from "@straca/common/auth/securitymodels";

const TAG = "StracaAuthManager";

export interface IStracaAuthProvider
{
    validate(payload:IAuthPayload):Promise<IProviderResult>;
}

export interface ISessionKeyPayload
{
    userId:string;
   
}

export interface IStracaAuthOptions
{
    sessionSecret:string;
    sessionExpiration?:ms.StringValue|number; // '1h' or in seconds
}
export class StracaAuthManager
{
    providers:IStracaAuthProvider[] = [];
    straca:Straca;
    options:IStracaAuthOptions = {
        sessionSecret: "default",
        sessionExpiration: "1h" // default to 1 hour
    }
    constructor(straca:Straca,providers:IStracaAuthProvider[], options:IStracaAuthOptions)
    {
        this.providers = providers;
        this.straca = straca;
        this.options = options;
    }
    

    installAuthService()
    {
        this.straca.installFilterMiddleware(this.middleware());
        this.straca.addService({
            service: "security",
            rationale:"Authentication service",
            operations: [
                {
                    operation: "auth",
                    payload:"IAuthPayload",
                    rationale: "Authenticate user, create session token",
                    payloadRationale: "Authentication payload, provide and its generated token",
                    response:"IAuthResponse",
                    responseRationale: "Authentication response, provide and its generated token",
                    handle: async(
                        req:StracaStoreRequest<IAuthPayload>,
                        res:StracaStoreResponse<IAuthResponse>,surrounding,ereq,eres)=>{
                        
                            for (const provider of this.providers)
                            {
                                const result = await provider.validate(req.data);
                                if (result.isValid)
                                {
                                    const sessionToken = this.generateSessionToken({
                                        userId: result.userId
                                    });
                                    const userId = result.userId;
                                    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiration
                                    
                                  res.data = {
                                        sessionToken: sessionToken,
                                        userId: userId,
                                        provider: result.provider,
                                        
                                    };
                                    eres.setHeader("X-Session-Expiration", expiresAt.toUTCString());
                                    eres.setHeader("X-Session-Token", sessionToken);
                                    eres.setHeader("X-Session-UserId", userId);
                                    eres.setHeader("X-Session-Provider", result.provider);
                                    
                                 
                                    console.log(TAG,`Authentication successful for user ${userId} with provider ${result.provider}` );
                                    return;
                                }
                                     console.log(TAG,`Authentication failed for user ${req.data.providerData} with provider ${result.provider}`);
                                    return;
                                
                            }
                    }
                }
            ]
        })
    }


    generateSessionToken(payload:ISessionKeyPayload): string {
    
           return jwt.sign(payload, this.options.sessionSecret, { expiresIn: this.options.sessionExpiration }); // token platný 1 hodinu
    }
     validateSessionToken(req:StracaExpressRequest,token: string): Promise<boolean> {
        const rv = new Promise<boolean>((resolve, reject) => {
           
                jwt.verify(token, this.options.sessionSecret,(err, user) => {
                if(err) {
                        console.log(TAG,`Invalid session token ${token}`,err,user);
                        resolve(false); // token neplatný nebo vypršel
                    }
                    resolve(true); // token je platný
                    req.user = user as ISessionKeyPayload; // přidáme uživatele do requestu
                });
           
        });
        return rv;
    }
     middleware() {
        return async  (req:express.Request, res:express.Response,next: express.NextFunction) => {

            if (req.path === '/security/auth') {
                 next(); // pokud je to autentizace, pokračuj dál
                 return;
            }
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1]; // očekává Bearer TOKEN
          
            if (!token) 
            {
                res.sendStatus(401);
                return ;
            }
            const valid = await this.validateSessionToken(req,token);
            if(!valid) {
                console.log(TAG,`Invalid sesion token ${token}`);
                res.sendStatus(403); // token neplatný nebo vypršel
                return;
            } 
            next(); // token je platný, pokračuj dál
        }
    }
  
}