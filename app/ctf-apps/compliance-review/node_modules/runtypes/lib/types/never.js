"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Never = void 0;
var runtype_1 = require("../runtype");
/**
 * Validates nothing (unknown fails).
 */
exports.Never = runtype_1.create(function (value) { return ({
    success: false,
    message: "Expected nothing, but was " + (value === null ? value : typeof value),
}); }, { tag: 'never' });
