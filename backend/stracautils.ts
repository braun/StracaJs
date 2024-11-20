import dayjs = require("dayjs");
import { Message } from "../common/models/message";
import { MessageLoadRequest } from "../common/models/mstore";
import * as fs from 'fs';

/**
 * Takes message content from file. returns function what
 *  encapsulate wit message evenelope by provided example
 * @param path path to file to load
 * @returns Message creating function
 */
export function messageContentFromFile(path:string)
{
    return async (req:MessageLoadRequest)=>
    {
       const json = await readJsonFile(path);
       if(json == null)
        return null;

        const rv:Message = {
            meta: {
    
                messageUid: Guid.newGuid() ,
                messageType: req.example.meta.messageType,
                created: dayjs().toISOString()
            },
            content: json
        }
        return rv;
    }
}

/**
 * Read content of file and parses it to json
 * @param path file to read
 * @returns 
 */
export async function readJsonFile(path:string)
{
    const jsonstr = await fs.promises.readFile(path,{encoding:'utf8'});
    if(jsonstr == null)
        return null;

    const json = JSON.parse(jsonstr);

    return json;
}


/** 
GUID Creation
Project: https://github.com/Steve-Fenton/TypeScriptUtilities
Author: Steve Fenton
Example usage:

var id = Guid.newGuid();
*/
export class Guid {
    static newGuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
        });
    }
}