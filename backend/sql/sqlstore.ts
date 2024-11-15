​import { Database } from 'sqlite3';
import { MessageListenerContext, MessageLoadRequest, MessageLoadResult, MessageSaveResult, MessageStore } from '../../common/models/mstore';
import { Message } from '../../common/models/message';
import * as dayjs from 'dayjs';

import { DataSource, SelectQueryBuilder } from "typeorm"

import { StoredMessage } from './storemessage';
import { TypeormWrapper } from './typeorm';


const TAG="SQLSTORE";

export class SqlStore implements MessageStore
{

    protected typeorm:TypeormWrapper;

    constructor(typeorm:TypeormWrapper)
    {
      this.typeorm = typeorm;
      this.typeorm.addEntity(StoredMessage);
    }
  

   async save(msg: Message): Promise<MessageSaveResult> {
       const rep = this.typeorm.dataSource.getRepository(StoredMessage);
       const storedmsg = new StoredMessage();
       Object.assign(storedmsg,msg.meta);
       storedmsg.meta = JSON.stringify(msg.meta);
       storedmsg.content = JSON.stringify(msg.content);
       await rep.save(storedmsg);
       
       const rv:MessageSaveResult  = {
           data: msg
       }
       return rv;
    }
    async loadByExample(request: MessageLoadRequest): Promise<MessageLoadResult> {     
       const rep = this.typeorm.dataSource.getRepository(StoredMessage);
        const qb = rep.createQueryBuilder();
        const example = request.example;

      this.buildWhereForExample(qb,example);
    
        const cur = await qb.getMany();

        const res:Message[] = [];
        for(const m of cur)
        {
            const msg:Message = {
                meta: JSON.parse(m.meta),
                content: JSON.parse(m.content)
            }
            res.push(msg);
        }
        const rv:MessageLoadResult = {
            data: res
        }
        return rv;
    }


   async  deleteByExample(request: MessageLoadRequest): Promise<void> {
        const rep = this.typeorm.dataSource.getRepository(StoredMessage);
        const qb = rep.createQueryBuilder();
        const example = request.example;
       this.buildWhereForExample(qb,example)
    
        await qb.delete().execute();
    }
    buildWhereForExample(qb: SelectQueryBuilder<StoredMessage>, example: Message) {
        qb.where("1=1");
        if(example.meta.messageType != null)
            qb.andWhere("messageType like :mt",{mt:`${example.meta.messageType}%`})
        if(example.meta.messageUid != null)
            qb.andWhere("messageUid=:mu",{mu:example.meta.messageUid})
    }
    listen(tag: string, mtype: string): MessageListenerContext {
        throw new Error('Method not implemented.');
    }
 
}
