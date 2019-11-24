/*
** Copyright © 2019, Oracle and/or its affiliates. All rights reserved.
** Licensed under the Universal Permissive License v 1.0 as shown at http://oss.oracle.com/licenses/upl
*/

const UserStore = require("../../lib/userStore/impl/UserStore");
const ecUtils = require("./ecUtils");
const webhookUtils = require("../../../config/config");
const util = require("util");
const axios = require("axios");
const log4js = require("log4js");
const logger = log4js.getLogger("EngagementCloudImpl");
logger.level = "debug";

class ECListener {

    constructor(userId) {
        this.userId = userId;
    }
    async start() {
        let self = this;
        try {

            logger.info("Starting to Listen for Engagement Cloud Messages for user [%s]...", this.userId);

            const authResult = await UserStore.getUser(this.userId);
            const baseUrl = util.format("https://%s/engagement/api/consumer/%s/v1/", authResult.domain, authResult.chatSiteName);
            const endpoint = "getMessages";
            self.sessionId = authResult.sessionId;
            let headers = {
                "Authorization": util.format("Bearer %s", authResult.jwt),
                "sessionId": this.sessionId
            };

            // Prepare AXIOS request
            const request = {
                method: "POST", // HTTP method
                data: {}, // method body
                baseURL: baseUrl,
                url: endpoint,
                params: {
                    pool: authResult.poolId
                },
                responseType: "json",
                headers: headers
            };

            // Set a scheduler to pull messages from Engagement Cloud
            let exitId = setInterval(async () => {
                try {
                    logger.info("Fetching new messages from Engagement Cloud");
                    let response = await axios(request);

                    // If Engagement Cloud System Messages exists
                    if (response.status === 200 && response.data && response.data.systemMessages) {

                        let messages = response.data.systemMessages;
                        if (messages.length > 0) {

                            // Only Process chatAccepted/ChatWaiting/postMessage/concludeMessage
                            messages.forEach(async message => {
                                if (message.messageName === "RNEngagementMessagePostedMessage" ||
                                message.messageName === "RNEngagementParticipantAddedMessage" ||
                                message.messageName === "RNEngagementWaitInformationChangedMessage" ||
                                message.messageName === "RNEngagementConcludedMessage"
                                ){
                                    const payload = {
                                        botUserId: self.userId,
                                        sessionId: self.sessionId,
                                        data: message
                                    };
    
                                    const localRequest = {
                                        method: "POST", // HTTP method
                                        data: payload, // method body
                                        baseURL: "http://localhost:" + webhookUtils.PORT,
                                        url: "agent/message",
                                        responseType: "json"
                                    };
    
                                    await axios(localRequest);

                                }
                                else {
                                    logger.warn("Invalid Engagement Cloud response, ignoring.");
                                }
                            });
                        }

                    } 
                } catch (error) {
                    // Nothing to do, as framework simply rejected payload.
                }
            }, ecUtils.CHAT_LISTENER_POL_INTERVAL);

            return exitId;

        } catch (error) {
            let errorMessage = util.format("Error Listening for Engagement Cloud messages for user [%s], detailed error: %s", this.userId, error.message);
            logger.error(errorMessage);
        }
    }
}
module.exports = ECListener;