/*
** Copyright © 2019, Oracle and/or its affiliates. All rights reserved.
** Licensed under the Universal Permissive License v 1.0 as shown at http://oss.oracle.com/licenses/upl
*/

const Config = require("../config/config");
const GeneralConfig = require("../../../../config/config");
const agentImpl = require("../../../agentImpl/" + GeneralConfig.AGENT_IMPL_FILE);
const axios = require("axios");
const util = require("util");
const log4js = require("log4js");
const logger = log4js.getLogger("RestConnector");
logger.level = "debug";

module.exports.send = async function (endpoint, payload) {
    try {
        let request = await agentImpl.prototype.buildRestCallPayload(payload, endpoint);
        logger.info("Sending Message to agent.");
        let result = await axios(request);
        if (result && result.data) {
            await agentImpl.prototype.restCallResult(payload, result.data, endpoint , result.status);
        }
        logger.info("Successfully sent message to agent");
    } catch (error) {
        let errorMessage = util.format("Error relying payload, detailed error: %s", error.message);
        logger.error(errorMessage);
        throw new Error(errorMessage);
    }
};
module.exports.AGENT_ENDPOINT_REQUEST_CHAT = Config.AGENT_ENDPOINT_REQUEST_CHAT;
module.exports.AGENT_ENDPOINT_TERMINATE_CHAT = Config.AGENT_ENDPOINT_TERMINATE_CHAT;
module.exports.AGENT_ENDPOINT_SEND_CHAT = Config.AGENT_ENDPOINT_SEND_CHAT;