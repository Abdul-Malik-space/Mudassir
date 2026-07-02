const express = require("express");
const router = express.Router();

const DeliveryChallan = require("../models/DeliveryChallan");
const SalesOrder = require("../models/SalesOrder");

const todayYear = () => new Date().getFullYear();

const generateChallanNo = async () => {
  const count = await DeliveryChallan.countDocuments();
  return `DC-${todayYear()}-${String(count + 1).padStart(4, "0")}`;
};

const cleanDeliveryItems = (items = []) => {
  return items
    .filter((item) => item.description && Number(item.quantity || 0) > 0)
    .map((item) => ({
      description: item.description || "",
      size: item.size || "",
      cartons: Number(item.cartons || 0),
      quantity: Number(item.quantity || 0),
      unit: item.unit || "Rolls",
    }));
};

const calculateTotals = (items = []) => {
  const totalCartons = items.reduce((sum, item) => sum + Number(item.cartons || 0), 0);
  const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  return { totalCartons, totalQuantity };
};

router.get("/next-no", async (req, res) => {
  try {
    const challanNo = await generateChallanNo();
    res.json({ challanNo });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/all", async (req, res) => {
  try {
    const challans = await DeliveryChallan.find()
      .populate("salesOrder", "salesOrderNo orderDate deliveryDate status")
      .populate("customer", "customerName phoneNumber email address city")
      .sort({ createdAt: -1 });

    res.json(challans);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.post("/add", async (req, res) => {
  try {
    const {
      challanNo,
      salesOrder,
      challanDate,
      poNo,
      vehicleNo,
      driverName,
      deliveredBy,
      receivedBy,
      status,
      remarks,
      items,
    } = req.body;

    if (!salesOrder) {
      return res.status(400).json({ message: "Sales Order is required" });
    }

    if (!challanDate) {
      return res.status(400).json({ message: "Challan date is required" });
    }

    const selectedOrder = await SalesOrder.findById(salesOrder);

    if (!selectedOrder) {
      return res.status(404).json({ message: "Sales Order not found" });
    }

    const sourceItems = items && items.length > 0 ? items : selectedOrder.items;
    const cleanItems = cleanDeliveryItems(sourceItems);

    if (cleanItems.length === 0) {
      return res.status(400).json({ message: "Please add at least one valid delivery item" });
    }

    const totals = calculateTotals(cleanItems);
    const finalChallanNo = challanNo || (await generateChallanNo());

    const challan = new DeliveryChallan({
      challanNo: finalChallanNo,
      salesOrder: selectedOrder._id,
      salesOrderNo: selectedOrder.salesOrderNo,

      customer: selectedOrder.customer,
      customerName: selectedOrder.customerName,
      customerPhone: selectedOrder.customerPhone || "",
      customerEmail: selectedOrder.customerEmail || "",
      customerAddress: selectedOrder.customerAddress || "",

      challanDate,
      poNo: poNo || selectedOrder.poNo || "",

      vehicleNo,
      driverName,
      deliveredBy,
      receivedBy,

      items: cleanItems,
      totalCartons: totals.totalCartons,
      totalQuantity: totals.totalQuantity,

      status: status || "Draft",
      remarks,
    });

    const savedChallan = await challan.save();

    if (savedChallan.status !== "Cancelled") {
      await SalesOrder.findByIdAndUpdate(selectedOrder._id, {
        status: "Delivered",
      });
    }

    res.status(201).json({
      message: "Delivery challan created successfully",
      data: savedChallan,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put("/update/:id", async (req, res) => {
  try {
    const existingChallan = await DeliveryChallan.findById(req.params.id);

    if (!existingChallan) {
      return res.status(404).json({ message: "Delivery challan not found" });
    }

    const selectedOrder = await SalesOrder.findById(
      req.body.salesOrder || existingChallan.salesOrder
    );

    if (!selectedOrder) {
      return res.status(404).json({ message: "Sales Order not found" });
    }

    const cleanItems = cleanDeliveryItems(req.body.items || existingChallan.items);

    if (cleanItems.length === 0) {
      return res.status(400).json({ message: "Please add at least one valid delivery item" });
    }

    const totals = calculateTotals(cleanItems);

    const updatedChallan = await DeliveryChallan.findByIdAndUpdate(
      req.params.id,
      {
        challanNo: req.body.challanNo || existingChallan.challanNo,
        salesOrder: selectedOrder._id,
        salesOrderNo: selectedOrder.salesOrderNo,

        customer: selectedOrder.customer,
        customerName: selectedOrder.customerName,
        customerPhone: selectedOrder.customerPhone || "",
        customerEmail: selectedOrder.customerEmail || "",
        customerAddress: selectedOrder.customerAddress || "",

        challanDate: req.body.challanDate || existingChallan.challanDate,
        poNo: req.body.poNo || selectedOrder.poNo || "",

        vehicleNo: req.body.vehicleNo || "",
        driverName: req.body.driverName || "",
        deliveredBy: req.body.deliveredBy || "",
        receivedBy: req.body.receivedBy || "",

        items: cleanItems,
        totalCartons: totals.totalCartons,
        totalQuantity: totals.totalQuantity,

        status: req.body.status || existingChallan.status,
        remarks: req.body.remarks || "",
      },
      { new: true, runValidators: true }
    );

    res.json({
      message: "Delivery challan updated successfully",
      data: updatedChallan,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.patch("/status/:id", async (req, res) => {
  try {
    const challan = await DeliveryChallan.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );

    if (!challan) {
      return res.status(404).json({ message: "Delivery challan not found" });
    }

    res.json({ message: "Status updated", data: challan });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete("/delete/:id", async (req, res) => {
  try {
    const challan = await DeliveryChallan.findByIdAndDelete(req.params.id);

    if (!challan) {
      return res.status(404).json({ message: "Delivery challan not found" });
    }

    res.json({ message: "Delivery challan deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;