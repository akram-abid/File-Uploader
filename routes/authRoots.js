const { Router } = require("express");
const authRoots = Router();
const authControllers = require("../controllers/authControllers")

authRoots.get("/", authControllers.takeWay)
authRoots.get("/login", authControllers.displayLoginPage)
authRoots.post("/login", authControllers.verifyUser)
authRoots.get("/signup", authControllers.displaySignupPage)
authRoots.post("/signup", authControllers.storeNewAccount)

module.exports = authRoots;