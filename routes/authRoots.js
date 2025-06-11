const { Router } = require("express");
const authRoots = Router();
const authControllers = require("../controllers/authControllers")

authRoots.get("/", authControllers.takeWay)

module.exports = authRoots;