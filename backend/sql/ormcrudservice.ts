import { DataSource, FindManyOptions, FindOptionsWhere, ObjectLiteral } from "typeorm";
import { Straca, StracaExpressRequest, StracaOperationDescription, StracaService, StracaServiceDescription, StracaSurroundingData } from "../straca";
import { TypeormWrapper } from "./typeorm";
import { ServiceConfigurator } from "../serviceconfigurator";
import { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import { StracaStoreRequest, StracaStoreResponse } from "@straca/common/models/stracadefs";
import * as express from 'express';
import { IOrmCrudServicePaginator } from "@straca/common/models/ormquery";

export interface IOrmCrudServiceOptions<T>
{
    entityClass: Function | string,
    entityInterface: string,
    entityDocumentationName: string,
    entityKey: (e:T)=>FindOptionsWhere<T>,
    readKey: (e:StracaStoreRequest<T>)=>FindOptionsWhere<T>,
  
    typeorm:TypeormWrapper,
    serviceDescription: StracaServiceDescription,

    create?: IOrmCrudServiceOperationOptions<T>,
    update?: IOrmCrudServiceOperationOptions<T>,
    read?: IOrmCrudServiceOperationOptions<T>,
    delete?: IOrmCrudServiceOperationOptions<T>,
    list?: IOrmCrudServiceOperationOptions<T>,
}
export interface IOrmCrudServiceOperationOptions<T>
{
    description?: StracaOperationDescription,
}


export class OrmCrudService<T> 
{
   
    serviceConfigurator:ServiceConfigurator

    straca:Straca;
    typeorm:TypeormWrapper;
    entityClass: Function | string;
    options: IOrmCrudServiceOptions<T>;
    get repository() {
        return this.typeorm.dataSource.getRepository<T>(this.entityClass);
    }

    constructor(straca:Straca, options: IOrmCrudServiceOptions<T>) {
        this.straca = straca;
        this.typeorm = options.typeorm;
        this.entityClass = options.entityClass;
        this.options = options;
    }

    async create(entity: T) {
        const rv =  await this.repository.insert(entity as QueryDeepPartialEntity<T>);
        return rv;
    }

    async read(id: FindOptionsWhere<T>): Promise<T | null> {
        return await this.repository.findOneBy(id);
    }

    async update( entity: T): Promise<T> {
       const k =  this.options.entityKey(entity)
        await this.repository.update(k, entity as QueryDeepPartialEntity<T>);
       const rv =  await this.read(k);
       return rv;
    }

    async delete( entity: T): Promise<void> {
         const k =  this.options.entityKey(entity)
        const res = await this.repository.softDelete(k);
        return res.raw.affectedRows;
    }

     async list(options:FindManyOptions<T>): Promise<T[]> {
        const rv = await this.repository.find(options);
        return rv;
    }

    async createHandler(req:StracaStoreRequest, res:StracaStoreResponse, surrounding:StracaSurroundingData, expressReq:StracaExpressRequest,expressRes:express.Response)  {
                      
        const e = req.data as T;
        const result = await this.create(e);
       const k = this.options.entityKey(e);
        res.data = await this.read(k);

    }

    async  updateHandler(req:StracaStoreRequest, res:StracaStoreResponse, surrounding:StracaSurroundingData, expressReq:StracaExpressRequest,expressRes:express.Response)  {
                      
        const e = req.data as T;
        const result = await this.update(e);
        res.data = result;
    }

    async readHandler(req:StracaStoreRequest, res:StracaStoreResponse, surrounding:StracaSurroundingData, expressReq:StracaExpressRequest,expressRes:express.Response)  {                    
        const e = req.data as T;
        const k = this.options.readKey(req);
        const result = await this.read(k);
        res.data = result;
    }
    async  deleteHandler(req:StracaStoreRequest, res:StracaStoreResponse, surrounding:StracaSurroundingData, expressReq:StracaExpressRequest,expressRes:express.Response)  {
                      
        const e = req.data as T;
        const result = await this.delete(e);
        res.data = result;
    }
      async listHandler(req:StracaStoreRequest, res:StracaStoreResponse, surrounding:StracaSurroundingData, expressReq:StracaExpressRequest,expressRes:express.Response)  {                    
        const e = req.data as IOrmCrudServicePaginator;
        const result = await this.list(e);
        res.data = result;
    }
   get service() :StracaService
    {
        if(this.serviceConfigurator == null)
        {
            const servname = this.options.serviceDescription?.service || "OrmCrudService";
            const builder = this.serviceConfigurator = new ServiceConfigurator(this.options.serviceDescription || {
                service: "OrmCrudService",
                rationale: "Generic CRUD service for TypeORM entities",
            });
            
            const entitydocName = this.options.entityDocumentationName;
            const entityInterface = this.options.entityInterface;

            const createdesc: StracaOperationDescription = {
                payload: entityInterface,
                rationale: `Create a new ${entitydocName}`,
                payloadRationale: `${entitydocName} to create`,
                response: entityInterface,
                responseRationale: `Created ${entitydocName}`,
            }
            builder.operation(`create${servname}`, this.createHandler.bind(this), Object.assign(createdesc, this.options.create?.description || {}));
            
            const updatedesc: StracaOperationDescription = {
                payload: entityInterface,
                rationale: `Updates existing ${entitydocName}`,
                payloadRationale: `${entitydocName} to update`,
                response: entityInterface,
                responseRationale: `Updated ${entitydocName}`,
            }
            builder.operation(`update${servname}`, this.updateHandler.bind(this),Object.assign(updatedesc, this.options.update?.description || {}));


            const deletedesc: StracaOperationDescription = {
                payload: entityInterface,
                rationale: `Deletes existing ${entitydocName}`,
                payloadRationale: `${entitydocName} to delete`,
                response: "number",
                responseRationale: "number of deleted entries",
            }
            builder.operation(`delete${servname}`, this.deleteHandler.bind(this),Object.assign(deletedesc, this.options.delete?.description || {}));

            const readdesc: StracaOperationDescription = {
                payload: "string",
                rationale: `gets existing ${entitydocName} by key`,
                payloadRationale: `${entitydocName} to delete`,
                response: entityInterface,
                responseRationale: `found ${entitydocName}`,
            }
            builder.operation(`get${servname}`, this.readHandler.bind(this),Object.assign(readdesc, this.options.read?.description || {}));

            const listdesc: StracaOperationDescription = {
                payload: "IOrmCrudServicePaginator",
                rationale: `gets list of ${entitydocName}s`,
                payloadRationale: `filter for ${entitydocName} list`,
                response: `${entityInterface}[]`,
                responseRationale: `list of ${entitydocName}s`,
            }
            builder.operation(`list${servname}`, this.listHandler.bind(this),Object.assign(listdesc, this.options.list?.description || {}));
           
        }
        return this.serviceConfigurator.service;
    }
}