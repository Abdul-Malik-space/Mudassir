require("dotenv").config();
const mongoose = require("mongoose");

const User = require("../models/User");
const { setUserPassword } = require("../services/authService");

const run = async () => {
  const username = String(process.env.INITIAL_ADMIN_USERNAME || "")
    .trim()
    .toLowerCase();
  const email = String(process.env.INITIAL_ADMIN_EMAIL || "")
    .trim()
    .toLowerCase();
  const password = String(process.env.INITIAL_ADMIN_PASSWORD || "");

  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is required");
  }

  if (!username || !password) {
    throw new Error(
      "INITIAL_ADMIN_USERNAME and INITIAL_ADMIN_PASSWORD are required"
    );
  }

  await mongoose.connect(process.env.MONGO_URI);

  const existing = await User.findOne({ username });
  if (existing) {
    console.log("Administrator already exists. No changes were made.");
    return;
  }

  const user = new User({
    username,
    email,
    role: "super_admin",
    status: "Active",
    mustChangePassword: true,
    passwordHash: "temporary",
  });

  user.passwordHash = "";
  await setUserPassword(user, password, { mustChangePassword: true });
  await user.save();

  console.log("Initial Super Administrator created successfully.");
};

run()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
