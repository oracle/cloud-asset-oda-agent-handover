/*
** Copyright © 2019, Oracle and/or its affiliates. All rights reserved.
** Licensed under the Universal Permissive License v 1.0 as shown at http://oss.oracle.com/licenses/upl
*/

const util = require("util");
const log4js = require("log4js");
const logger = log4js.getLogger("Server");
logger.level = "debug";


class UserStore {
    constructor() {
        this.usersCache = {};
    }

    async mergeUser(userId, user) {
        try {

            let currentUser = await this.getUser(userId);
            // If user doesn't exist in cache, then create new entry.
            if(!currentUser){
                this.usersCache[userId] = user;
            }
            // If user exists in cache, then merge new data.
            else{
                for(var key in user){
                    currentUser[key] = user[key];
                }
                this.usersCache[userId] = currentUser;
            }

            
            return {
                message: "User stored successfully in DB."
            };
        } catch (error) {
            let errorMessage = util.format("Error storing user info in DB, detailed error: %s", error);
            logger.error(errorMessage);
            throw new Error(errorMessage);
        }
    }

    async getUser(userId) {

        if (!userId) {
            throw new Error("missing required parameter [userId]");
        }
        return this.usersCache[userId];
    }

    async deleteUser(userId) {

        if (!userId) {
            throw new Error("missing required parameter [userId]");
        }

        delete this.usersCache[userId];
        return {
            "message": "user deleted successfully"
        };
    }

}
module.exports = new UserStore();