/*
** Copyright © 2019, Oracle and/or its affiliates. All rights reserved.
** Licensed under the Universal Permissive License v 1.0 as shown at http://oss.oracle.com/licenses/upl
*/

const Config = require("../config/config");
const GeneralConfig = require("../../../../config/config");
const agentImpl = require("../../../agentImpl/" + GeneralConfig.AGENT_IMPL_FILE);
const util = require("util");
const SchemaValidator = require("jsonschema").Validator;
const schemaValidator = new SchemaValidator();
const RestConnector = require("../../restConnector/impl/RestConnector");
const UserStore = require("../../userStore/impl/UserStore");
const log4js = require("log4js");
const logger = log4js.getLogger("Agent Sender");
logger.level = "debug";
class AgentSender {

    constructor() {
    }

    async processBotMessage(message) {
        let self = this;
        try {
            if (!message) {
                throw new Error("bot message can't be empty");
            }

            if (!message.messagePayload || !message.messagePayload.type) {
                throw new Error("bot message must have a 'type'");
            }

            let messageType = message.messagePayload.type;
            switch (messageType) {
            case Config.REQUEST_CHAT:
            {
                await self.requestChat(message);
                break;
            }
            case Config.CHAT_MESSAGE:
            {
                await self.sendChatMessageToAgent(message);
                break;
            }
            case Config.TERMINATE_CHAT:
            {
                await self.endChatWithAgent(message);
                break;
            }
            default:
            {
                throw new Error("invalid bot message 'type'");
            }
            }

        } catch (error) {

            throw new Error(error.message);
        }
    }

    async requestChat(payload) {
        let self = this;

        
        try {
            let isValid = self.validateRequestBody("/RequestChat", payload);
            if (!isValid.valid) {
                throw new Error("Invalid Chat Request Body");
            }
            // Check if there is an existing chant request for user, if yes, do not submit a new request
            const userExists = await self.getBotUserInfo(payload.userId);
            if(userExists){
                const errorMessage = util.format("An existing chat request for user [%s] already exists, skip sending a new chat request." , payload.userId);
                throw new Error(errorMessage);
            }
            let agentPayload = {
                botUser: {
                    userId: payload.userId
                },
                conversationHistory: payload.messagePayload.conversationHistory,
                actions: payload.messagePayload.actions,
                firstName: payload.messagePayload.userProfile.firstName,
                lastName: payload.messagePayload.userProfile.lastName,
                email: payload.messagePayload.userProfile.email,
                message: payload.messagePayload.text,
                metadata: payload.messagePayload.customProperties
            };

            await self.storeBotUserInfo(payload);

            await self.sendRequestToAgent(agentPayload, Config.REQUEST_CHAT);
            logger.log("Successfully requested chat with agent");
        } catch (error) {
            let errorMessage = util.format("Error Requesting chat from Agent, detailed error: %s", error.message);
            logger.error(errorMessage);
            throw new Error(errorMessage);
        }
    }

    async sendChatMessageToAgent(payload) {
        let self = this;
        try {
            let isValid = self.validateRequestBody("/ChatMessage", payload);
            if (!isValid.valid) {
                throw new Error("Invalid Chat Message Body");
            }

            let userId = payload.userId;
            let agentPayload = {
                botUser: {
                    userId: userId
                },
                sessionId: payload.messagePayload.channelExtensions.agentChannelSessionId,
                message: payload.messagePayload.text
            };

            await self.sendRequestToAgent(agentPayload, Config.CHAT_MESSAGE);
            logger.log("Successfully sent chat message to agent");
        } catch (error) {
            let errorMessage = util.format("Error sending chat message to Agent, detailed error: %s", error.message);
            logger.error(errorMessage);
            throw new Error(errorMessage);
        }
    }

    async endChatWithAgent(payload) {
        let self = this;
        try {
            let isValid = self.validateRequestBody("/TerminateChat", payload);
            if (!isValid.valid) {
                throw new Error("Invalid Terminate Chat Message Body");
            }
            let userId = payload.userId;
            let agentPayload = {
                botUser: {
                    userId: userId
                },
                sessionId: payload.messagePayload.channelExtensions.agentChannelSessionId,
            };
            // Send End Chat Message to Agent
            await self.sendRequestToAgent(agentPayload, Config.TERMINATE_CHAT);
            // Delete bot userId/agent sessionId mapping from DB
            await self.deleteBotUserInfo(userId);
            logger.log("Successfully terminated chat with agent");
        } catch (error) {
            let errorMessage = util.format("Error terminating chat with Agent, detailed error: %s", error.message);
            logger.error(errorMessage);
            throw new Error(errorMessage);
        }
    }

    async sendRequestToAgent(payload, resourceName) {
        try {
            if (!payload || !resourceName) {
                throw new Error("Missing requried parameters [payload, resourceName]");
            }

            switch (resourceName) {
            case Config.REQUEST_CHAT:
            {
                resourceName = RestConnector.AGENT_ENDPOINT_REQUEST_CHAT;
                break;
            }
            case Config.TERMINATE_CHAT:
            {
                resourceName = RestConnector.AGENT_ENDPOINT_TERMINATE_CHAT;
                break;
            }
            case Config.CHAT_MESSAGE:
            {
                resourceName = RestConnector.AGENT_ENDPOINT_SEND_CHAT;
                break;
            }
            }
            // Transform Message payload to Agent specific Payload
            payload = await agentImpl.prototype.toAgentPayloadStructure(payload, resourceName);
            await RestConnector.send(resourceName, payload);
            logger.info("Successfully sent request payload");
        } catch (error) {
            let errorMessage = util.format("Error sending request to Agent, detailed error: %s", error.message);
            logger.error(errorMessage);
            throw new Error(errorMessage);
        }
    }

    async storeBotUserInfo(payload) {

        let self = this;
        try {
            let isValid = self.validateRequestBody(payload);
            if (!isValid.valid) {
                throw new Error("Can't store user info, invalid message body");
            }
            let {
                webhookChannelId,
                channelName,
                channelId
            } = payload.messagePayload;
            let {
                userId
            } = payload;

            let dbRow = {
                "userId": userId,
                "channelName": channelName,
                "userChannelId": channelId,
                "channelId": webhookChannelId
            };
            await UserStore.mergeUser(dbRow.userId , dbRow);

            logger.info("Successfully persisted user chat session info in DB");

            return;

        } catch (error) {
            let errorMessage = util.format("Error storing user info in DB, detailed error: %s", error.message);
            logger.error(errorMessage);
            throw new Error(errorMessage);
        }

    }

    async getBotUserInfo(userId) {
        try {
            if (!userId) {
                throw new Error("Missing userID");
            }
            let result = UserStore.getUser(userId);
            return result;

        } catch (error) {
            let errorMessage = util.format("Error fetching user [%s] info from AMC DB, detailed error: %s", userId, error.message);
            logger.error(errorMessage);
            throw new Error(errorMessage);

        }
    }

    async deleteBotUserInfo(userId) {
        try {
            if (!userId) {
                throw new Error("Missing userID");
            }
            UserStore.deleteUser(userId);
        } catch (error) {
            let errorMessage = util.format("Error deleting user [%s] info from DB, detailed error: %s", userId, error.message);
            logger.error(errorMessage);
            throw new Error(errorMessage);

        }
    }

    validateRequestBody(schemaName, payload) {

        schemaValidator.addSchema(require("./schemas/RequestChat"), "/RequestChat");
        schemaValidator.addSchema(require("./schemas/UserProfile"), "/UserProfile");
        schemaValidator.addSchema(require("./schemas/MessagePayload"), "/MessagePayload");
        schemaValidator.addSchema(require("./schemas/RequestChatMessagePayload"), "/RequestChatMessagePayload");
        schemaValidator.addSchema(require("./schemas/ConversationHistoryList"), "/ConversationHistoryList");
        schemaValidator.addSchema(require("./schemas/ConversationHistory"), "/ConversationHistory");
        schemaValidator.addSchema(require("./schemas/ActionsList"), "/ActionsList");
        schemaValidator.addSchema(require("./schemas/ActionItem"), "/ActionItem");
        schemaValidator.addSchema(require("./schemas/ChatMessage"), "/ChatMessage");
        schemaValidator.addSchema(require("./schemas/TerminateChat"), "/TerminateChat");

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

}
module.exports = AgentSender;