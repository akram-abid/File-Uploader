const express = require("express");
const app = express();
const path = require("node:path");
const session = require("./config/session");
const { PrismaClient } = require('@prisma/client');
const passport = require('./config/passport');
const authRoots = require("./routes/authRoots");
const fileRoutes = require("./routes/fileRouter")
const folderRoute = require("./routes/folderRoute")

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
app.use("/", fileRoutes);
app.use("/", folderRoute);

console.log('=== ENVIRONMENT VARIABLES ===');
console.log('CLOUDINARY_CLOUD_NAME:', JSON.stringify(process.env.CLOUDINARY_CLOUD_NAME));
console.log('CLOUDINARY_API_KEY:', JSON.stringify(process.env.CLOUDINARY_API_KEY));
console.log('CLOUDINARY_API_SECRET:', JSON.stringify(process.env.CLOUDINARY_API_SECRET));
console.log('==============================');

app.listen(3000, () => {
    console.log("app is listening at port 3000");
});