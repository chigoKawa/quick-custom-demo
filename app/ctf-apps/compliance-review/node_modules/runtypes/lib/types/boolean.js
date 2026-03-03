"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Boolean = void 0;
var runtype_1 = require("../runtype");
/**
 * Validates that a value is a boolean.
 */
exports.Boolean = runtype_1.create(function (value) {
    return typeof value === 'boolean'
        ? { success: true, value: value }
        : {
            success: false,
            message: "Expected boolean, but was " + (value === null ? value : typeof value),
        };
}, { tag: 'boolean' });
