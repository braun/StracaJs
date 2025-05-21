import { IAuthPayload, IAuthResponse } from "../../common/auth/securitymodels";
import { StracaStoreRequest, StracaStoreResponse } from "../../common/models/stracadefs";
import { StracaInHandful } from "../handful";


/**
 * securityStracaWrapper
 * Authentication service
 * Typesafe wrapper for the StracaInHandful service security
 * This class is a wrapper around the StracaInHandful class. It provides a simple way to interact with the service security.
 * 
 * @see StracaInHandful
 */
export class SecurityStracaWrapper {

    private straca: StracaInHandful;

    constructor(straca:StracaInHandful) {
        this.straca = straca;
    }


    
    
        
        
    /**
    * Authenticate user, create session token 
    * Simply executes the operation
    * @param payload Authentication payload, provide and its generated token
    * @returns Authentication response, provide and its generated token
    */
    async auth(payload: IAuthPayload): Promise<IAuthResponse> {
      const rv =  await this.straca.simpleFetch("security","auth",payload) as IAuthResponse;
      return rv;
    }

    /**
    * Authenticate user, create session token 
    * Just prepares the request to be executed later by fetch.
    * @param payload Authentication payload, provide and its generated token
    * @param method HTTP method to be used
    * @returns newly created request
    */
    authFormRequest(payload: IAuthPayload,method:string = "POST"): StracaStoreRequest<IAuthPayload> {
        const rv = this.straca.formRequest("security","auth",method) as StracaStoreRequest<IAuthPayload>;
        rv.data = payload;
        return rv;
    }

    /**
    * Authenticate user, create session token 
    * Fetches the prepared request.
    * @param request prepared Straca
    * @returns Straca response with data: Authentication response, provide and its generated token
    */
    async authFetch(request: StracaStoreRequest<IAuthPayload>): Promise<StracaStoreResponse<IAuthResponse>> {
      const rv =  await this.straca.fetch(request) as StracaStoreResponse<IAuthResponse>;
      return rv;
    }

    /**
    * Authenticate user, create session token 
    * Forms the request and  executes the operation
    * @param payload Authentication payload, provide and its generated token
    * @param method HTTP method to be used
    * @returns Straca response with data: Authentication response, provide and its generated token
    */
    async authFormFetch(payload: IAuthPayload,method:string = "POST"): Promise<StracaStoreResponse<IAuthResponse>> {
      const request = this.authFormRequest(payload,method);
      return await this.authFetch(request);
    }



}