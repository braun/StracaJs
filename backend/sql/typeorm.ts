import { DataSource, DataSourceOptions, EntitySchema, MixedList } from "typeorm"

export class TypeormWrapper
{
    protected _dataSource:DataSource;
    protected _options:DataSourceOptions;
    protected _entities: MixedList<Function | string | EntitySchema> = [];
    constructor(datasorceOpts:DataSourceOptions)
    {
        this._options = datasorceOpts;
    }

    addEntity(entity:Function | string | EntitySchema)
    {
        (this._entities as any).push(entity);
        return this;
    }
    async buildDataSource()
    {
        const opts:DataSourceOptions = 
            Object.assign({
                entities: this._entities,
                synchronize: true,
                logging: false
            },this._options);
        this._dataSource = new DataSource(opts);

        // to initialize the initial connection with the database, register all entities
        // and "synchronize" database schema, call "initialize()" method of a newly created database
        // once in your application bootstrap
        await this._dataSource.initialize()
    }

    get dataSource()
    {
        return this._dataSource;
    }
} 