/*
** Copyright © 2019, Oracle and/or its affiliates. All rights reserved.
** Licensed under the Universal Permissive License v 1.0 as shown at http://oss.oracle.com/licenses/upl
*/

/* eslint-disable no-undef */
const ODASender = require("../src/lib/agentTOoda/impl/ODASender");
const userStore = require("../src/lib/userStore/impl/UserStore");
const odaSender = new ODASender(userStore);
const payloads = require("./samples/payloads");

describe("ODA Sender", () => {

    it("should validate schemas", () => {

        // Invalid input
        let isValid = odaSender.validateRequestBody();
        expect(isValid.valid).toBeFalsy();
        expect(isValid.response).toEqual("schemaName and/or Payload can't be empty");

        // Invalid schemaName
        expect(() => {
            odaSender.validateRequestBody("test", {});
        }).toThrowError();

        let odaSenderPayloads = payloads.odaSender;
        for (key in odaSenderPayloads) {
            isValid = odaSender.validateRequestBody("/" + key, odaSenderPayloads[key].valid);
            expect(isValid.valid).toBe(true);

            let invalidPayloads = odaSenderPayloads[key].invalid;
            invalidPayloads.forEach(invalidPayload => {
                isValid = odaSender.validateRequestBody("/" + key, invalidPayload);
                expect(isValid.valid).toBe(false);
            });
        }
    });
    it("should delete user By ID", async done => {
        let spy = spyOn(userStore, "deleteUser").and.callFake(() => Promise.resolve());

        // Missing User Id
        await expectAsync(odaSender.deleteBotUserInfo()).not.toBeResolved();
        expect(spy).not.toHaveBeenCalled();

        // Invalid User Id format
        let userId = 1234;
        await expectAsync(odaSender.deleteBotUserInfo(1234)).not.toBeResolved();
        expect(spy).not.toHaveBeenCalled();


        // Valid User Id 
        userId = "1234";
        await expectAsync(odaSender.deleteBotUserInfo(userId)).toBeResolved();
        expect(spy).toHaveBeenCalledWith(userId);

        spy = spy.and.callFake(() => Promise.reject());
        await expectAsync(odaSender.deleteBotUserInfo(userId)).not.toBeResolved();
        expect(spy).toHaveBeenCalledWith(userId);

        done();
    });
    it("should get user info By ID", async done => {
        let spy = spyOn(userStore, "getUser").and.callFake(() => Promise.resolve());

        // Missing User Id
        await expectAsync(odaSender.getBotUserInfo()).not.toBeResolved();
        expect(spy).not.toHaveBeenCalled();

        // Invalid User Id format
        let userId = 1234;
        await expectAsync(odaSender.getBotUserInfo(1234)).not.toBeResolved();
        expect(spy).not.toHaveBeenCalled();


        // Valid User Id 
        userId = "1234";
        await expectAsync(odaSender.getBotUserInfo(userId)).toBeResolved();
        expect(spy).toHaveBeenCalledWith(userId);

        spy = spy.and.callFake(() => Promise.reject());
        await expectAsync(odaSender.getBotUserInfo(userId)).not.toBeResolved();
        expect(spy).toHaveBeenCalledWith(userId);


        done();
    });
    it("should store user info", async done => {
        let spy = spyOn(userStore, "mergeUser").and.callFake(() => Promise.resolve());

        // Missing User Id & session ID
        await expectAsync(odaSender.storeBotUserInfo()).not.toBeResolved();
        expect(spy).not.toHaveBeenCalled();

        // Invalid User Id & sessionId formats
        let userId = 1234;
        let sessionId = 12345;
        await expectAsync(odaSender.storeBotUserInfo(userId, sessionId)).not.toBeResolved();
        expect(spy).not.toHaveBeenCalled();


        // Valid User Id & sessionId
        userId = "1234";
        sessionId = "12345";
        await expectAsync(odaSender.storeBotUserInfo(userId, sessionId)).toBeResolved();
        expect(spy).toHaveBeenCalledWith({
            userId: userId,
            agentSessionId: sessionId
        });

        spy = spy.and.callFake(() => Promise.reject());
        await expectAsync(odaSender.storeBotUserInfo(userId)).not.toBeResolved();
        expect(spy).toHaveBeenCalledWith({
            userId: userId,
            agentSessionId: sessionId
        });


        done();
    });
    it("should process agent messages", async done => {

        // Invalid Message
        await expectAsync(odaSender.processAgentMessage()).not.toBeResolved();
        await expectAsync(odaSender.processAgentMessage("message")).not.toBeResolved();
        await expectAsync(odaSender.processAgentMessage({
            payload: {}
        })).not.toBeResolved();
        await expectAsync(odaSender.processAgentMessage({
            payload: {},
            type: "invalidType"
        })).not.toBeResolved();

        let spy = spyOn(odaSender, "acceptChat").and.callFake(() => Promise.resolve());
        let message = {
            payload: {},
            type: "accepted"
        };
        await expectAsync(odaSender.processAgentMessage(message)).not.toBeResolved();
        expect(spy).toHaveBeenCalledWith(message);

        spy = spyOn(odaSender, "delayChat").and.callFake(() => Promise.resolve());
        message = {
            payload: {},
            type: "delayed"
        };
        await expectAsync(odaSender.processAgentMessage(message)).toBeResolved();
        expect(spy).toHaveBeenCalledWith(message);

        spy = spyOn(odaSender, "terminateChat").and.callFake(() => Promise.resolve());
        message = {
            payload: {},
            type: "agentLeft"
        };
        await expectAsync(odaSender.processAgentMessage(message)).toBeResolved();
        expect(spy).toHaveBeenCalledWith(message);

        spy = spyOn(odaSender, "sendChatMessage").and.callFake(() => Promise.resolve());
        message = {
            payload: {},
            type: "agent"
        };
        await expectAsync(odaSender.processAgentMessage(message)).toBeResolved();
        expect(spy).toHaveBeenCalledWith(message);


        spy = spyOn(odaSender, "rejectChat").and.callFake(() => Promise.resolve());
        message = {
            payload: {},
            type: "rejected"
        };
        await expectAsync(odaSender.processAgentMessage(message)).toBeResolved();
        expect(spy).toHaveBeenCalledWith(message);

        spy = spyOn(odaSender, "sendAgentAction").and.callFake(() => Promise.resolve());
        message = {
            payload: {},
            type: "agentAction"
        };
        await expectAsync(odaSender.processAgentMessage(message)).toBeResolved();
        expect(spy).toHaveBeenCalledWith(message);

        done();
    });
    it("should not resolve chat accepted when schema validation fails", async done => {
        let getUserSpy = spyOn(odaSender, "getBotUserInfo").and.callFake(() => Promise.resolve());
        let prepareRequestForODASpy = spyOn(odaSender, "prepareRequestForODA").and.callFake(() => Promise.resolve());
        let validateSchemaSpy = spyOn(odaSender, "validateRequestBody").and.returnValues({
            valid: false,
            response: "response"
        });

        // empty payload
        await expectAsync(odaSender.acceptChat()).not.toBeResolved();
        expect(getUserSpy).not.toHaveBeenCalled();
        expect(prepareRequestForODASpy).not.toHaveBeenCalled();
        expect(validateSchemaSpy).not.toHaveBeenCalled();

        // Schema Validation fails
        let validPayload = payloads.odaSender.ChatAccepted.valid;
        await expectAsync(odaSender.acceptChat(validPayload)).not.toBeResolved();
        expect(getUserSpy).not.toHaveBeenCalled();
        expect(prepareRequestForODASpy).not.toHaveBeenCalled();

        validateSchemaSpy = validateSchemaSpy.and.throwError();
        await expectAsync(odaSender.acceptChat(validPayload)).not.toBeResolved();
        expect(getUserSpy).not.toHaveBeenCalled();
        expect(prepareRequestForODASpy).not.toHaveBeenCalled();

        done();
    });
    it("should not resolve chat accepted when get user info fails", async done => {
        let getUserSpy = spyOn(odaSender, "getBotUserInfo").and.callFake(() => Promise.reject());
        let validateSchemaSpy = spyOn(odaSender, "validateRequestBody").and.returnValues({
            valid: true,
            response: "response"
        });
        let prepareRequestForODASpy = spyOn(odaSender, "prepareRequestForODA").and.callFake(() => Promise.resolve());

        let validPayload = payloads.odaSender.ChatAccepted.valid;
        await expectAsync(odaSender.acceptChat(validPayload)).not.toBeResolved();
        expect(getUserSpy).toHaveBeenCalledWith(validPayload.payload.botUser.userId);
        expect(prepareRequestForODASpy).not.toHaveBeenCalled();
        expect(validateSchemaSpy).toHaveBeenCalledWith("/ChatAccepted", validPayload);

        done();
    });
    it("should not resolve chat accepted when sent to bot fails", async done => {
        let validUser = payloads.user;
        let getUserSpy = spyOn(odaSender, "getBotUserInfo").and.callFake(() => Promise.resolve(validUser));
        let prepareRequestForODASpy = spyOn(odaSender, "prepareRequestForODA").and.callFake(() => Promise.reject());
        let validateSchemaSpy = spyOn(odaSender, "validateRequestBody").and.returnValues({
            valid: true,
            response: "response"
        });

        let validPayload = payloads.odaSender.ChatAccepted.valid;
        let validOdaResponse = {
            userId: validPayload.payload.botUser.userId,
            messagePayload: {
                type: "agentRequestResponse",
                text: validPayload.payload.message,
                status: validPayload.type,
                channelUserState: {
                    channelSessionId: validPayload.payload.sessionId,
                    userId: validUser.userId,
                    channelId: validUser.channelId,
                    userChannelId: validUser.userChannelId
                }
            }
        };
        await expectAsync(odaSender.acceptChat(validPayload)).not.toBeResolved();
        expect(getUserSpy).toHaveBeenCalledWith(validPayload.payload.botUser.userId);
        expect(validateSchemaSpy).toHaveBeenCalledWith("/ChatAccepted", validPayload);
        expect(prepareRequestForODASpy).toHaveBeenCalledWith(validOdaResponse);

        done();
    });
    it("should resolve chat accepted", async done => {
        let validUser = payloads.user;
        let getUserSpy = spyOn(odaSender, "getBotUserInfo").and.callFake(() => Promise.resolve(validUser));
        let prepareRequestForODASpy = spyOn(odaSender, "prepareRequestForODA").and.callFake(() => Promise.resolve());
        let validateSchemaSpy = spyOn(odaSender, "validateRequestBody").and.returnValues({
            valid: true,
            response: "response"
        });

        let validPayload = payloads.odaSender.ChatAccepted.valid;
        let validOdaResponse = {
            userId: validPayload.payload.botUser.userId,
            messagePayload: {
                type: "agentRequestResponse",
                text: validPayload.payload.message,
                status: validPayload.type,
                channelUserState: {
                    channelSessionId: validPayload.payload.sessionId,
                    userId: validUser.userId,
                    channelId: validUser.channelId,
                    userChannelId: validUser.userChannelId
                }
            }
        };
        await expectAsync(odaSender.acceptChat(validPayload)).toBeResolved();
        expect(getUserSpy).toHaveBeenCalledWith(validPayload.payload.botUser.userId);
        expect(validateSchemaSpy).toHaveBeenCalledWith("/ChatAccepted", validPayload);
        expect(prepareRequestForODASpy).toHaveBeenCalledWith(validOdaResponse);

        done();
    });
    it("should not resolve sendChatMessage with invalid schema", async done => {
        let prepareRequestForODASpy = spyOn(odaSender, "prepareRequestForODA").and.callFake(() => Promise.resolve());
        let validateSchemaSpy = spyOn(odaSender, "validateRequestBody").and.returnValues({
            valid: false,
            response: "response"
        });


        await expectAsync(odaSender.sendChatMessage()).not.toBeResolved();
        expect(validateSchemaSpy).not.toHaveBeenCalled();
        expect(prepareRequestForODASpy).not.toHaveBeenCalled();

        let validPayload = payloads.odaSender.ChatMessage.valid;
        await expectAsync(odaSender.sendChatMessage(validPayload)).not.toBeResolved();
        expect(validateSchemaSpy).toHaveBeenCalledWith("/ChatMessage", validPayload);
        expect(prepareRequestForODASpy).not.toHaveBeenCalled();


        done();
    });
    it("should not resolve sendChatMessage when prepareRequestForODA fails", async done => {
        let prepareRequestForODASpy = spyOn(odaSender, "prepareRequestForODA").and.callFake(() => Promise.reject());
        let validateSchemaSpy = spyOn(odaSender, "validateRequestBody").and.returnValues({
            valid: true,
            response: "response"
        });

        let validPayload = payloads.odaSender.ChatMessage.valid;
        let validResponse = {
            userId: validPayload.payload.botUser.userId,
            messagePayload: {
                type: validPayload.type,
                text: validPayload.payload.message,
            }
        };
        await expectAsync(odaSender.sendChatMessage(validPayload)).not.toBeResolved();
        expect(validateSchemaSpy).toHaveBeenCalledWith("/ChatMessage", validPayload);
        expect(prepareRequestForODASpy).toHaveBeenCalledWith(validResponse);


        done();
    });
    it("should resolve sendChatMessage", async done => {
        let prepareRequestForODASpy = spyOn(odaSender, "prepareRequestForODA").and.callFake(() => Promise.resolve());
        let validateSchemaSpy = spyOn(odaSender, "validateRequestBody").and.returnValues({
            valid: true,
            response: "response"
        });

        let validPayload = payloads.odaSender.ChatMessage.valid;
        let validResponse = {
            userId: validPayload.payload.botUser.userId,
            messagePayload: {
                type: validPayload.type,
                text: validPayload.payload.message,
            }
        };
        await expectAsync(odaSender.sendChatMessage(validPayload)).toBeResolved();
        expect(validateSchemaSpy).toHaveBeenCalledWith("/ChatMessage", validPayload);
        expect(prepareRequestForODASpy).toHaveBeenCalledWith(validResponse);

        done();
    });
    it("should not resolve agentAction with invalid schema", async done => {
        let prepareRequestForODASpy = spyOn(odaSender, "prepareRequestForODA").and.callFake(() => Promise.resolve());
        let deleteUserSpy = spyOn(odaSender, "deleteBotUserInfo").and.callFake(() => Promise.resolve());
        let validateSchemaSpy = spyOn(odaSender, "validateRequestBody").and.returnValues({
            valid: false,
            response: "response"
        });

        await expectAsync(odaSender.sendAgentAction()).not.toBeResolved();
        expect(validateSchemaSpy).not.toHaveBeenCalled();
        expect(prepareRequestForODASpy).not.toHaveBeenCalled();
        expect(deleteUserSpy).not.toHaveBeenCalled();

        let validPayload = payloads.odaSender.AgentAction.valid;
        await expectAsync(odaSender.sendAgentAction(validPayload)).not.toBeResolved();
        expect(validateSchemaSpy).toHaveBeenCalledWith("/AgentAction", validPayload);
        expect(prepareRequestForODASpy).not.toHaveBeenCalled();
        expect(deleteUserSpy).not.toHaveBeenCalled();


        done();
    });
    it("should not resolve agentAction when prepareRequestForODA Fails", async done => {
        let prepareRequestForODASpy = spyOn(odaSender, "prepareRequestForODA").and.callFake(() => Promise.reject());
        let deleteUserSpy = spyOn(odaSender, "deleteBotUserInfo").and.callFake(() => Promise.resolve());
        let validateSchemaSpy = spyOn(odaSender, "validateRequestBody").and.returnValues({
            valid: true,
            response: "response"
        });


        let validPayload = payloads.odaSender.AgentAction.valid;
        let validResponse = {
            userId: validPayload.payload.botUser.userId,
            messagePayload: {
                type: validPayload.type,
                action: validPayload.payload.action,
            }
        };
        await expectAsync(odaSender.sendAgentAction(validPayload)).not.toBeResolved();
        expect(validateSchemaSpy).toHaveBeenCalledWith("/AgentAction", validPayload);
        expect(prepareRequestForODASpy).toHaveBeenCalledWith(validResponse);
        expect(deleteUserSpy).not.toHaveBeenCalled();


        done();
    });
    it("should not resolve agentAction when deleteUser Fails", async done => {
        let prepareRequestForODASpy = spyOn(odaSender, "prepareRequestForODA").and.callFake(() => Promise.resolve());
        let deleteUserSpy = spyOn(odaSender, "deleteBotUserInfo").and.callFake(() => Promise.reject());
        let validateSchemaSpy = spyOn(odaSender, "validateRequestBody").and.returnValues({
            valid: true,
            response: "response"
        });


        let validPayload = payloads.odaSender.AgentAction.valid;
        let validResponse = {
            userId: validPayload.payload.botUser.userId,
            messagePayload: {
                type: validPayload.type,
                action: validPayload.payload.action,
            }
        };
        await expectAsync(odaSender.sendAgentAction(validPayload)).not.toBeResolved();
        expect(validateSchemaSpy).toHaveBeenCalledWith("/AgentAction", validPayload);
        expect(prepareRequestForODASpy).toHaveBeenCalledWith(validResponse);
        expect(deleteUserSpy).toHaveBeenCalledWith(validPayload.payload.botUser.userId);


        done();
    });
    it("should  resolve agentAction", async done => {
        let prepareRequestForODASpy = spyOn(odaSender, "prepareRequestForODA").and.callFake(() => Promise.resolve());
        let deleteUserSpy = spyOn(odaSender, "deleteBotUserInfo").and.callFake(() => Promise.resolve());
        let validateSchemaSpy = spyOn(odaSender, "validateRequestBody").and.returnValues({
            valid: true,
            response: "response"
        });


        let validPayload = payloads.odaSender.AgentAction.valid;
        let validResponse = {
            userId: validPayload.payload.botUser.userId,
            messagePayload: {
                type: validPayload.type,
                action: validPayload.payload.action,
            }
        };
        await expectAsync(odaSender.sendAgentAction(validPayload)).toBeResolved();
        expect(validateSchemaSpy).toHaveBeenCalledWith("/AgentAction", validPayload);
        expect(prepareRequestForODASpy).toHaveBeenCalledWith(validResponse);
        expect(deleteUserSpy).toHaveBeenCalledWith(validPayload.payload.botUser.userId);


        done();
    });
    it("should not resolve terminateChat with invalid schema", async done => {
        let prepareRequestForODASpy = spyOn(odaSender, "prepareRequestForODA").and.callFake(() => Promise.resolve());
        let deleteUserSpy = spyOn(odaSender, "deleteBotUserInfo").and.callFake(() => Promise.resolve());
        let validateSchemaSpy = spyOn(odaSender, "validateRequestBody").and.returnValues({
            valid: false,
            response: "response"
        });

        await expectAsync(odaSender.terminateChat()).not.toBeResolved();
        expect(validateSchemaSpy).not.toHaveBeenCalled();
        expect(prepareRequestForODASpy).not.toHaveBeenCalled();
        expect(deleteUserSpy).not.toHaveBeenCalled();

        let validPayload = payloads.odaSender.ChatTerminated.valid;
        await expectAsync(odaSender.terminateChat(validPayload)).not.toBeResolved();
        expect(validateSchemaSpy).toHaveBeenCalledWith("/ChatTerminated", validPayload);
        expect(prepareRequestForODASpy).not.toHaveBeenCalled();
        expect(deleteUserSpy).not.toHaveBeenCalled();


        done();
    });
    it("should not resolve terminateChat when prepareRequestForODA Fails", async done => {
        let prepareRequestForODASpy = spyOn(odaSender, "prepareRequestForODA").and.callFake(() => Promise.reject());
        let deleteUserSpy = spyOn(odaSender, "deleteBotUserInfo").and.callFake(() => Promise.resolve());
        let validateSchemaSpy = spyOn(odaSender, "validateRequestBody").and.returnValues({
            valid: true,
            response: "response"
        });


        let validPayload = payloads.odaSender.ChatTerminated.valid;
        let validResponse = {
            userId: validPayload.payload.botUser.userId,
            messagePayload: {
                type: validPayload.type,
                text: validPayload.payload.message,
            }
        };
        await expectAsync(odaSender.terminateChat(validPayload)).not.toBeResolved();
        expect(validateSchemaSpy).toHaveBeenCalledWith("/ChatTerminated", validPayload);
        expect(prepareRequestForODASpy).toHaveBeenCalledWith(validResponse);
        expect(deleteUserSpy).not.toHaveBeenCalled();


        done();
    });
    it("should not resolve terminateChat when deleteUser Fails", async done => {
        let prepareRequestForODASpy = spyOn(odaSender, "prepareRequestForODA").and.callFake(() => Promise.resolve());
        let deleteUserSpy = spyOn(odaSender, "deleteBotUserInfo").and.callFake(() => Promise.reject());
        let validateSchemaSpy = spyOn(odaSender, "validateRequestBody").and.returnValues({
            valid: true,
            response: "response"
        });


        let validPayload = payloads.odaSender.ChatTerminated.valid;
        let validResponse = {
            userId: validPayload.payload.botUser.userId,
            messagePayload: {
                type: validPayload.type,
                text: validPayload.payload.message,
            }
        };
        await expectAsync(odaSender.terminateChat(validPayload)).not.toBeResolved();
        expect(validateSchemaSpy).toHaveBeenCalledWith("/ChatTerminated", validPayload);
        expect(prepareRequestForODASpy).toHaveBeenCalledWith(validResponse);
        expect(deleteUserSpy).toHaveBeenCalledWith(validPayload.payload.botUser.userId);


        done();
    });
    it("should  resolve terminateChat", async done => {
        let prepareRequestForODASpy = spyOn(odaSender, "prepareRequestForODA").and.callFake(() => Promise.resolve());
        let deleteUserSpy = spyOn(odaSender, "deleteBotUserInfo").and.callFake(() => Promise.resolve());
        let validateSchemaSpy = spyOn(odaSender, "validateRequestBody").and.returnValues({
            valid: true,
            response: "response"
        });


        let validPayload = payloads.odaSender.ChatTerminated.valid;
        let validResponse = {
            userId: validPayload.payload.botUser.userId,
            messagePayload: {
                type: validPayload.type,
                text: validPayload.payload.message,
            }
        };
        await expectAsync(odaSender.terminateChat(validPayload)).toBeResolved();
        expect(validateSchemaSpy).toHaveBeenCalledWith("/ChatTerminated", validPayload);
        expect(prepareRequestForODASpy).toHaveBeenCalledWith(validResponse);
        expect(deleteUserSpy).toHaveBeenCalledWith(validPayload.payload.botUser.userId);


        done();
    });
    it("should not resolve rejectChat with invalid schema", async done => {
        let prepareRequestForODASpy = spyOn(odaSender, "prepareRequestForODA").and.callFake(() => Promise.resolve());
        let deleteUserSpy = spyOn(odaSender, "deleteBotUserInfo").and.callFake(() => Promise.resolve());
        let validateSchemaSpy = spyOn(odaSender, "validateRequestBody").and.returnValues({
            valid: false,
            response: "response"
        });

        await expectAsync(odaSender.rejectChat()).not.toBeResolved();
        expect(validateSchemaSpy).not.toHaveBeenCalled();
        expect(prepareRequestForODASpy).not.toHaveBeenCalled();
        expect(deleteUserSpy).not.toHaveBeenCalled();

        let validPayload = payloads.odaSender.ChatRejected.valid;
        await expectAsync(odaSender.rejectChat(validPayload)).not.toBeResolved();
        expect(validateSchemaSpy).toHaveBeenCalledWith("/ChatRejected", validPayload);
        expect(prepareRequestForODASpy).not.toHaveBeenCalled();
        expect(deleteUserSpy).not.toHaveBeenCalled();


        done();
    });
    it("should not resolve rejectChat when prepareRequestForODA Fails", async done => {
        let prepareRequestForODASpy = spyOn(odaSender, "prepareRequestForODA").and.callFake(() => Promise.reject());
        let deleteUserSpy = spyOn(odaSender, "deleteBotUserInfo").and.callFake(() => Promise.resolve());
        let validateSchemaSpy = spyOn(odaSender, "validateRequestBody").and.returnValues({
            valid: true,
            response: "response"
        });


        let validPayload = payloads.odaSender.ChatRejected.valid;
        let validResponse = {
            userId: validPayload.payload.botUser.userId,
            messagePayload: {
                type: "agentRequestResponse",
                text: validPayload.payload.message,
                status: validPayload.type
            }
        };
        await expectAsync(odaSender.rejectChat(validPayload)).not.toBeResolved();
        expect(validateSchemaSpy).toHaveBeenCalledWith("/ChatRejected", validPayload);
        expect(prepareRequestForODASpy).toHaveBeenCalledWith(validResponse);
        expect(deleteUserSpy).not.toHaveBeenCalled();


        done();
    });
    it("should not resolve rejectChat when deleteUser Fails", async done => {
        let prepareRequestForODASpy = spyOn(odaSender, "prepareRequestForODA").and.callFake(() => Promise.resolve());
        let deleteUserSpy = spyOn(odaSender, "deleteBotUserInfo").and.callFake(() => Promise.reject());
        let validateSchemaSpy = spyOn(odaSender, "validateRequestBody").and.returnValues({
            valid: true,
            response: "response"
        });


        let validPayload = payloads.odaSender.ChatRejected.valid;
        let validResponse = {
            userId: validPayload.payload.botUser.userId,
            messagePayload: {
                type: "agentRequestResponse",
                text: validPayload.payload.message,
                status: validPayload.type
            }
        };
        await expectAsync(odaSender.rejectChat(validPayload)).not.toBeResolved();
        expect(validateSchemaSpy).toHaveBeenCalledWith("/ChatRejected", validPayload);
        expect(prepareRequestForODASpy).toHaveBeenCalledWith(validResponse);
        expect(deleteUserSpy).toHaveBeenCalledWith(validPayload.payload.botUser.userId);


        done();
    });
    it("should  resolve terminateChat", async done => {
        let prepareRequestForODASpy = spyOn(odaSender, "prepareRequestForODA").and.callFake(() => Promise.resolve());
        let deleteUserSpy = spyOn(odaSender, "deleteBotUserInfo").and.callFake(() => Promise.resolve());
        let validateSchemaSpy = spyOn(odaSender, "validateRequestBody").and.returnValues({
            valid: true,
            response: "response"
        });


        let validPayload = payloads.odaSender.ChatRejected.valid;
        let validResponse = {
            userId: validPayload.payload.botUser.userId,
            messagePayload: {
                type: "agentRequestResponse",
                text: validPayload.payload.message,
                status: validPayload.type
            }
        };
        await expectAsync(odaSender.rejectChat(validPayload)).toBeResolved();
        expect(validateSchemaSpy).toHaveBeenCalledWith("/ChatRejected", validPayload);
        expect(prepareRequestForODASpy).toHaveBeenCalledWith(validResponse);
        expect(deleteUserSpy).toHaveBeenCalledWith(validPayload.payload.botUser.userId);


        done();
    });
    it("should not resolve delayChat with invalid schema", async done => {
        let prepareRequestForODASpy = spyOn(odaSender, "prepareRequestForODA").and.callFake(() => Promise.resolve());
        let validateSchemaSpy = spyOn(odaSender, "validateRequestBody").and.returnValues({
            valid: false,
            response: "response"
        });

        await expectAsync(odaSender.delayChat()).not.toBeResolved();
        expect(validateSchemaSpy).not.toHaveBeenCalled();
        expect(prepareRequestForODASpy).not.toHaveBeenCalled();

        let validPayload = payloads.odaSender.ChatDelayed.valid;
        await expectAsync(odaSender.delayChat(validPayload)).not.toBeResolved();
        expect(validateSchemaSpy).toHaveBeenCalledWith("/ChatDelayed", validPayload);
        expect(prepareRequestForODASpy).not.toHaveBeenCalled();

        done();
    });
    it("should not resolve delayChat when prepareRequestForODA Fails", async done => {
        let prepareRequestForODASpy = spyOn(odaSender, "prepareRequestForODA").and.callFake(() => Promise.reject());
        let validateSchemaSpy = spyOn(odaSender, "validateRequestBody").and.returnValues({
            valid: true,
            response: "response"
        });


        let validPayload = payloads.odaSender.ChatDelayed.valid;
        let validResponse = {
            userId: validPayload.payload.botUser.userId,
            messagePayload: {
                type: "agentRequestResponse",
                text: validPayload.payload.message,
                status: validPayload.type
            }
        };
        await expectAsync(odaSender.delayChat(validPayload)).not.toBeResolved();
        expect(validateSchemaSpy).toHaveBeenCalledWith("/ChatDelayed", validPayload);
        expect(prepareRequestForODASpy).toHaveBeenCalledWith(validResponse);


        done();
    });
    it("should  resolve delayChat", async done => {
        let prepareRequestForODASpy = spyOn(odaSender, "prepareRequestForODA").and.callFake(() => Promise.resolve());
        let validateSchemaSpy = spyOn(odaSender, "validateRequestBody").and.returnValues({
            valid: true,
            response: "response"
        });


        let validPayload = payloads.odaSender.ChatDelayed.valid;
        let validResponse = {
            userId: validPayload.payload.botUser.userId,
            messagePayload: {
                type: "agentRequestResponse",
                text: validPayload.payload.message,
                status: validPayload.type
            }
        };
        await expectAsync(odaSender.delayChat(validPayload)).toBeResolved();
        expect(validateSchemaSpy).toHaveBeenCalledWith("/ChatDelayed", validPayload);
        expect(prepareRequestForODASpy).toHaveBeenCalledWith(validResponse);

        done();
    });
    it("should not resolve prepareRequestForODA", async done => {
        let validUser = payloads.user;
        let getUserSpy = spyOn(odaSender, "getBotUserInfo").and.callFake(() => Promise.reject());
        let validResponse = {
            userId: validUser.userId
        };
        await expectAsync(odaSender.prepareRequestForODA()).not.toBeResolved();
        expect(getUserSpy).not.toHaveBeenCalledWith(validResponse.userId);

        await expectAsync(odaSender.prepareRequestForODA(validResponse)).not.toBeResolved();
        expect(getUserSpy).toHaveBeenCalledWith(validResponse.userId);
        done();
    });
    it("should resolve prepareRequestForODA", async done => {
        let validUser = payloads.user;
        let getUserSpy = spyOn(odaSender, "getBotUserInfo").and.callFake(() => Promise.resolve(validUser));
        let validResponse = {
            userId: validUser.userId,
            messagePayload: {}
        };
        await expectAsync(odaSender.prepareRequestForODA(validResponse)).toBeResolved();
        expect(getUserSpy).toHaveBeenCalledWith(validResponse.userId);
        done();
    });




});