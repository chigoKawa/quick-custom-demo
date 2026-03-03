"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Function = void 0;
var runtype_1 = require("../runtype");
/**
 * Construct a runtype for functions.
 */
exports.Function = runtype_1.create(function (value) {
    return typeof value === 'function'
        ? { success: true, value: value }
        : {
            success: false,
            message: "Expected function, but was " + (value === null ? value : typeof value),
        };
}, { tag: 'function' });
