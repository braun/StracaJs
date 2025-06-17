import { IEmailChallengeResponse, IEmailOtpPayload, IEmailOtpVerificationResponse } from "src/lib/straca/common/auth/email/emailauthmodels";
import { StracaStoreRequest, StracaStoreResponse } from "src/lib/straca/common/models/stracadefs";
import { StracaInHandful } from "../../handful";


/**
 * emailAuthProviderStracaWrapper
 * OTP Email authentication provider
 * Typesafe wrapper for the StracaInHandful service emailAuthProvider
 * This class is a wrapper around the StracaInHandful class. It provides a simple way to interact with the service emailAuthProvider.
 * 
 * @see StracaInHandful
 */
export class EmailAuthProviderStracaWrapper {

    private straca: StracaInHandful;

    constructor(straca:StracaInHandful) {
        this.straca = straca;
    }


    
    
        
        
    /**
    * Sends email with OTP challenge to user 
    * Simply executes the operation
    * @param payload user email to send OTP to
    * @returns response with email and sent status
    */
    async sendEmailChallenge(payload: IEmailOtpPayload): Promise<IEmailChallengeResponse> {
      const rv =  await this.straca.simpleFetch("emailAuthProvider","sendEmailChallenge",payload) as IEmailChallengeResponse;
      return rv;
    }

    /**
    * Sends email with OTP challenge to user 
    * Just prepares the request to be executed later by fetch.
    * @param payload user email to send OTP to
    * @param method HTTP method to be used
    * @returns newly created request
    */
    sendEmailChallengeFormRequest(payload: IEmailOtpPayload,method:string = "POST"): StracaStoreRequest<IEmailOtpPayload> {
        const rv = this.straca.formRequest("emailAuthProvider","sendEmailChallenge",method) as StracaStoreRequest<IEmailOtpPayload>;
        rv.data = payload;
        return rv;
    }

    /**
    * Sends email with OTP challenge to user 
    * Fetches the prepared request.
    * @param request prepared Straca
    * @returns Straca response with data: response with email and sent status
    */
    async sendEmailChallengeFetch(request: StracaStoreRequest<IEmailOtpPayload>): Promise<StracaStoreResponse<IEmailChallengeResponse>> {
      const rv =  await this.straca.fetch(request) as StracaStoreResponse<IEmailChallengeResponse>;
      return rv;
    }

    /**
    * Sends email with OTP challenge to user 
    * Forms the request and  executes the operation
    * @param payload user email to send OTP to
    * @param method HTTP method to be used
    * @returns Straca response with data: response with email and sent status
    */
    async sendEmailChallengeFormFetch(payload: IEmailOtpPayload,method:string = "POST"): Promise<StracaStoreResponse<IEmailChallengeResponse>> {
      const request = this.sendEmailChallengeFormRequest(payload,method);
      return await this.sendEmailChallengeFetch(request);
    }


    
    
        
        
    /**
    * Verifies OTP entered by user 
    * Simply executes the operation
    * @param payload user email and OTP to verify
    * @returns response with email and verification status
    */
    async verifyOtp(payload: IEmailOtpPayload): Promise<IEmailOtpVerificationResponse> {
      const rv =  await this.straca.simpleFetch("emailAuthProvider","verifyOtp",payload) as IEmailOtpVerificationResponse;
      return rv;
    }

    /**
    * Verifies OTP entered by user 
    * Just prepares the request to be executed later by fetch.
    * @param payload user email and OTP to verify
    * @param method HTTP method to be used
    * @returns newly created request
    */
    verifyOtpFormRequest(payload: IEmailOtpPayload,method:string = "POST"): StracaStoreRequest<IEmailOtpPayload> {
        const rv = this.straca.formRequest("emailAuthProvider","verifyOtp",method) as StracaStoreRequest<IEmailOtpPayload>;
        rv.data = payload;
        return rv;
    }

    /**
    * Verifies OTP entered by user 
    * Fetches the prepared request.
    * @param request prepared Straca
    * @returns Straca response with data: response with email and verification status
    */
    async verifyOtpFetch(request: StracaStoreRequest<IEmailOtpPayload>): Promise<StracaStoreResponse<IEmailOtpVerificationResponse>> {
      const rv =  await this.straca.fetch(request) as StracaStoreResponse<IEmailOtpVerificationResponse>;
      return rv;
    }

    /**
    * Verifies OTP entered by user 
    * Forms the request and  executes the operation
    * @param payload user email and OTP to verify
    * @param method HTTP method to be used
    * @returns Straca response with data: response with email and verification status
    */
    async verifyOtpFormFetch(payload: IEmailOtpPayload,method:string = "POST"): Promise<StracaStoreResponse<IEmailOtpVerificationResponse>> {
      const request = this.verifyOtpFormRequest(payload,method);
      return await this.verifyOtpFetch(request);
    }



}