const mongoose = require("mongoose");

const purchaseSchema = new mongoose.Schema({
  // وینڈر کا نام (لازمی)
  vendor: { type: String, required: true }, 
  vendorPhone: { type: String },
  vendorAddress: { type: String },
  
  // آرڈر کی تاریخ (لازمی)
  date: { type: String, required: true },
  
  // فرنٹ اینڈ کے مطابق تینوں اسٹیٹس یہاں الاؤ کر دیے ہیں
  status: { 
    type: String, 
    enum: ["Pending", "Received", "Cancelled"], 
    default: "Pending" 
  },
  
  // فرنٹ اینڈ کے مطابق poNumber کر دیا تاکہ میچ ہو جائے
  poNumber: { type: String },
  paymentMethod: { type: String, default: "Cash" },
  paidAmount: { type: Number, default: 0 },
  
  // آئٹمز کی لسٹ
  items: { type: Array, default: [] }, 
  
  // کل رقم (لازمی)
  total: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model("Purchase", purchaseSchema);