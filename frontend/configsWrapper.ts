import { IStracaConfigRequest, IStracaConfigResponse } from "../common/models/configs";
import { StracaStoreRequest, StracaStoreResponse } from "../common/models/stracadefs";
import { StracaInHandful } from "./handful";


/**
 * configsStracaWrapper
 * straca configuration service
 * Typesafe wrapper for the StracaInHandful service configs
 * This class is a wrapper around the StracaInHandful class. It provides a simple way to interact with the service configs.
 * 
 * @see StracaInHandful
 */
export class ConfigsStracaWrapper {

    private straca: StracaInHandful;

    constructor(straca:StracaInHandful) {
        this.straca = straca;
    }


    
    
        
        
    /**
    * get straca configuration jsons from server 
    * Simply executes the operation
    * @param payload request to get config json by name
    * @returns response with specified config json
    */
    async getConfig(payload: IStracaConfigRequest): Promise<IStracaConfigResponse> {
      const rv =  await this.straca.simpleFetch("configs","getConfig",payload) as IStracaConfigResponse;
      return rv;
    }

    /**
    * get straca configuration jsons from server 
    * Just prepares the request to be executed later by fetch.
    * @param payload request to get config json by name
    * @param method HTTP method to be used
    * @returns newly created request
    */
    getConfigFormRequest(payload: IStracaConfigRequest,method:string = "POST"): StracaStoreRequest<IStracaConfigRequest> {
        const rv = this.straca.formRequest("configs","getConfig",method) as StracaStoreRequest<IStracaConfigRequest>;
        rv.data = payload;
        return rv;
    }

    /**
    * get straca configuration jsons from server 
    * Fetches the prepared request.
    * @param request prepared Straca
    * @returns Straca response with data: response with specified config json
    */
    async getConfigFetch(request: StracaStoreRequest<IStracaConfigRequest>): Promise<StracaStoreResponse<IStracaConfigResponse>> {
      const rv =  await this.straca.fetch(request) as StracaStoreResponse<IStracaConfigResponse>;
      return rv;
    }

    /**
    * get straca configuration jsons from server 
    * Forms the request and  executes the operation
    * @param payload request to get config json by name
    * @param method HTTP method to be used
    * @returns Straca response with data: response with specified config json
    */
    async getConfigFormFetch(payload: IStracaConfigRequest,method:string = "POST"): Promise<StracaStoreResponse<IStracaConfigResponse>> {
      const request = this.getConfigFormRequest(payload,method);
      return await this.getConfigFetch(request);
    }



}