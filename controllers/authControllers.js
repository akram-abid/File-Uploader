exports.takeWay = (req, res) => {
  console.log("this is the main root");
  res.redirect("/login");
};

exports.displayLoginPage = (req, res) => {
  console.log("you are going to log in!");
  res.render("signin");
};

exports.displaySignupPage = (req, res) => {
    console.log("signup page"); 
    res.render("signup");
}
