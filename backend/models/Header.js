const mongoose = require("mongoose");

const menuItemSchema = new mongoose.Schema({
  id: String,
  label: String,
  icon: String,
  active: {
    type: Boolean,
    default: false
  },
  badge: String,
  count: String,

  submenu: [
    {
      id: String,
      label: String
    }
  ]
});

const headerSchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: true
  },

  userName: {
    type: String,
    required: true
  },

  role: {
    type: String,
    default: "Administrator"
  },

  logo: {
    type: String,
    default: ""
  },

  dashboardTitle: {
    type: String,
    default: "Dashboard"
  },

  welcomeText: {
    type: String,
    default: "Welcome Back"
  },

  searchPlaceholder: {
    type: String,
    default: "Search Anything"
  },

  notificationCount: {
    type: Number,
    default: 0
  },

  darkMode: {
    type: Boolean,
    default: false
  },

  quickButtonText: {
    type: String,
    default: "New"
  },

  menus: [menuItemSchema],

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Header", headerSchema);