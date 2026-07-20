const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

const Counter = require("../models/Counter");
const Printing = require("../models/Printing");
const ProductionItem = require("../models/ProductionItem");

const ALLOWED_JOB_STATUSES = [
  "Material Issued",
  "In Printing",
  "Quality Check",
];

const todayDate = () =>
  new Date().toISOString().slice(0, 10);

const normalizeText = (value, fallback = "") => {
  const cleanedValue = String(value || "").trim();

  return cleanedValue || fallback;
};

const normalizeNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
};

const idOf = (value) => {
  if (!value) {
    return "";
  }

  if (typeof value === "object") {
    return String(value._id || value.id || "");
  }

  return String(value);
};

const isValidId = (value) =>
  mongoose.isValidObjectId(value);

const populatePrinting = (query) =>
  query
    .populate(
      "productionJob",
      "jobNo jobName customerName targetQty unit status materialIssuePosted printedQty goodQty rejectedQty wastageQty productionOutputPosted finishedGoodCode finishedGoodName"
    )
    .populate(
      "finishedGoodItem",
      "code name itemType unit status"
    );

const getNextPrintingNo = async () => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const counter = await Counter.findOneAndUpdate(
      {
        name: "printingNo",
      },
      {
        $inc: {
          seq: 1,
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    const printingNo = `PRN-${String(counter.seq).padStart(
      4,
      "0"
    )}`;

    const exists = await Printing.exists({
      printingNo,
    });

    if (!exists) {
      return printingNo;
    }
  }

  throw new Error(
    "Unable to generate a unique printing number"
  );
};

const peekNextPrintingNo = async () => {
  const counter = await Counter.findOne({
    name: "printingNo",
  });

  const nextSequence = counter
    ? normalizeNumber(counter.seq) + 1
    : 1;

  return `PRN-${String(nextSequence).padStart(4, "0")}`;
};

const getCompletedGoodQuantity = async (
  productionJob,
  excludedPrintingId = null
) => {
  const query = {
    productionJob,
    status: "Completed",
  };

  if (excludedPrintingId) {
    query._id = {
      $ne: excludedPrintingId,
    };
  }

  const result = await Printing.aggregate([
    {
      $match: {
        productionJob: new mongoose.Types.ObjectId(
          productionJob
        ),
        status: "Completed",
        ...(excludedPrintingId
          ? {
              _id: {
                $ne: new mongoose.Types.ObjectId(
                  excludedPrintingId
                ),
              },
            }
          : {}),
      },
    },
    {
      $group: {
        _id: null,
        total: {
          $sum: "$goodQty",
        },
      },
    },
  ]);

  return normalizeNumber(result[0]?.total);
};

const getProductionJob = async (jobId) => {
  if (!isValidId(jobId)) {
    throw new Error("A valid production job is required");
  }

  const job = await ProductionItem.findById(jobId);

  if (!job) {
    throw new Error("Production job not found");
  }

  if (!job.materialIssuePosted) {
    throw new Error(
      "Material must be issued before printing can begin"
    );
  }

  if (!ALLOWED_JOB_STATUSES.includes(job.status)) {
    throw new Error(
      `Printing cannot be created for a job with status ${job.status}`
    );
  }

  if (job.productionOutputPosted) {
    throw new Error(
      "Printing cannot be changed after production output has been posted"
    );
  }

  return job;
};

const buildPrintingPayload = async (
  body,
  existingPrinting = null
) => {
  const productionJobId = idOf(
    existingPrinting?.productionJob || body.productionJob
  );

  const job = await getProductionJob(productionJobId);

  const completedGoodQty = await getCompletedGoodQuantity(
    job._id,
    existingPrinting?._id || null
  );

  const remainingJobQty = Math.max(
    normalizeNumber(job.targetQty) - completedGoodQty,
    0
  );

  const plannedQty = normalizeNumber(
    body.plannedQty ??
      existingPrinting?.plannedQty ??
      remainingJobQty
  );

  if (plannedQty <= 0) {
    throw new Error(
      "Planned printing quantity must be greater than zero"
    );
  }

  if (plannedQty > remainingJobQty) {
    throw new Error(
      `Planned quantity cannot exceed remaining job quantity ${remainingJobQty} ${job.unit}`
    );
  }

  const printedQty = normalizeNumber(
    body.printedQty ?? existingPrinting?.printedQty
  );

  const goodQty = normalizeNumber(
    body.goodQty ?? existingPrinting?.goodQty
  );

  const rejectedQty = normalizeNumber(
    body.rejectedQty ?? existingPrinting?.rejectedQty
  );

  const wastageQty = normalizeNumber(
    body.wastageQty ?? existingPrinting?.wastageQty
  );

  if (goodQty > plannedQty) {
    throw new Error(
      "Good quantity cannot exceed planned quantity"
    );
  }

  if (completedGoodQty + goodQty > normalizeNumber(job.targetQty)) {
    throw new Error(
      "Total good quantity cannot exceed production job target"
    );
  }

  return {
    job,

    payload: {
      productionJob: job._id,

      jobNo: job.jobNo,

      jobName: job.jobName,

      customerName: job.customerName || "",

      finishedGoodItem: job.finishedGoodItem,

      finishedGoodCode: job.finishedGoodCode || "",

      finishedGoodName: job.finishedGoodName || "",

      entryDate: normalizeText(
        body.entryDate,
        existingPrinting?.entryDate || todayDate()
      ),

      plannedQty,

      printedQty,

      goodQty,

      rejectedQty,

      wastageQty,

      unit: normalizeText(
        body.unit,
        existingPrinting?.unit || job.unit || "Pcs"
      ),

      paperSize: normalizeText(
        body.paperSize,
        existingPrinting?.paperSize || job.sheetSize || ""
      ),

      colorType: normalizeText(
        body.colorType,
        existingPrinting?.colorType || job.noOfColors || ""
      ),

      side: normalizeText(
        body.side,
        existingPrinting?.side || "1-side"
      ),

      impressions: normalizeNumber(
        body.impressions ?? existingPrinting?.impressions
      ),

      platesCount: normalizeNumber(
        body.platesCount ?? existingPrinting?.platesCount
      ),

      machine: normalizeText(
        body.machine,
        existingPrinting?.machine || ""
      ),

      operator: normalizeText(
        body.operator ?? body.employee,
        existingPrinting?.operator || ""
      ),

      helper: normalizeText(
        body.helper,
        existingPrinting?.helper || ""
      ),

      shift: normalizeText(
        body.shift,
        existingPrinting?.shift || "Day"
      ),

      startTime: normalizeText(
        body.startTime,
        existingPrinting?.startTime || ""
      ),

      endTime: normalizeText(
        body.endTime,
        existingPrinting?.endTime || ""
      ),

      rate: normalizeNumber(
        body.rate ?? existingPrinting?.rate
      ),

      remarks: normalizeText(
        body.remarks,
        existingPrinting?.remarks || ""
      ),
    },
  };
};

const syncProductionJob = async (productionJobId) => {
  const job = await ProductionItem.findById(productionJobId);

  if (!job || job.productionOutputPosted) {
    return;
  }

  const completedTotals = await Printing.aggregate([
    {
      $match: {
        productionJob: new mongoose.Types.ObjectId(
          productionJobId
        ),
        status: "Completed",
      },
    },
    {
      $group: {
        _id: null,

        printedQty: {
          $sum: "$printedQty",
        },

        goodQty: {
          $sum: "$goodQty",
        },

        rejectedQty: {
          $sum: "$rejectedQty",
        },

        wastageQty: {
          $sum: "$wastageQty",
        },
      },
    },
  ]);

  const totals = completedTotals[0] || {};

  job.printedQty = normalizeNumber(totals.printedQty);
  job.goodQty = normalizeNumber(totals.goodQty);
  job.rejectedQty = normalizeNumber(totals.rejectedQty);
  job.wastageQty = normalizeNumber(totals.wastageQty);

  const inProgressExists = await Printing.exists({
    productionJob: job._id,
    status: "In Progress",
  });

  const completedExists = await Printing.exists({
    productionJob: job._id,
    status: "Completed",
  });

  if (inProgressExists) {
    job.status = "In Printing";
  } else if (completedExists) {
    job.status = "Quality Check";
  } else if (job.materialIssuePosted) {
    job.status = "Material Issued";
  } else {
    job.status = "Approved";
  }

  await job.save();
};

const validateCompletion = async (printing) => {
  const printedQty = normalizeNumber(printing.printedQty);
  const goodQty = normalizeNumber(printing.goodQty);
  const rejectedQty = normalizeNumber(printing.rejectedQty);
  const wastageQty = normalizeNumber(printing.wastageQty);

  if (printedQty <= 0) {
    throw new Error(
      "Printed quantity must be greater than zero"
    );
  }

  const classifiedQty =
    goodQty + rejectedQty + wastageQty;

  if (Math.abs(classifiedQty - printedQty) > 0.000001) {
    throw new Error(
      "Good, rejected and wastage quantities must equal printed quantity"
    );
  }

  const job = await ProductionItem.findById(
    printing.productionJob
  );

  if (!job) {
    throw new Error("Production job not found");
  }

  const previousGoodQty = await getCompletedGoodQuantity(
    job._id,
    printing._id
  );

  if (
    previousGoodQty + goodQty >
    normalizeNumber(job.targetQty)
  ) {
    throw new Error(
      "Total good quantity cannot exceed the production job target"
    );
  }
};

router.get("/next-no", async (req, res) => {
  try {
    return res.json({
      success: true,
      printingNo: await peekNextPrintingNo(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.get("/all", async (req, res) => {
  try {
    const {
      search = "",
      status = "",
      productionJob = "",
      dateFrom = "",
      dateTo = "",
    } = req.query;

    const query = {};

    if (status && status !== "All") {
      query.status = status;
    }

    if (productionJob) {
      if (!isValidId(productionJob)) {
        return res.status(400).json({
          success: false,
          message: "Invalid production job ID",
        });
      }

      query.productionJob = productionJob;
    }

    if (dateFrom || dateTo) {
      query.entryDate = {};

      if (dateFrom) {
        query.entryDate.$gte = dateFrom;
      }

      if (dateTo) {
        query.entryDate.$lte = dateTo;
      }
    }

    if (search) {
      query.$or = [
        {
          printingNo: {
            $regex: search,
            $options: "i",
          },
        },
        {
          jobNo: {
            $regex: search,
            $options: "i",
          },
        },
        {
          jobName: {
            $regex: search,
            $options: "i",
          },
        },
        {
          finishedGoodCode: {
            $regex: search,
            $options: "i",
          },
        },
        {
          finishedGoodName: {
            $regex: search,
            $options: "i",
          },
        },
        {
          operator: {
            $regex: search,
            $options: "i",
          },
        },
        {
          machine: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    const entries = await populatePrinting(
      Printing.find(query).sort({
        entryDate: -1,
        createdAt: -1,
      })
    );

    return res.json(entries);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.get("/job/:jobId", async (req, res) => {
  try {
    if (!isValidId(req.params.jobId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid production job ID",
      });
    }

    const entries = await populatePrinting(
      Printing.find({
        productionJob: req.params.jobId,
      }).sort({
        entryDate: -1,
        createdAt: -1,
      })
    );

    return res.json(entries);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid printing entry ID",
      });
    }

    const entry = await populatePrinting(
      Printing.findById(req.params.id)
    );

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: "Printing entry not found",
      });
    }

    return res.json({
      success: true,
      data: entry,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.post("/add", async (req, res) => {
  try {
    const { job, payload } = await buildPrintingPayload(
      req.body
    );

    const openEntryExists = await Printing.exists({
      productionJob: job._id,
      status: {
        $in: ["Draft", "In Progress"],
      },
    });

    if (openEntryExists) {
      return res.status(400).json({
        success: false,
        message:
          "This production job already has an open printing entry",
      });
    }

    const printingNo = req.body.printingNo
      ? normalizeText(req.body.printingNo).toUpperCase()
      : await getNextPrintingNo();

    const entry = await Printing.create({
      ...payload,
      printingNo,
      status: "Draft",
      qcStatus: "Pending",
    });

    const data = await populatePrinting(
      Printing.findById(entry._id)
    );

    return res.status(201).json({
      success: true,
      message: "Printing entry created successfully",
      data,
    });
  } catch (error) {
    const message =
      error.code === 11000
        ? "This printing number already exists"
        : error.message;

    return res.status(400).json({
      success: false,
      message,
    });
  }
});

router.put("/update/:id", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid printing entry ID",
      });
    }

    const entry = await Printing.findById(req.params.id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: "Printing entry not found",
      });
    }

    if (!["Draft", "In Progress"].includes(entry.status)) {
      return res.status(400).json({
        success: false,
        message:
          "Only Draft or In Progress printing entries can be edited",
      });
    }

    const { payload } = await buildPrintingPayload(
      req.body,
      entry
    );

    Object.assign(entry, payload);

    await entry.save();
    await syncProductionJob(entry.productionJob);

    const data = await populatePrinting(
      Printing.findById(entry._id)
    );

    return res.json({
      success: true,
      message: "Printing entry updated successfully",
      data,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

router.post("/start/:id", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid printing entry ID",
      });
    }

    const entry = await Printing.findById(req.params.id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: "Printing entry not found",
      });
    }

    if (entry.status !== "Draft") {
      return res.status(400).json({
        success: false,
        message: "Only a Draft printing entry can be started",
      });
    }

    await getProductionJob(entry.productionJob);

    entry.status = "In Progress";
    entry.startedAt = new Date();

    if (!entry.startTime) {
      entry.startTime = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    }

    await entry.save();
    await syncProductionJob(entry.productionJob);

    const data = await populatePrinting(
      Printing.findById(entry._id)
    );

    return res.json({
      success: true,
      message: "Printing started successfully",
      data,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

router.post("/complete/:id", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid printing entry ID",
      });
    }

    const entry = await Printing.findById(req.params.id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: "Printing entry not found",
      });
    }

    if (entry.status !== "In Progress") {
      return res.status(400).json({
        success: false,
        message:
          "Only an In Progress printing entry can be completed",
      });
    }

    if (req.body && Object.keys(req.body).length > 0) {
      const { payload } = await buildPrintingPayload(
        req.body,
        entry
      );

      Object.assign(entry, payload);
    }

    await validateCompletion(entry);

    entry.status = "Completed";
    entry.qcStatus = "Pending";
    entry.completedAt = new Date();

    if (!entry.endTime) {
      entry.endTime = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    }

    await entry.save();
    await syncProductionJob(entry.productionJob);

    const data = await populatePrinting(
      Printing.findById(entry._id)
    );

    return res.json({
      success: true,
      message: "Printing completed successfully",
      data,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

router.post("/cancel/:id", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid printing entry ID",
      });
    }

    const entry = await Printing.findById(req.params.id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: "Printing entry not found",
      });
    }

    if (entry.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Printing entry is already cancelled",
      });
    }

    const job = await ProductionItem.findById(
      entry.productionJob
    );

    if (job?.productionOutputPosted) {
      return res.status(400).json({
        success: false,
        message:
          "Printing cannot be cancelled after production output has been posted",
      });
    }

    entry.status = "Cancelled";
    entry.cancelledAt = new Date();
    entry.cancelReason = normalizeText(
      req.body.cancelReason,
      "Printing entry cancelled"
    );

    await entry.save();
    await syncProductionJob(entry.productionJob);

    const data = await populatePrinting(
      Printing.findById(entry._id)
    );

    return res.json({
      success: true,
      message: "Printing entry cancelled successfully",
      data,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

router.delete("/delete/:id", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid printing entry ID",
      });
    }

    const entry = await Printing.findById(req.params.id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: "Printing entry not found",
      });
    }

    if (entry.status !== "Draft") {
      return res.status(400).json({
        success: false,
        message: "Only a Draft printing entry can be deleted",
      });
    }

    const productionJob = entry.productionJob;

    await Printing.findByIdAndDelete(entry._id);
    await syncProductionJob(productionJob);

    return res.json({
      success: true,
      message: "Printing entry deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;