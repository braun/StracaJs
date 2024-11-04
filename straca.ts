
import * as express from 'express';

export class Straca
{
    app:express.Express
    constructor(app:express.Express)
    {
        this.app = app;
    }
}