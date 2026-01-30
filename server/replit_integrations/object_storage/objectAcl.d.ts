import { File } from "@google-cloud/storage";
export declare enum ObjectAccessGroupType {
}
export interface ObjectAccessGroup {
    type: ObjectAccessGroupType;
    id: string;
}
export declare enum ObjectPermission {
    READ = "read",
    WRITE = "write"
}
export interface ObjectAclRule {
    group: ObjectAccessGroup;
    permission: ObjectPermission;
}
export interface ObjectAclPolicy {
    owner: string;
    visibility: "public" | "private";
    aclRules?: Array<ObjectAclRule>;
}
export declare function setObjectAclPolicy(objectFile: File, aclPolicy: ObjectAclPolicy): Promise<void>;
export declare function getObjectAclPolicy(objectFile: File): Promise<ObjectAclPolicy | null>;
export declare function canAccessObject({ userId, objectFile, requestedPermission, }: {
    userId?: string;
    objectFile: File;
    requestedPermission: ObjectPermission;
}): Promise<boolean>;
//# sourceMappingURL=objectAcl.d.ts.map