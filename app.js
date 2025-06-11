const express = require("express");
const app = express();
const path = require("node:path");
const session = require("./config/session");
const { PrismaClient } = require('@prisma/client');
const passport = require('./config/passport');
const authRoots = require("./routes/authRoots");

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

const assetsPath = path.join(__dirname, "public");
app.use(express.static(assetsPath));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session);

app.use(passport.initialize());
app.use(passport.session());

app.use('/', authRoots);

app.listen(3000, () => {
    console.log("app is listening at port 3000");
});