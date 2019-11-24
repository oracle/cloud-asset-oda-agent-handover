/*
** Copyright © 2019, Oracle and/or its affiliates. All rights reserved.
** Licensed under the Universal Permissive License v 1.0 as shown at http://oss.oracle.com/licenses/upl
*/

// Agent API Base URL
const AGENT_API_BASE_URL = "http://localhost:4445/agent/api/chat/v1/";

const log4js = require("log4js");
const logger = log4js.getLogger("AgentImpl");
logger.level = "debug";

class MockAgent {
    constructor() {

    }

    /**
     * Transform a message payload from webhook structure to Agent structure. 
     * @returns {object} agent message
     * @param {object} payload : Message Payload to send to agent, you need to transform to agent message payload.
     * @param {string} payloadType : Flag to indicate the payload type. Allowed values are requestChat|concludeChat|postMessage
     */
    async toAgentPayloadStructure(payload, payloadType) {
        try {
            switch (payloadType) {
            case "requestChat": {
                // Transform payload to agent requestChat payload
                break;
            }
            case "concludeChat": {
                // Transform payload to agent terminateChat payload
                break;
            }
            case "postMessage": {
                // Transform payload to agent postChat payload
                break;
            }
            }
            return payload;
        } catch (error) {
            logger.error("Error transforming payload from ODA format to agent format, detailed error: %s", error.message);
            throw new Error(error);
        }
    }


    /**
     * Transform a message payload from Agent structure to webhook payload structure.
     * @returns {object} ODA Message payload
     * @param {string} payload : Agent message payload to transform to ODA format
     */
    async fromAgentPayloadStructure(payload) {
        try {
            return payload;
        } catch (error) {
            logger.error("Error transforming payload from agent format to ODA format, detailed error: %s", error.message);
            throw new Error(error);
        }
    }

    /**
     * Build an axios config body as documented in https://github.com/axios/axios that will be used for the REST call to agent API.
     * @returns {object} an axios config body.
     * @param {object} payload : Payload to send to agent API.
     * @param {string} payloadType : Flag to indicate the payload type. Allowed values are requestChat|concludeChat|postMessage. payloadType can be used to determine the appropriate Agent API endpoint to call.
     */
    async buildRestCallPayload(payload, payloadType) {

        try {
            let request = {
                method: "POST", // HTTP method
                data: payload, // method body
                url: AGENT_API_BASE_URL + payloadType,
                responseType: "json",
                // validateStatus: function (status) {
                //     return (status >= 200 && status < 300) // Default
                // },
                // headers: { // Agent API headers
                //     "X-Custom-Header": "foobar",
                //     "X-Custom-Header2": "foobar2",
                // },
                // auth: {
                //     username: "MY_USER", // Agent API userName
                //     password: "mypassword" // Agent API Password
                // },
                // proxy: {
                //     host: "127.0.0.1", // Proxy Server Address
                //     port: 8080, // Proxy Server Port
                //     auth: {
                //         username: "MY_USER", // Proxy Server UserName
                //         password: "myPassword" // Proxy Server Password
                //     }
                // }
            };
            return request;
        } catch (error) {
            logger.error("Error building rest call payload to agent, detailed error: %s", error.message);
            throw new Error(error);
        }
    }

    /**
     * Result of calling "buildRestCallPayload" are passed to this method
     * @param {object} payload : The payload sent by "buildRestCallPayload" method to Agent.
     * @param {object} result : The result of calling "buildRestCallPayload" method if any.
     * @param {string} payloadType : Flag to indicate the payload type. Allowed values are requestChat|concludeChat|postMessage. payloadType can be used to determine the appropriate Agent API endpoint to call.
     * @param {number} statusCode: HTTP Response Code for calling the REST end point
     */
    // eslint-disable-next-line no-unused-vars
    async restCallResult(payload, result, payloadType, statusCode) {
        try {
            // Do something with result if needed
        } catch (error) {
            logger.error("Error processing agent rest call result, detailed error: %s", error.message);
            throw new Error(error);
        }
    }
}
module.exports = MockAgent;