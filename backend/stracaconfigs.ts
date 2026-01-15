import { StracaStoreRequest, StracaStoreResponse } from "@straca/common/models/stracadefs";
import { Straca } from "./straca";
import {  IStracaConfigRequest, IStracaConfigResponse } from "@straca/common/models/configs";

import { join } from "path";
import * as fs from "fs";

export class StracaConfigs
{
    straca: Straca;
    constructor(straca:Straca)
    {
        this.straca = straca;

        this.straca.addService({
            service:"configs",
            rationale:"straca configuration service",
            operations:[
                {
                    operation:"getConfig",
                    rationale:"get straca configuration jsons from server",
                    payload:"IStracaConfigRequest",
                    payloadRationale:"request to get config json by name",
                    response:"IStracaConfigResponse",
                    responseRationale:"response with specified config json",
                    handle:async (req:StracaStoreRequest<IStracaConfigRequest>,
                         res:StracaStoreResponse<IStracaConfigResponse>) => {
                        const name = req.data.name;
                        if(!name)
                        {
                          res.ok = false;
                          res.comment = "Config name is not specified";
                            return;
                        }
                        const config = await this.getConfig(name);
                        if(!config)
                        {
                            res.ok = false;
                            res.comment = "Config not found or cannot be read";
                            return;
                        }
                        res.data = {
                            name: name,
                            config: config
                        };
                    }
                }
            ]
        });
    }


    /**
     * Get config json by name
     * @param name name of the config to get
     * @returns config json or null if not found
     */
    async getConfig<T=any>(name:string,defval:T = null,options?: { folder?: string }):Promise<T>
    {
        const fname = join(this.straca.datadir, options?.folder ?? "configs", name + ".json");
        if(!fs.existsSync(fname))
            return defval;
        const content = await fs.promises.readFile(fname, "utf-8");
        if(content == null || content.trim() == "")
            return defval;

        const config:T = JSON.parse(content);
        return  config;
    }
}