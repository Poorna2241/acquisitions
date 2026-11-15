
import logger from "#config/logger.js";
import {getAllUsers} from "#services/users.services.js";

export const fetchAllUsers = async (req,res,next) => {
    try {
        logger.info("Fetching all users");
        const allUsers = await getAllUsers();
        res.status(200).json({           
            message: "Successfully fetched all users",
            users: allUsers,
            count: allUsers.length,
        });
    } catch (error) {
        logger.error("Error fetching all users", { error });
        throw error;
    }
};