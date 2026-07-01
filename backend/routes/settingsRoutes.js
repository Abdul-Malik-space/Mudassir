const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');

// 1. موجودہ سیٹنگز حاصل کریں
// موجودہ سیٹنگز حاصل کریں
router.get('/', async (req, res) => {
  try {
    let settings = await Settings.findOne();
    
    // اگر ڈیٹا بیس میں سیٹنگز موجود نہیں ہیں تو ایک ڈیفالٹ ریکارڈ بنائیں
    if (!settings) {
      settings = await Settings.create({
        companyName: 'My Enterprise',
        email: 'admin@company.com',
        phone: '0000-0000000',
        theme: 'Light Mode',
        language: 'English'
      });
    }
    
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 2. پروفائل اور پریفرینسز اپڈیٹ کریں
router.put('/update', async (req, res) => {
  try {
    const updated = await Settings.findOneAndUpdate({}, req.body, { new: true, upsert: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 3. پاسورڈ تبدیل کرنے کا روٹ (صرف لاجک کے لیے)
router.post('/change-password', async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  // یہاں آپ اصل پاسورڈ چیک کریں گے اور نیا سیو کریں گے
  res.json({ message: "Password updated successfully!" });
});

module.exports = router;