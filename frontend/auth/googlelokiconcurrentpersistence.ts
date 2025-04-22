import { GoogleAuth } from "./google";

export class GoogleDriveConcurrentLokiPersistenceAdapter implements LokiPersistenceAdapter {
    auth: GoogleAuth;
    private version: number = 0; // Track version for concurrent writes

    constructor(auth: GoogleAuth) {
        this.auth = auth;
    }

    loadDatabase(dbname: string, callback: (value: any) => void): void {
        const doLoad = async () => {
            try {
                const data = await this.auth.loadAppData(dbname);
                const parsedData = JSON.parse(data);

                // Handle incremental load
                if (parsedData.changes) {
                    const baseData = parsedData.base || {};
                    const changes = parsedData.changes;
                    const mergedData = this.applyChanges(baseData, changes);
                    callback(mergedData);
                } else {
                    callback(parsedData);
                }
            } catch (ex) {
                console.error("loadDatabase", ex);
                callback(ex);
            }
        };

        doLoad();
    }

    saveDatabase(dbname: string, dbstring: any, callback: (err?: Error) => void): void {
        const doSave = async () => {
            try {
                const currentData = await this.auth.loadAppData(dbname);
                const parsedData = currentData ? JSON.parse(currentData) : { base: {}, changes: [] };

                // Incremental save: Add changes to the change log
                const changes = this.generateChanges(parsedData.base, JSON.parse(dbstring));
                parsedData.changes.push(...changes);

                // Handle versioning for concurrent writes
                const newVersion = this.version + 1;
                parsedData.version = newVersion;

                await this.auth.saveAppData(JSON.stringify(parsedData), dbname);
                this.version = newVersion; // Update local version
                callback(null);
            } catch (ex) {
                console.error("saveDatabase", ex);
                callback(ex);
            }
        };

        doSave();
    }

    deleteDatabase(dbnameOrOptions: any, callback: (err?: Error, data?: any) => void): void {
        const doDelete = async () => {
            try {
                await this.auth.deleteAppData(dbnameOrOptions);
                callback(null);
            } catch (ex) {
                console.error("deleteDatabase", ex);
                callback(ex);
            }
        };

        doDelete();
    }

    // Utility to apply changes to the base data
    private applyChanges(base: any, changes: any[]): any {
        let updatedData = { ...base };
        for (const change of changes) {
            updatedData = { ...updatedData, ...change }; // Simple merge logic
        }
        return updatedData;
    }

    // Utility to generate changes (diff) between old and new data
    private generateChanges(oldData: any, newData: any): any[] {
        const changes: any[] = [];
        for (const key in newData) {
            if (newData[key] !== oldData[key]) {
                changes.push({ [key]: newData[key] });
            }
        }
        return changes;
    }
}