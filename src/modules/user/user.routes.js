const express = require("express");
const userController = require("./user.controller");
const validate = require("../../core/middleware/validate");
const { createUserSchema, deleteUserSchema, listUsersSchema } = require("./user.validator");

const router = express.Router();

router.get("/", validate(listUsersSchema), userController.getAllUsers);
router.post("/", validate(createUserSchema), userController.createUser);
router.delete("/:id", validate(deleteUserSchema), userController.deleteUser);

module.exports = router;
