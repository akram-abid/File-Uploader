const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const passport = require('../config/passport')


const prisma = new PrismaClient();

exports.takeWay = (req, res) => {
  console.log("this is the main root");
  
  if (req.isAuthenticated()) {
    res.redirect("/upload");
  } else {
    res.redirect("/login");
  }
};

exports.displayLoginPage = (req, res) => {
  console.log("you are going to log in!");
  res.render("signin");
};

exports.displaySignupPage = (req, res) => {
  console.log("signup page");
  res.render("signup");
};

exports.storeNewAccount = async (req, res) => {
  console.log("i am storing thigs up");
  const hashedPassword = await bcrypt.hash(req.body.password, 10);
  console.log(
    `the password i set ${req.body.password} and the hashed one is ${hashedPassword}`
  );

  try {
    await prisma.user.create({
      data: {
        fullname: req.body.fullname,
        username: req.body.username,
        password: hashedPassword,
      },
    });
    res.redirect("/");
  } catch (error) {
    console.error("this is the error i have been telling you ", error);
    res.status(500).json({ error: "Failed to create account" });
  }
};

exports.verifyUser = (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      return next(err);
    }

    if (!user) {
      console.log("Login failed:", info.message);
      return res.redirect("/sign-up");
    }

    req.logIn(user, (err) => {
      if (err) {
        return next(err);
      }
      console.log(`User ${user.username} logged in successfully`);

      return res.redirect("/dashboard");
    });
  })(req, res, next);
};
