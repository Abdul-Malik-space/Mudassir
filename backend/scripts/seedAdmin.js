const path = require("path");
const mongoose = require("mongoose");

require("dotenv").config({
  path:
    process.env.DOTENV_CONFIG_PATH ||
    path.resolve(
      __dirname,
      "../.env"
    ),
});

const User = require("../models/User");

const {
  normalizeLogin,
  setUserPassword,
  revokeUserSessions,
} = require("../services/authService");

const asBoolean = (
  value,
  fallback = false
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return fallback;
  }

  return [
    "true",
    "1",
    "yes",
    "on",
  ].includes(
    String(value)
      .trim()
      .toLowerCase()
  );
};

const getAdminSettings = () => {
  const username = normalizeLogin(
    process.env
      .INITIAL_ADMIN_USERNAME ||
      "admin"
  );

  const email = normalizeLogin(
    process.env
      .INITIAL_ADMIN_EMAIL ||
      ""
  );

  const password = String(
    process.env
      .INITIAL_ADMIN_PASSWORD ||
      ""
  );

  const resetExistingPassword =
    asBoolean(
      process.env
        .INITIAL_ADMIN_RESET_PASSWORD,
      false
    );

  if (!username) {
    throw new Error(
      "INITIAL_ADMIN_USERNAME is required."
    );
  }

  /*
   * صارف نام میں خالی جگہ کی اجازت نہیں ہے۔
   */
  if (
    !/^[a-z0-9._-]{3,60}$/.test(
      username
    )
  ) {
    throw new Error(
      "INITIAL_ADMIN_USERNAME must be 3-60 characters and may contain only lowercase letters, numbers, dot, underscore, or hyphen."
    );
  }

  return {
    username,
    email,
    password,
    resetExistingPassword,
  };
};

const connectDatabase = async () => {
  const mongoUri = String(
    process.env.MONGO_URI || ""
  ).trim();

  if (!mongoUri) {
    throw new Error(
      "MONGO_URI is missing from the backend .env file."
    );
  }

  await mongoose.connect(
    mongoUri,
    {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    }
  );
};

const loadExistingAdministrator =
  async (
    username,
    email
  ) => {
    const hiddenFields =
      "+passwordHash " +
      "+passwordHistory " +
      "+failedLoginAttempts " +
      "+lockUntil";

    const usernameUser =
      await User.findOne({
        username,
      }).select(hiddenFields);

    const emailUser = email
      ? await User.findOne({
          email,
        }).select(hiddenFields)
      : null;

    /*
     * اگر صارف نام اور برقی پتے سے
     * دو مختلف کھاتے ملیں تو عمل روک دیں۔
     */
    if (
      usernameUser &&
      emailUser &&
      String(usernameUser._id) !==
        String(emailUser._id)
    ) {
      throw new Error(
        "The configured username and email belong to two different users."
      );
    }

    return (
      usernameUser ||
      emailUser ||
      null
    );
  };

const createAdministrator = async ({
  username,
  email,
  password,
}) => {
  if (!password) {
    throw new Error(
      "INITIAL_ADMIN_PASSWORD is required when creating the first Super Administrator."
    );
  }

  const user = new User({
    username,
    email,
    passwordHash: "temporary",
    passwordHistory: [],
    role: "super_admin",
    status: "Active",
    extraPermissions: [],
    deniedPermissions: [],
    mustChangePassword: true,
    failedLoginAttempts: 0,
    lockUntil: null,
  });

  /*
   * اصل محفوظ پاس ورڈ setUserPassword
   * تیار کرے گا۔
   */
  user.passwordHash = "";

  await setUserPassword(
    user,
    password,
    {
      mustChangePassword: true,
    }
  );

  /*
   * نیا نمونہ بناتے وقت شناخت پہلے ہی
   * دستیاب ہوتی ہے۔
   */
  user.createdBy = user._id;
  user.updatedBy = user._id;

  await user.save();

  console.log(
    "Initial Super Administrator created successfully."
  );

  console.log(
    `Username: ${user.username}`
  );

  console.log(
    "The administrator must change the temporary password after signing in."
  );

  return user;
};

const updateAdministrator = async (
  user,
  {
    username,
    email,
    password,
    resetExistingPassword,
  }
) => {
  user.username = username;

  /*
   * خالی برقی پتہ دینے پر پہلے سے محفوظ
   * برقی پتہ ختم نہیں کیا جائے گا۔
   */
  if (email) {
    user.email = email;
  }

  user.role = "super_admin";
  user.status = "Active";
  user.extraPermissions = [];
  user.deniedPermissions = [];
  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  user.updatedBy = user._id;

  let passwordWasReset = false;

  if (resetExistingPassword) {
    if (!password) {
      throw new Error(
        "INITIAL_ADMIN_PASSWORD is required when INITIAL_ADMIN_RESET_PASSWORD=true."
      );
    }

    await setUserPassword(
      user,
      password,
      {
        mustChangePassword: true,
      }
    );

    passwordWasReset = true;
  }

  await user.save();

  /*
   * پاس ورڈ بدلنے کے بعد پرانی تمام
   * نشستیں بند کر دیں۔
   */
  if (passwordWasReset) {
    await revokeUserSessions(
      user._id
    );
  }

  console.log(
    "Existing Super Administrator updated successfully."
  );

  console.log(
    `Username: ${user.username}`
  );

  if (passwordWasReset) {
    console.log(
      "Password reset completed. Existing sessions were revoked."
    );
  } else {
    console.log(
      "Password was not changed."
    );
  }

  return user;
};

const seedAdministrator = async () => {
  const settings =
    getAdminSettings();

  await connectDatabase();

  console.log(
    "Database connected successfully."
  );

  const existingUser =
    await loadExistingAdministrator(
      settings.username,
      settings.email
    );

  if (!existingUser) {
    await createAdministrator(
      settings
    );

    return;
  }

  await updateAdministrator(
    existingUser,
    settings
  );
};

seedAdministrator()
  .catch((error) => {
    console.error(
      "Super Administrator seed failed:"
    );

    console.error(
      error.message || error
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch (disconnectError) {
      console.error(
        "Database disconnect warning:",
        disconnectError.message
      );
    }
  });