"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerObjectStorageRoutes = exports.setObjectAclPolicy = exports.getObjectAclPolicy = exports.canAccessObject = exports.objectStorageClient = exports.ObjectNotFoundError = exports.ObjectStorageService = void 0;
var objectStorage_1 = require("./objectStorage");
Object.defineProperty(exports, "ObjectStorageService", { enumerable: true, get: function () { return objectStorage_1.ObjectStorageService; } });
Object.defineProperty(exports, "ObjectNotFoundError", { enumerable: true, get: function () { return objectStorage_1.ObjectNotFoundError; } });
Object.defineProperty(exports, "objectStorageClient", { enumerable: true, get: function () { return objectStorage_1.objectStorageClient; } });
var objectAcl_1 = require("./objectAcl");
Object.defineProperty(exports, "canAccessObject", { enumerable: true, get: function () { return objectAcl_1.canAccessObject; } });
Object.defineProperty(exports, "getObjectAclPolicy", { enumerable: true, get: function () { return objectAcl_1.getObjectAclPolicy; } });
Object.defineProperty(exports, "setObjectAclPolicy", { enumerable: true, get: function () { return objectAcl_1.setObjectAclPolicy; } });
var routes_1 = require("./routes");
Object.defineProperty(exports, "registerObjectStorageRoutes", { enumerable: true, get: function () { return routes_1.registerObjectStorageRoutes; } });
//# sourceMappingURL=index.js.map