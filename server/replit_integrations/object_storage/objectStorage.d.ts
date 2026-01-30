import { Storage, File } from "@google-cloud/storage";
import { Response } from "express";
import { ObjectAclPolicy, ObjectPermission } from "./objectAcl";
export declare const objectStorageClient: Storage;
export declare class ObjectNotFoundError extends Error {
    constructor();
}
export declare class ObjectStorageService {
    constructor();
    getPublicObjectSearchPaths(): Array<string>;
    getPrivateObjectDir(): string;
    searchPublicObject(filePath: string): Promise<File | null>;
    downloadObject(file: File, res: Response, cacheTtlSec?: number): Promise<void>;
    getObjectEntityUploadURL(): Promise<string>;
    getObjectEntityFile(objectPath: string): Promise<File>;
    normalizeObjectEntityPath(rawPath: string): string;
    trySetObjectEntityAclPolicy(rawPath: string, aclPolicy: ObjectAclPolicy): Promise<string>;
    canAccessObjectEntity({ userId, objectFile, requestedPermission, }: {
        userId?: string;
        objectFile: File;
        requestedPermission?: ObjectPermission;
    }): Promise<boolean>;
}
//# sourceMappingURL=objectStorage.d.ts.map