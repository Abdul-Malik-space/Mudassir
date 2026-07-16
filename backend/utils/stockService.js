const mongoose = require("mongoose");

const Item = require("../models/Item");
const StockLedger = require("../models/StockLedger");

const todayDate = () => new Date().toISOString().slice(0, 10);

const getItemStock = async (itemId, warehouse = "Main Godown") => {
  const result = await StockLedger.aggregate([
    {
      $match: {
        item: new mongoose.Types.ObjectId(itemId),
        warehouse,
      },
    },
    {
      $group: {
        _id: "$item",
        qtyIn: { $sum: "$qtyIn" },
        qtyOut: { $sum: "$qtyOut" },
      },
    },
  ]);

  const row = result[0];

  if (!row) return 0;

  return Number(row.qtyIn || 0) - Number(row.qtyOut || 0);
};

const postStockMovement = async ({
  item,
  warehouse = "Main Godown",
  date = todayDate(),
  movementType,
  sourceModule = "",
  referenceModel = "",
  referenceId = null,
  referenceNo = "",
  qtyIn = 0,
  qtyOut = 0,
  rate = 0,
  remarks = "",
  allowNegativeStock = false,
}) => {
  const selectedItem = await Item.findById(item);

  if (!selectedItem) {
    throw new Error("Stock item not found");
  }

  const finalQtyIn = Number(qtyIn || 0);
  const finalQtyOut = Number(qtyOut || 0);

  if (finalQtyIn <= 0 && finalQtyOut <= 0) {
    throw new Error("Stock quantity required hai");
  }

  if (finalQtyIn > 0 && finalQtyOut > 0) {
    throw new Error("Aik entry mein IN aur OUT dono nahi ho sakte");
  }

  if (finalQtyOut > 0 && !allowNegativeStock) {
    const currentStock = await getItemStock(item, warehouse);

    if (finalQtyOut > currentStock) {
      throw new Error(
        `Stock available nahi hai. Current stock sirf ${currentStock} ${selectedItem.unit} hai`
      );
    }
  }

  const ledger = await StockLedger.create({
    date,
    item: selectedItem._id,
    itemCode: selectedItem.code,
    itemName: selectedItem.name,
    warehouse,
    movementType,
    sourceModule,
    referenceModel,
    referenceId,
    referenceNo,
    qtyIn: finalQtyIn,
    qtyOut: finalQtyOut,
    unit: selectedItem.unit,
    rate: Number(rate || selectedItem.purchasePrice || 0),
    remarks,
  });

  return ledger;
};

module.exports = {
  getItemStock,
  postStockMovement,
};