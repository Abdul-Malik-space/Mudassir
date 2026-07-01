const express = require('express');
const router = express.Router();
const Account = require('../models/Account');


router.get('/', async (req, res) => {
  try {
    let account = await Account.findOne();
    if (!account) {
     
      account = await Account.create({ cash: 0, bank: 0 });
    }
    res.json(account);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.put('/', async (req, res) => {
  try {
    const { cash, bank } = req.body;
    const account = await Account.findOneAndUpdate(
      {},
      { cash: Number(cash), bank: Number(bank), lastUpdated: Date.now() },
      { new: true, upsert: true }
    );
    res.json(account);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;