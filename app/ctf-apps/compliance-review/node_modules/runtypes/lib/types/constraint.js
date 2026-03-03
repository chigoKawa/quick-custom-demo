"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Guard = exports.Constraint = void 0;
var runtype_1 = require("../runtype");
var string_1 = require("./string");
var unknown_1 = require("./unknown");
function Constraint(underlying, constraint, options) {
    return runtype_1.create(function (value) {
        var name = options && options.name;
        var validated = underlying.validate(value);
        if (!validated.success) {
            return validated;
        }
        var result = constraint(validated.value);
        if (string_1.String.guard(result))
            return { success: false, message: result };
        else if (!result)
            return { success: false, message: "Failed " + (name || 'constraint') + " check" };
        return { success: true, value: validated.value };
    }, {
        tag: 'constraint',
        underlying: underlying,
        constraint: constraint,
        name: options && options.name,
        args: options && options.args,
    });
}
exports.Constraint = Constraint;
var Guard = function (guard, options) { return unknown_1.Unknown.withGuard(guard, options); };
exports.Guard = Guard;
