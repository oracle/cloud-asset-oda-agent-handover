/*
** Copyright © 2019, Oracle and/or its affiliates. All rights reserved.
** Licensed under the Universal Permissive License v 1.0 as shown at http://oss.oracle.com/licenses/upl
*/

const Config = require("../config/config");
const SchemaValidator = require("jsonschema").Validator;
const schemaValidator = new SchemaValidator();
const util = require("util");
const UserStore =  require("../../userStore/impl/UserStore");
const log4js = require("log4js");
const logger = log4js.getLogger("ODA Sender");
logger.level = "debug";
class ODASender {
    constructor() {
    }

    async processAgentMessage(message) {
        let self = this;
        try {

            if (!message) {
                throw new Error("Agent message can't be empty");
            }

            if (!message.type) {
                throw new Error("Agent message must have a 'type'");
            }

            let messageType = message.type;
            let response;
            switch (messageType) {
            case Config.CHAT_ACCEPTED:
            {
                response = [];
                const acceptChat = await self.acceptChat(message);
                const greetingMessage = await self.sendChatMessage(message);
                response.push(acceptChat);
                response.push(greetingMessage);
                break;
            }
            case Config.CHAT_MESSAGE:
            {
                response = await self.sendChatMessage(message);
                break;
            }
            case Config.AGENT_ACTION:
            {
                response = await self.sendAgentAction(message);
                break;
            }
            case Config.CHAT_AGENT_LEFT:
            {
                response = await self.terminateChat(message);
                break;
            }
            case Config.CHAT_REJECTED:
            {
                response = await self.rejectChat(message);
                break;
            }
            case Config.CHAT_DELAYED:
            {
                response = await self.delayChat(message);
                break;
            }
            default:
            {
                let errorMessage = "Message type is invalid";
                logger.error(errorMessage);
                throw new Error(errorMessage);
            }
            }

            return response;

        } catch (error) {
            logger.error(error.message);
            throw error;
        }
    }

    async acceptChat(payload) {
        let self = this;
        if (!payload) {
            let errorMessage = util.format("Invalid payload. Payload can't be empty");
            throw new Error(errorMessage);
        }
        try {
            logger.info("Started accept chat method...");

            let isValid = self.validateRequestBody("/ChatAccepted", payload);
            if (!isValid.valid) {
                let errorMessage = util.format("Invalid payload. %s", isValid.response);
                throw new Error(errorMessage);
            }

            let {
                userId
            } = payload.payload.botUser;

            let userInfo = await self.getBotUserInfo(userId);
            // transform message to BOT format
            let response = {
                userId: userId,
                messagePayload: {
                    type: Config.CHAT_ACCEPTED_REJECTED_MESSAGE_TYPE,
                    text: "",//payload.payload.message,
                    status: payload.type,
                    agentSessionId: payload.payload.sessionId,
                    channelUserState: {
                        channelSessionId: payload.payload.sessionId,
                        userId: userId,
                        channelId: userInfo.channelId,
                        userChannelId: userInfo.userChannelId
                    }
                }
            };

            let agentResponse = await self.prepareRequestForODA(response);
            logger.log("Successfully sent chat accepted from agent to bot");
            return agentResponse;
        } catch (error) {
            let errorMessage = util.format("Error sending back chat accepted message from agent to bot, detailed error: %s", error.message);
            logger.error(errorMessage);
            throw new Error(errorMessage);
        }
    }
    async sendChatMessage(payload) {
        let self = this;
        if (!payload) {
            let errorMessage = util.format("Invalid payload. Payload can't be empty");
            throw new Error(errorMessage);
        }
        try {

            let isValid = self.validateRequestBody("/ChatMessage", payload);
            if (!isValid.valid) {
                let errorMessage = util.format("Invalid payload. %s", isValid.response);
                throw new Error(errorMessage);
            }

            let userId = payload.payload.botUser.userId;

            let response = {
                userId: userId,
                messagePayload: {
                    type: Config.CHAT_MESSAGE,
                    text: payload.payload.message,
                }
            };
            logger.log("Successfully sent agent message to bot");
            return await self.prepareRequestForODA(response);
        } catch (error) {
            let errorMessage = util.format("Error sending agent chat message to bot, detailed error: %s", error.message);
            logger.error(errorMessage);
            throw new Error(errorMessage);
        }
    }

    async sendAgentAction(payload) {
        let self = this;
        if (!payload) {
            let errorMessage = util.format("Invalid payload. Payload can't be empty");
            throw new Error(errorMessage);
        }
        try {

            let isValid = self.validateRequestBody("/AgentAction", payload);
            if (!isValid.valid) {
                let errorMessage = util.format("Invalid payload. %s", isValid.response);
                throw new Error(errorMessage);
            }

            let userId = payload.payload.botUser.userId;

            let response = {
                userId: userId,
                messagePayload: {
                    type: Config.AGENT_ACTION,
                    action: payload.payload.action,
                }
            };
            let agentActionResponse = await self.prepareRequestForODA(response);
            logger.log("Successfully sent agent action to bot");

            // Delete bot userId/agent sessionId mapping from DB
            await self.deleteBotUserInfo(userId);

            return agentActionResponse;
        } catch (error) {
            let errorMessage = util.format("Error sending agent action to bot, detailed error: %s", error.message);
            logger.error(errorMessage);
            throw new Error(errorMessage);
        }
    }

    async terminateChat(payload) {
        let self = this;
        if (!payload) {
            let errorMessage = util.format("Invalid payload. Payload can't be empty");
            throw new Error(errorMessage);
        }
        try {

            let isValid = self.validateRequestBody("/ChatTerminated", payload);
            if (!isValid.valid) {
                let errorMessage = util.format("Invalid payload. %s", isValid.response);
                throw new Error(errorMessage);
            }

            let userId = payload.payload.botUser.userId;
            let response = {
                userId: userId,
                messagePayload: {
                    type: Config.CHAT_AGENT_LEFT,
                    text: payload.payload.message,
                }
            };
            // Send End Chat Message to Bot
            response = await self.prepareRequestForODA(response);
            // Delete bot userId/agent sessionId mapping from DB
            await self.deleteBotUserInfo(userId);
            logger.log("Successfully terminated chat with bot");
            return response;
        } catch (error) {
            let errorMessage = util.format("Error terminating chat with bot, detailed error: %s", error.message);
            logger.error(errorMessage);
            throw new Error(errorMessage);
        }

    }

    async rejectChat(payload) {
        let self = this;
        if (!payload) {
            let errorMessage = util.format("Invalid payload. Payload can't be empty");
            throw new Error(errorMessage);
        }
        try {
            logger.info("Started reject chat method...");

            let isValid = self.validateRequestBody("/ChatRejected", payload);
            if (!isValid.valid) {
                let errorMessage = util.format("Invalid payload. %s", isValid.response);
                throw new Error(errorMessage);
            }
            let {
                userId
            } = payload.payload.botUser;

            // transform message to BOT format
            let response = {
                userId: userId,
                messagePayload: {
                    type: Config.CHAT_ACCEPTED_REJECTED_MESSAGE_TYPE,
                    text: payload.payload.message,
                    status: payload.type
                }
            };

            let agentResponse = await self.prepareRequestForODA(response);
            // Delete bot userId/agent sessionId mapping from DB
            await self.deleteBotUserInfo(userId);
            logger.log("Successfully sent chat rejected from agent to bot");
            return agentResponse;
        } catch (error) {
            let errorMessage = util.format("Error sending back chat rejected message from agent to bot, detailed error: %s", error.message);
            logger.error(errorMessage);
            throw new Error(errorMessage);
        }
    }

    async delayChat(payload) {
        let self = this;
        if (!payload) {
            let errorMessage = util.format("Invalid payload. Payload can't be empty");
            throw new Error(errorMessage);
        }
        try {
            logger.info("Started delay chat method...");

            let isValid = self.validateRequestBody("/ChatDelayed", payload);
            if (!isValid.valid) {
                let errorMessage = util.format("Invalid payload. %s", isValid.response);
                throw new Error(errorMessage);
            }
            let {
                userId
            } = payload.payload.botUser;

            // transform message to BOT format
            let response = {
                userId: userId,
                messagePayload: {
                    type: Config.CHAT_ACCEPTED_REJECTED_MESSAGE_TYPE,
                    text: payload.payload.message,
                    status: payload.type
                }
            };

            let agentResponse = await self.prepareRequestForODA(response);

            logger.log("Successfully sent chat delayed from agent to bot");
            return agentResponse;
        } catch (error) {
            let errorMessage = util.format("Error sending back chat delayed message from agent to bot, detailed error: %s", error.message);
            logger.error(errorMessage);
            throw new Error(errorMessage);
        }
    }
    async prepareRequestForODA(payload) {
        let self = this;

        try {
            if (!payload) {
                let errorMessage = util.format("Invalid payload. Payload can't be empty");
                throw new Error(errorMessage);
            }
            logger.info("started sending request to BOT");

            // fetch user Info from DB, this info is needed for mapping agent chat sessionID to ADA userId
            let userId = payload.userId;
            let userInfo = await self.getBotUserInfo(userId);
            logger.info("Successfully fetched user info from DB");

            // Always add channelName before sending to bot;
            payload.messagePayload.channelName = userInfo.channelName;

            logger.info("Successfully sent request payload");
            return payload;
        } catch (error) {
            let errorMessage = util.format("Error sending request to Bot, detailed error: %s", error.message);
            logger.error(errorMessage);
            throw new Error(errorMessage);
        }
    }

    async storeBotUserInfo(userId, agentSessionId) {
        try {

            if (!userId || !agentSessionId || typeof userId !== "string" || typeof agentSessionId !== "string") {
                throw new Error("Invalid Payload, userId and agentSessionId are required and must be non-empty strings");
            }
            let dbRow = {
                "userId": userId,
                "agentSessionId": agentSessionId
            };
            await UserStore.mergeUser(dbRow.userId, dbRow);

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
            if (!userId || typeof userId !== "string") {
                throw new Error("userId must be a non-empty string");
            }
            let result = await UserStore.getUser(userId);
            return result;

        } catch (error) {
            let errorMessage = util.format("Error fetching user [%s] info from DB, detailed error: %s", userId, error.message);
            logger.error(errorMessage);
            throw new Error(errorMessage);

        }
    }

    async deleteBotUserInfo(userId) {
        try {
            if (!userId || typeof userId !== "string") {
                throw new Error("userId must be a non-empty string");
            }
            await UserStore.deleteUser(userId);
        } catch (error) {
            let errorMessage = util.format("Error deleting user [%s] info from DB, detailed error: %s", userId, error.message);
            logger.error(errorMessage);
            throw new Error(errorMessage);

        }
    }

    validateRequestBody(schemaName, payload) {

        let result = {
            valid: true,
            response: "success"
        };

        if (!schemaName || !payload) {
            result.valid = false;
            result.response = "schemaName and/or Payload can't be empty";
            return result;
        }

        schemaValidator.addSchema(require("./schemas/ChatDelayed"), "/ChatDelayed");
        schemaValidator.addSchema(require("./schemas/AgentAction"), "/AgentAction");
        schemaValidator.addSchema(require("./schemas/AgentActionMessagePayload"), "/AgentActionMessagePayload");
        schemaValidator.addSchema(require("./schemas/BotUser"), "/BotUser");
        schemaValidator.addSchema(require("./schemas/MessagePayload"), "/MessagePayload");
        schemaValidator.addSchema(require("./schemas/ChatAccepted"), "/ChatAccepted");
        schemaValidator.addSchema(require("./schemas/ChatAcceptedMessagePayload"), "/ChatAcceptedMessagePayload");
        schemaValidator.addSchema(require("./schemas/ChatRejectedMessagePayload"), "/ChatRejectedMessagePayload");
        schemaValidator.addSchema(require("./schemas/ChatRejected"), "/ChatRejected");
        schemaValidator.addSchema(require("./schemas/ChatMessage"), "/ChatMessage");
        schemaValidator.addSchema(require("./schemas/ChatTerminated"), "/ChatTerminated");

        try {
            let validator = schemaValidator.validate(payload, schemaName);

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
                result.valid = false;
                result.response = JSON.stringify(errorMessage);

            }
        } catch (error) {
            logger.error("Error Validating payload, detailed error: %s", error.message);
            throw error;
        }
        return result;
    }
}

module.exports = ODASender;