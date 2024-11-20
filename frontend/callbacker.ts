/**
 * generic listener executor
 * it holds list of callback and performs specified operation on them (fires them)
 */
export class Callbacker<T>
{

    protected listeners:T[] = [];

    /**
     * Adds listener to list
     * @param listener listener to add
     */
    addListener(listener:T)
    {
        if(this.listeners.indexOf(listener) == -1)
            this.listeners.push(listener);
    }

    /**
     * fires the listeners by performing specified operation on them
     * @param oper operation to be performed on listener
     */
    fire(oper:(t:T)=>void)
    {
        for(const listener of this.listeners)
        {
            try
            {
                oper(listener);
            }
            catch(err)
            {
                console.error("Callbacker",err)
            }
        }
    }
    
}