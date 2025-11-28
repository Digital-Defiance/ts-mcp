"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Calculator = exports.calculate = exports.greet = void 0;
// Sample TypeScript file for source map testing
function greet(name) {
    var message = "Hello, ".concat(name, "!");
    return message;
}
exports.greet = greet;
function calculate(a, b) {
    var sum = a + b;
    var product = a * b;
    return sum + product;
}
exports.calculate = calculate;
var Calculator = /** @class */ (function () {
    function Calculator() {
        this.result = 0;
    }
    Calculator.prototype.add = function (value) {
        this.result += value;
        return this;
    };
    Calculator.prototype.multiply = function (value) {
        this.result *= value;
        return this;
    };
    Calculator.prototype.getResult = function () {
        return this.result;
    };
    return Calculator;
}());
exports.Calculator = Calculator;
// Main execution
if (require.main === module) {
    console.log(greet('World'));
    console.log(calculate(5, 3));
    var calc = new Calculator();
    calc.add(10).multiply(2);
    console.log(calc.getResult());
}
//# sourceMappingURL=typescript-sample.js.map