/*
** Copyright © 2019, Oracle and/or its affiliates. All rights reserved.
** Licensed under the Universal Permissive License v 1.0 as shown at http://oss.oracle.com/licenses/upl
*/

const express = require("express");
const util = require("util");
const OracleBot = require("@oracle/bots-node-sdk");
const Config = require("../config/config");
const agentImpl = require("./agentImpl/" + Config.AGENT_IMPL_FILE);
const AgentSender = require("./lib/odaTOagent/impl/AgentSender");
const OdaSender = require("./lib/agentTOoda/impl/ODASender");
const log4js = require("log4js");
const logger = log4js.getLogger("Server");
logger.level = "debug";

const agentSender = new AgentSender();
const odaSender = new OdaSender();

const app = express();
OracleBot.init(app);

// implement webhook
const {
    WebhookClient,
    WebhookEvent,
} = OracleBot.Middleware;

const channel = {
    url: Config.DA_WEBHOOK_URL,
    secret: Config.DA_WEBHOOK_SECRET,
};

// extract channelId
let channelId = channel.url.substr(channel.url.lastIndexOf("/") + 1);


const webhook = new WebhookClient({
    channel: channel,
});


// receive errors
webhook.on(WebhookEvent.ERROR, error => {
    let errorMessage = util.format("Error Sending message to webhook, details error: %s", error.message);
    logger.error(errorMessage);
});

// receive messages from bot
app.post("/bot/message", webhook.receiver());

webhook.on(WebhookEvent.MESSAGE_RECEIVED, async message => {

    try {

        message.messagePayload.webhookChannelId = channelId;
        logger.info("Received a message from BOT, processing message before sending to agent");
        await agentSender.processBotMessage(message);
        logger.info("Successfully sent message to agent.");

    } catch (error) {
        let errorMessage = util.format("Error relying payload, detailed error: %s", error.message);
        logger.error(errorMessage);
    }
});

// send messages to bot
app.post("/agent/message", async (req, res) => {
    logger.info("Message received from agent, processing before sending to ODA.");
    let message = req.body;
    if (!message || Object.keys(message).length == 0) {
        let errorMessage = "Error sending message to ODA, message can't be empty";
        logger.error(errorMessage);
        res.status(400).send({
            error: errorMessage
        });
    } else {

        try {
            // Transform from Agent Message Format
            message = await agentImpl.prototype.fromAgentPayloadStructure(message);
            let agentResponse = await odaSender.processAgentMessage(message);
            if (Array.isArray(agentResponse)) {
                agentResponse.reduce(async (previousPromise, response) => {
                    await previousPromise;
                    return webhook.send(response);
                }, Promise.resolve());
            } else {
                await webhook.send(agentResponse);
                logger.info("Successfully sent message to ODA.");
            }

            let response = {
                message: "success"
            };
            res.send(response);
        } catch (error) {
            res.status(400).send({
                error: error.message
            });
        }
    }


});

app.listen(Config.PORT, function () {
    logger.info("server listening on port %s", Config.PORT);
});