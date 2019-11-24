/*
** Copyright © 2019, Oracle and/or its affiliates. All rights reserved.
** Licensed under the Universal Permissive License v 1.0 as shown at http://oss.oracle.com/licenses/upl
*/

const express = require("express");
const OracleBot = require("@oracle/bots-node-sdk");
const snowConfig = require("./Config");
const SchemaValidator = require("jsonschema").Validator;
const schemaValidator = new SchemaValidator();
const log4js = require("log4js");
const logger = log4js.getLogger("AgentMockServer");
logger.level = "debug";

const app = express();
OracleBot.init(app);

// Request Chat from Bot
app.post(snowConfig.ENDPOINT_API + "/requestChat", function (req, res) {

    let body = req.body;
    let isValid = validateRequestBody(body, "/RequestChat");
    

    if (!isValid.valid) {
        res.status(400).send(isValid.response);
    } else {

        logger.info("-----------------------------------------");
        logger.info("\nReceived chat request, payload is:" , JSON.stringify(body));
        logger.info("-----------------------------------------\n\n\n");

        res.send();
    }

});

// Receive Chat Message from Bot
app.post(snowConfig.ENDPOINT_API + "/postMessage", function (req, res) {

    let body = req.body;
    let isValid = validateRequestBody(body, "/PostMessage");

    if (!isValid.valid) {
        res.status(400).send(isValid.response);
    } else {
        logger.info("-----------------------------------------");
        logger.info("\nReceived chat message, payload is:" , body);
        logger.info("-----------------------------------------\n\n\n");
        res.send(isValid.response);
    }

});

// Terminate Chat from Bot
app.post(snowConfig.ENDPOINT_API + "/concludeChat", function (req, res) {

    let body = req.body;
    let isValid = validateRequestBody(body, "/ConcludeChat");

    if (!isValid.valid) {
        res.status(400).send(isValid.response);
    } else {
        logger.info("-----------------------------------------");
        logger.info("\nReceived terminate chat request, payload is:" , body);
        logger.info("-----------------------------------------\n\n\n");
        res.send(isValid.response);
    }
});



function validateRequestBody(payload, schemaName) {

    schemaValidator.addSchema(require("./schemas/RequestChat"), "/RequestChat");
    schemaValidator.addSchema(require("./schemas/BotUser"), "/BotUser");
    schemaValidator.addSchema(require("./schemas/ConversationHistoryList"), "/ConversationHistoryList");
    schemaValidator.addSchema(require("./schemas/ConversationHistory"), "/ConversationHistory");
    schemaValidator.addSchema(require("./schemas/PostMessage"), "/PostMessage");
    schemaValidator.addSchema(require("./schemas/ConcludeChat"), "/ConcludeChat");
    schemaValidator.addSchema(require("./schemas/ActionsList"), "/ActionsList");
    schemaValidator.addSchema(require("./schemas/ActionItem"), "/ActionItem");

    let validator = schemaValidator.validate(payload, schemaName);

    let result = {
        valid: true,
        response: "success"
    };

    if (validator.errors.length > 0) {
        let errorMessage;
        if (validator.errors.length == 1) {
            errorMessage = {
                error: validator.errors[0].stack
            };
        } else {
            errorMessage = [];
            validator.errors.forEach(function (error) {
                errorMessage.push({
                    error: error.stack
                });
            });
        }
        logger.error(JSON.stringify(errorMessage));
        result.valid = false;
        result.response = errorMessage;

    }
    return result;
}

app.listen(4445, function () {
    logger.info("Mock server running on port 4445");
});