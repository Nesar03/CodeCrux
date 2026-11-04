const validator = require("validator");

const validate = (data) => {
    const mandatoryField = ['firstName', 'emailId', 'password'];

    const IsAllowed = mandatoryField.every((k) => Object.keys(data).includes(k));
    if (!IsAllowed)
        throw new Error("Some Field Missing");

    if (typeof data.firstName !== 'string' || typeof data.emailId !== 'string' || typeof data.password !== 'string')
        throw new Error("Invalid input");

    if (!validator.isEmail(data.emailId))
        throw new Error("Invalid Email");

    if (!validator.isStrongPassword(data.password))
        throw new Error("Weak Password: use 8+ characters with upper, lower, number and symbol");
};

module.exports = validate;
