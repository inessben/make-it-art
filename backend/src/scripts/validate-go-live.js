const env = require("../config/env");
const { validateProductionConfig } = require("../config/validate-production");
const { validatePaymentGoLive } = require("../config/validate-payment-go-live");

validateProductionConfig(env);
validatePaymentGoLive({ environment: process.env, appConfig: env });
console.log("Payment go-live configuration validated");
