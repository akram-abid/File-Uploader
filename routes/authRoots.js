const { Router } = require("express");
const authRoots = Router();
const authControllers = require("../controllers/authControllers")

authRoots.get("/", authControllers.takeWay)
authRoots.get("/login", authControllers.displayLoginPage)
authRoots.get("/signup", authControllers.displaySignupPage)

module.exports = authRoots;