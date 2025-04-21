import { HTTPGETS } from "helpers/hejlutils";
import * as Loki from "lokijs";
import * as lodash from 'lodash';

const COL_METADATA = "harnessMetadata";


export class LokiHarness
{
    _dbname:string = "loki";
    _db:Loki;
    _adapter:LokiPersistenceAdapter;
    _setup:(h:LokiHarness) => void;

    _collections:{[key:string]:LokiHarnessCollection<any>} = {}
    protected _isready: boolean;
  

    public constructor()
    {}

    /**
     * Adds the collections to db
     * @param cols collections to be used by this database
     * @returns this
     */
  addCollections(cols: LokiHarnessCollection<any>|LokiHarnessCollection<any>[]): LokiHarness {
    
    if(!Array.isArray(cols))
        cols = [cols]
    
    for(let col of cols)
    {
        this._collections[col.name] = col;
        col.harness(this);
    }
    return this;
  }
    /**
     * closes the db, db cannot be used more
     */
    close() {
        for(let coln in this._collections)
            this._collections[coln].onDbClose();
        this._collections = {}
        this.Db.close();
        this._isready = false;
      }


    /**
     * configure the database name
     * @param name name of the database (database file)
     * @returns this
     */
    dbname(name:string)
    {
        if(name)
          this._dbname = name;
        return this;
    }

   /**
     * Configure the persistence adapter;
     * @param adapter persistence adapter
     * @returns this
     */
    adapter(adapter:LokiPersistenceAdapter)
    {
        this._adapter = adapter;
        return this;
    }

    /**
     * sets handler for new db. 
     * @param s loki harness to be setup
     * @returns this.
     */
    onNewDb(s:(h:LokiHarness) => void)
    {
        this._setup = s;
        return this;
    }

    
   build(builtCallback?:(db:LokiHarness)=>void)
    {
        const rv = new Promise<LokiHarness>((resolve, reject) =>
        {
            const options:Partial<LokiConstructorOptions> & Partial<LokiConfigOptions> & Partial<ThrottledSaveDrainOptions> = {
                autoload: true,
                autosave:true,
                autosaveInterval:5000,
                autoloadCallback:()=>this.onLoad((db:LokiHarness)=>{
                   
                    if(builtCallback)
                         builtCallback(db);
                    resolve(db);
                })
            }
            if(this._adapter)
                options.adapter = this._adapter;
            this._db = new Loki(this._dbname,options);
        
        });
        return rv;
    }
   
    async onLoad(builtCallback?:(db:LokiHarness)=>void)
    {
       try
       {
            if(this.Db.getCollection(COL_METADATA) == null)
            {  
                if(this._setup)
                    this._setup(this);
            }
            this.addCollections(LOKICOLLECTION(COL_METADATA));
            await this._createCollections();
            this._isready = true;
            if(builtCallback)
                builtCallback(this);
        }
        catch(err)
        {
            console.error(`LOKI ${this.Db.name}`,"onLoad",err)
        }
    }
    private async _createCollections() {
        for(let coln in this._collections)
        {
            const col = this._collections[coln];
            try
            {
                await col._createCollection();
            }
            catch(err)
            {
                console.error(`LOKI ${this.Db.name}.${col.name}`,"onLoad",err)
            }
        }
    }
    
    get isReady()
    {
        return this._isready;
    }
    /**
     * return the metadata collection
     */
    get metadata()
    {
        return this._collections[COL_METADATA];
    }

    /**
     * deletes and closes the db, this instance cannot be used more
     */
    delete()
    {
        this.Db.deleteDatabase(null,()=>this.close())
    }
    
    get Db()
    {
       return this._db;
    }

  

    /**
     * utility function to clone lokijs document
     * @param ob document to clone
     * @param removeid remove $loki ?
     * @return cloned document
     */
    static clone<T extends object>(doc:T,removeid:boolean= true):T
    {
        const clonedDoc = lodash.cloneDeep(doc);
        if(removeid)
            delete (clonedDoc as any).$loki;

        return clonedDoc;
    }
}

/**
 * Shorthand to create Loki harness
 * @param dbname name of database (database file) 
 * @returns 
 */
export const LOKI = (dbname?:string) => new LokiHarness().dbname(dbname);

export class LokiHarnessCollection<T extends object>
{
    onDbClose() {
        this._harness = null;
    }
  
  

    _defspec:string|T[];
    _name:string;
    _harness:LokiHarness;
    _collection:Collection<T>;
    _indices:(keyof T)[] = [];
    _unique:(keyof T)[] = [];

    constructor(name:string)
    {
        this._name = name;
    }

    /**
     * returns the name of the collection
     */
    get  name()
    {
     return this._name;
    };

    harness(harness:LokiHarness)
    {
        this._harness = harness;
       
    }

    /**
     * sets default documents to be inserted into collection
     * @param defspec default values url to json document or array of objects
     * @returns this
     */
    defaults(defspec: string|T[]) {
        this._defspec = defspec;
        return this;
       }


    /**
    * adds binary index
    * @param column cproperty to be indexed`
    * @returns this
    */
    index(column:keyof T)
    {
        this._indices.push(column);
        return this;
    }

    /**
     * stups the unique key for the collection
     * @param unique unique key for the collection
     * @returns this
     */
    unique(unique:(keyof T)[])
    {
        this._unique = unique;
        return this;
    }
    /**
     *  database this collection uses
     */
    get Db()
    {
        return this._harness.Db;
    }

    /**
     * underlying loki collection
     */
    get col()
    {
        return this._collection;
    }

    /**
     * inserts new object into collection
     * @param o object to insert
     * @returns inserted object
     */
    insert(o:T)
    {
       const rv = this.col.insert(o);
       this.col.changes
       return rv;
    }

    /**
     * updates or inserts given object
     * @param o object to update
     * @returns update object
     */
    update(o:T)
    {
        if(o == null)
            return null;
       const newone = (o as any)["$loki"] == null;

       const rv = newone ? this.insert(o): this.col.update(o);
       return rv;
    }

    /**
     * delete specified document
     * @param o document to be delete
     */
    delete(o: T) {
       this.col.remove(o);
    }
    /**
     * shorhand for col.chain()
     */
    chain() {
        return this.col.chain();
      }

    /**
     * internal method, used to check and create the collection in the database
     */
     async _createCollection() {
        this._collection = this.Db.getCollection(this.name);
        if(this._collection == null)
        {
            const opts: Partial<CollectionOptions<T>> = {}
            if(this._indices.length > 0)
                opts.indices = this._indices;
            if(this._unique.length >0)
                opts.unique = this._unique;
            this._collection = this.Db.addCollection(this.name,opts);

            if(this._defspec)
            {
                if(typeof this._defspec == 'string')
                {
                    const s = await HTTPGETS(this._defspec);
                    this._defspec = JSON.parse(s);
                }
                this.col.insert(this._defspec as T[])
            }
        }
    }
}

/**
 * Shorthand to create new LokiHarnessCollection
 * @param name name of collection
 * @returns new collection harness
 */
export const LOKICOLLECTION = <T extends object>(name:string)=>new LokiHarnessCollection<T>(name);

