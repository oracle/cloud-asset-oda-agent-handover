/*
** Copyright © 2019, Oracle and/or its affiliates. All rights reserved.
** Licensed under the Universal Permissive License v 1.0 as shown at http://oss.oracle.com/licenses/upl
*/

// Agent API Base URL
const ecUtils = require("./ecUtils");
const AGENT_API_BASE_URL = ecUtils.EC_URI;
const UserStore = require("../../lib/userStore/impl/UserStore");
const EcListener = require("./ecListener");
const util = require("util");
const axios = require("axios");
const log4js = require("log4js");
const logger = log4js.getLogger("EngagementCloudImpl");
logger.level = "debug";

class EngagementCloudImpl {
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
            case "requestChat":
            {
                await this.requestChat(payload);
                break;
            }
            case "concludeChat":
            {
                await this.stopUserMessageListener(payload.botUser.userId);
                payload = {
                    body: payload.message,
                    botUser: payload.botUser
                };
                break;
            }
            case "postMessage":
            {
                payload = {
                    body: payload.message,
                    botUser: payload.botUser
                };
                break;
            }
            }
            return payload;
        } catch (error) {
            logger.error(error.message);
            throw error;
        }
    }


    /**
     * Transform a message payload from Agent structure to webhook payload structure.
     * @returns {object} ODA Message payload
     * @param {string} payload : Agent message payload to transform to ODA format
     */
    async fromAgentPayloadStructure(payload) {

        let message = payload.data;
        let agentResponse = {};
        if (message) {
            // Agent Chat Message
            if (message.messageName === "RNEngagementMessagePostedMessage") {
                let messageBody = message.body;
                // Check if message body contains an action
                if(messageBody.startsWith("/")){
                    const action = messageBody.substr(1);
                    agentResponse = {
                        type: "agentAction",
                        payload: {
                            botUser: {
                                userId: payload.botUserId
                            },
                            action: action,
                            sessionId: payload.sessionId
                        }
                    };

                    // Stop Listener
                    this.stopUserMessageListener(payload.botUserId);
                }
                else{
                    agentResponse = {
                        type:  "agent",
                        payload: {
                            botUser: {
                                userId: payload.botUserId
                            },
                            message: messageBody,
                            sessionId: payload.sessionId
                        }
                    };
                }
            }
            // Agent Accepted Chat Request
            else if (message.messageName === "RNEngagementParticipantAddedMessage") {
                agentResponse = {
                    type: "accepted",
                    payload: {
                        botUser: {
                            userId: payload.botUserId
                        },
                        message: message.greeting,
                        sessionId: payload.sessionId
                    }
                };
            }
            // Waiting
            else if (message.messageName === "RNEngagementWaitInformationChangedMessage") {
                const waitingMessage = util.format("You are number (%s) in the queue, please be patient our agents will serve you in (%s) seconds", message.positionString , message.averageWaitTimeSecondsString);
                agentResponse = {
                    type: "accepted",
                    payload: {
                        botUser: {
                            userId: payload.botUserId
                        },
                        message: waitingMessage,
                        sessionId: payload.sessionId
                    }
                };
            }
            // Agent Left
            else if (message.messageName === "RNEngagementConcludedMessage") {
                agentResponse = {
                    type: "agentLeft",
                    payload: {
                        botUser: {
                            userId: payload.botUserId
                        },
                        message: message.reason,
                        sessionId: payload.sessionId
                    }
                };

                // Stop Message Listener
                const ok = this.stopUserMessageListener(payload.botUserId);
                if (!ok) {
                    agentResponse = null;
                }
            }
        }

        return agentResponse;
    }

    /**
     * Build an axios config body as documented in https://github.com/axios/axios that will be used for the REST call to agent API.
     * @returns {object} an axios config body.
     * @param {object} payload : Payload to send to agent API.
     * @param {string} payloadType : Flag to indicate the payload type. Allowed values are requestChat|concludeChat|postMessage. payloadType can be used to determine the appropriate Agent API endpoint to call.
     */
    async buildRestCallPayload(payload, payloadType) {

        // Build URL
        // Get URL building blocks that were stored as a result if the authentication step.
        let authResult = null;
        try {
            authResult = await UserStore.getUser(payload.botUser.userId);
        } catch (error) {
            logger.error(error.message);
            throw error;
        }
        const baseUrl = util.format("https://%s/engagement/api/consumer/%s/v1/", authResult.domain, authResult.chatSiteName);
        let headers = {
            "Authorization": util.format("Bearer %s", authResult.jwt)
        };
        let endpoint = "";

        switch (payloadType) {
        case "requestChat":
        {
            endpoint = "requestEngagement";
            payload = {};
            break;
        }
        case "postMessage":
        {
            endpoint = "postMessage";
            //Get Engagement Cloud chat session ID
            let authResult = null;
            try {
                authResult = await UserStore.getUser(payload.botUser.userId);
            } catch (error) {
                logger.error(error.message);
                throw error;
            }
            headers.sessionId = authResult.sessionId;
            delete payload.botUser;
            break;
        }
        case "concludeChat":
        {
            endpoint = "concludeEngagement";
            //Get Engagement Cloud chat session ID
            let authResult = null;
            try {
                authResult = await UserStore.getUser(payload.botUser.userId);
            } catch (error) {
                logger.error(error.message);
                throw error;
            }
            headers.sessionId = authResult.sessionId;
            delete payload.botUser;
            break;
        }
        }

        let request = {
            method: "POST", // HTTP method
            data: payload, // method body
            baseURL: baseUrl,
            url: endpoint,
            params: {
                pool: authResult.poolId
            },
            responseType: "json",
            headers: headers
        };

        return request;
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
            if (payloadType === "requestChat") {
                // Fetch user authResult from Cache
                let authResult = await UserStore.getUser(payload.botUser.userId);
                authResult.sessionId = result.sessionId;
                await UserStore.mergeUser(payload.botUser.userId, authResult);

                // Start Engagement Cloud Listener to fetch messages from EC.
                let exitId = await new EcListener(payload.botUser.userId).start();
                authResult.exitId = exitId;
                await UserStore.mergeUser(payload.botUser.userId, authResult);
            }
        } catch (error) {
            logger.error(error.message);
            throw error;
        }
    }


    async requestChat(payload) {
        let self = this;
        try {
            const authPayload = {
                authUserName: payload.email,
                interfaceId: ecUtils.CHAT_AUTHENTICATE_INTERFACE_ID,
                question: payload.message,
                firstName: payload.firstName,
                lastName: payload.lastName,
                emailAddress: payload.email,
                queueId: ecUtils.CHAT_AUTHENTICATE_QUEUE_ID,
                productId: ecUtils.CHAT_AUTHENTICATE_PRODUCT_ID,
                incidentId: ecUtils.CHAT_AUTHENTICATE_INCIDENT_ID,
                incidentType: ecUtils.CHAT_AUTHENTICATE_INCIDENT_TYPE,
                resumeType: ecUtils.CHAT_AUTHENTICATE_RESUME_TYPE,
                mediaList: ecUtils.CHAT_AUTHENTICATE_MEDIA_LIST
            };
            const authResult = await self.authenticate(authPayload);
            authResult.botUserId = payload.botUser.userId;
            await UserStore.mergeUser(authResult.botUserId, authResult);
            return {};
        } catch (error) {
            let errorMessage = util.format("Error requesting chat from Engagement Cloud, detailed error: %s", error.message);
            logger.error(errorMessage);
            throw error;
        }
    }

    async authenticate(authPayload) {
        try {
            const request = {
                method: "POST", // HTTP method
                data: authPayload, // method body
                baseURL: AGENT_API_BASE_URL,
                url: "serviceApi/resources/latest/chatAuthenticate",
                responseType: "json",
                auth: {
                    username: ecUtils.CREDENTIALS_FA_SERVICE_USER,
                    password: ecUtils.CREDENTIALS_FA_SERVICE_USER_PASSWORD
                }
            };
            logger.info("Authenticating user chat request...");
            let response = await axios(request);

            if (response.status === 201) {
                logger.info("Chat request Authentication Successful...");
                let {
                    domain,
                    poolId,
                    jwt,
                    chatSiteName
                } = response.data;
                const authResult = {
                    domain: domain,
                    poolId: poolId,
                    jwt: jwt,
                    chatSiteName: chatSiteName
                };
                return authResult;

            } else {
                logger.error(response.data);
                throw new Error(response.data);
            }
        } catch (error) {
            let errorMessage = util.format("Error authenticating user against Engagement Cloud, detailed error: %s", error.message);
            logger.error(errorMessage);
            throw new Error(errorMessage);
        }

    }

    async stopUserMessageListener(userId){
        let authResult = null;
        try {
            authResult = await UserStore.getUser(userId);
        } catch (error) {
            logger.error(error.message);
            throw error;
        }
        if(authResult){
            logger.info("Stopping Message listener for user [%s]" , userId);
            clearInterval(authResult.exitId);
            return true;
        }
        return false;
        
    }
}
module.exports = EngagementCloudImpl;