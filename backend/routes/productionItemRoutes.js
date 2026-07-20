const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

const ProductionItem = require(
  "../models/ProductionItem"
);

const Item = require(
  "../models/Item"
);

const Counter = require(
  "../models/Counter"
);

const StockLedger = require(
  "../models/StockLedger"
);

const ALLOWED_MATERIAL_TYPES = [
  "Raw Material",
  "Packing Material",
  "Consumable",
];

const STATUS_TRANSITIONS = {
  Draft: [
    "Approved",
    "Cancelled",
  ],

  Approved: [
    "Material Issued",
    "Cancelled",
  ],

  "Material Issued": [
    "In Printing",
    "Cancelled",
  ],

  "In Printing": [
    "Quality Check",
    "Cancelled",
  ],

  "Quality Check": [
    "In Printing",
    "Completed",
    "Cancelled",
  ],

  Completed: [
    "Closed",
  ],

  Closed: [],

  Cancelled: [],
};

const todayDate = () =>
  new Date()
    .toISOString()
    .slice(0, 10);

const normalizeText = (
  value,
  fallback = ""
) => {
  const text = String(
    value || ""
  ).trim();

  return text || fallback;
};

const normalizeNumber = (
  value,
  fallback = 0
) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
};

const getId = (value) => {
  if (!value) {
    return "";
  }

  if (
    typeof value === "object"
  ) {
    return String(
      value._id ||
        value.id ||
        ""
    );
  }

  return String(value);
};

const isValidObjectId = (
  value
) => {
  return mongoose.isValidObjectId(
    value
  );
};

const normalizeDate = (
  value,
  fallback = ""
) => {
  if (!value) {
    return fallback;
  }

  const text = String(
    value
  ).trim();

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      text
    )
  ) {
    return text;
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return fallback;
  }

  return date
    .toISOString()
    .slice(0, 10);
};

const getHighestExistingJobSequence =
  async () => {
    const result =
      await ProductionItem.aggregate([
        {
          $match: {
            jobNo:
              /^JOB-\d+$/i,
          },
        },
        {
          $project: {
            sequence: {
              $toInt: {
                $arrayElemAt: [
                  {
                    $split: [
                      "$jobNo",
                      "-",
                    ],
                  },
                  1,
                ],
              },
            },
          },
        },
        {
          $sort: {
            sequence: -1,
          },
        },
        {
          $limit: 1,
        },
      ]);

    return Number(
      result[0]?.sequence || 0
    );
  };

const syncProductionJobCounter =
  async () => {
    const highestExistingSequence =
      await getHighestExistingJobSequence();

    const counter =
      await Counter.findOneAndUpdate(
        {
          name:
            "productionJobNo",
        },
        {
          $max: {
            seq:
              highestExistingSequence,
          },
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert:
            true,
        }
      );

    return Number(
      counter.seq || 0
    );
  };

const getNextJobNo = async () => {
  await syncProductionJobCounter();

  for (
    let attempt = 0;
    attempt < 20;
    attempt += 1
  ) {
    const counter =
      await Counter.findOneAndUpdate(
        {
          name:
            "productionJobNo",
        },
        {
          $inc: {
            seq: 1,
          },
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert:
            true,
        }
      );

    const jobNo = `JOB-${String(
      counter.seq
    ).padStart(4, "0")}`;

    const alreadyExists =
      await ProductionItem.exists({
        jobNo,
      });

    if (!alreadyExists) {
      return jobNo;
    }
  }

  throw new Error(
    "Unable to generate a unique production job number"
  );
};

const peekNextJobNo =
  async () => {
    const currentSequence =
      await syncProductionJobCounter();

    return `JOB-${String(
      currentSequence + 1
    ).padStart(4, "0")}`;
  };

const prepareMaterialRequirements =
  async (rows = []) => {
    if (!Array.isArray(rows)) {
      throw new Error(
        "Material requirements must be an array"
      );
    }

    const cleanRows =
      rows.filter(
        (row) =>
          row &&
          getId(row.item)
      );

    const itemIds =
      cleanRows.map(
        (row) =>
          getId(row.item)
      );

    if (
      itemIds.some(
        (id) =>
          !isValidObjectId(id)
      )
    ) {
      throw new Error(
        "One or more material item IDs are invalid"
      );
    }

    if (
      new Set(itemIds).size !==
      itemIds.length
    ) {
      throw new Error(
        "The same material item cannot be added more than once"
      );
    }

    const itemDocuments =
      await Item.find({
        _id: {
          $in: itemIds,
        },
      });

    const itemMap =
      new Map(
        itemDocuments.map(
          (item) => [
            String(item._id),
            item,
          ]
        )
      );

    return cleanRows.map(
      (row) => {
        const itemDocument =
          itemMap.get(
            getId(row.item)
          );

        if (!itemDocument) {
          throw new Error(
            "A selected material item could not be found"
          );
        }

        if (
          itemDocument.status ===
          "Inactive"
        ) {
          throw new Error(
            `Material item "${itemDocument.name}" is inactive`
          );
        }

        if (
          itemDocument.stockManaged ===
            false ||
          !ALLOWED_MATERIAL_TYPES.includes(
            itemDocument.itemType
          )
        ) {
          throw new Error(
            `Item "${itemDocument.name}" cannot be used as a production material`
          );
        }

        const requiredQty =
          normalizeNumber(
            row.requiredQty ??
              row.quantity
          );

        if (
          requiredQty <= 0
        ) {
          throw new Error(
            `Required quantity for "${itemDocument.name}" must be greater than zero`
          );
        }

        return {
          _id:
            row._id ||
            undefined,

          item:
            itemDocument._id,

          itemCode:
            itemDocument.code,

          itemName:
            itemDocument.name,

          requiredQty,

          issuedQty:
            normalizeNumber(
              row.issuedQty
            ),

          returnedQty:
            normalizeNumber(
              row.returnedQty
            ),

          wastageQty:
            normalizeNumber(
              row.wastageQty
            ),

          unit:
            normalizeText(
              row.unit,
              itemDocument.unit ||
                "Pcs"
            ),

          rate:
            normalizeNumber(
              row.rate,
              itemDocument.purchasePrice ||
                0
            ),

          remarks:
            normalizeText(
              row.remarks
            ),
        };
      }
    );
  };

const buildJobPayload = async (
  body,
  existingJob = null
) => {
  const finishedGoodId =
    getId(
      body.finishedGoodItem ??
        body.item ??
        existingJob
          ?.finishedGoodItem
    );

  if (
    !finishedGoodId ||
    !isValidObjectId(
      finishedGoodId
    )
  ) {
    throw new Error(
      "A valid finished good item is required"
    );
  }

  const finishedGood =
    await Item.findById(
      finishedGoodId
    );

  if (!finishedGood) {
    throw new Error(
      "Finished good item not found"
    );
  }

  if (
    finishedGood.itemType !==
      "Finished Good" ||
    finishedGood.stockManaged ===
      false
  ) {
    throw new Error(
      "The selected item must be a stock-managed Finished Good"
    );
  }

  if (
    finishedGood.status ===
    "Inactive"
  ) {
    throw new Error(
      "The selected finished good item is inactive"
    );
  }

  const sourceType =
    normalizeText(
      body.sourceType,
      existingJob?.sourceType ||
        (
          body.salesOrder
            ? "Sales Order"
            : "Internal Requirement"
        )
    );

  const salesOrderId =
    sourceType ===
    "Sales Order"
      ? getId(
          body.salesOrder ??
            existingJob
              ?.salesOrder
        )
      : "";

  if (
    sourceType ===
      "Sales Order" &&
    !isValidObjectId(
      salesOrderId
    )
  ) {
    throw new Error(
      "A valid Sales Order is required"
    );
  }

  const customerId =
    getId(
      body.customer ??
        existingJob?.customer
    );

  if (
    customerId &&
    !isValidObjectId(
      customerId
    )
  ) {
    throw new Error(
      "Customer ID is invalid"
    );
  }

  const targetQty =
    normalizeNumber(
      body.targetQty ??
        body.quantity ??
        existingJob?.targetQty
    );

  if (targetQty <= 0) {
    throw new Error(
      "Target quantity must be greater than zero"
    );
  }

  const materialRows =
    body.materialRequirements ??
    body.materials ??
    existingJob
      ?.materialRequirements ??
    [];

  const materialRequirements =
    await prepareMaterialRequirements(
      materialRows
    );

  const customerName =
    normalizeText(
      body.customerName,
      existingJob
        ?.customerName ||
        (
          sourceType ===
          "Internal Requirement"
            ? "Internal Production"
            : ""
        )
    );

  if (!customerName) {
    throw new Error(
      "Customer name is required"
    );
  }

  return {
    jobName:
      normalizeText(
        body.jobName ??
          body.name,
        existingJob?.jobName ||
          finishedGood.name
      ),

    sourceType,

    salesOrder:
      sourceType ===
      "Sales Order"
        ? salesOrderId
        : null,

    salesOrderNo:
      normalizeText(
        body.salesOrderNo ??
          body.orderNo,
        existingJob
          ?.salesOrderNo ||
          ""
      ).toUpperCase(),

    internalReference:
      normalizeText(
        body.internalReference,
        existingJob
          ?.internalReference ||
          ""
      ),

    customer:
      customerId || null,

    customerName,

    customerPO:
      normalizeText(
        body.customerPO,
        existingJob?.customerPO ||
          ""
      ),

    finishedGoodItem:
      finishedGood._id,

    finishedGoodCode:
      finishedGood.code,

    finishedGoodName:
      finishedGood.name,

    targetQty,

    unit:
      normalizeText(
        body.unit,
        existingJob?.unit ||
          finishedGood.unit ||
          "Pcs"
      ),

    jobDate:
      normalizeDate(
        body.jobDate,
        existingJob?.jobDate ||
          todayDate()
      ),

    dueDate:
      normalizeDate(
        body.dueDate ??
          body.deliveryDate,
        existingJob?.dueDate ||
          ""
      ),

    priority:
      normalizeText(
        body.priority,
        existingJob?.priority ||
          "Normal"
      ),

    paperType:
      normalizeText(
        body.paperType,
        existingJob?.paperType ||
          ""
      ),

    gsm:
      normalizeNumber(
        body.gsm,
        existingJob?.gsm || 0
      ),

    sheetSize:
      normalizeText(
        body.sheetSize,
        existingJob?.sheetSize ||
          ""
      ),

    finishedSize:
      normalizeText(
        body.finishedSize,
        existingJob
          ?.finishedSize ||
          ""
      ),

    totalSheets:
      normalizeNumber(
        body.totalSheets,
        existingJob
          ?.totalSheets ||
          0
      ),

    noOfColors:
      normalizeText(
        body.noOfColors,
        existingJob
          ?.noOfColors ||
          ""
      ),

    dieNo:
      normalizeText(
        body.dieNo,
        existingJob?.dieNo ||
          ""
      ),

    materialRequirements,

    instructions:
      normalizeText(
        body.instructions,
        existingJob
          ?.instructions ||
          ""
      ),

    remarks:
      normalizeText(
        body.remarks,
        existingJob?.remarks ||
          ""
      ),
  };
};

const populateJob = (
  query
) => {
  return query
    .populate(
      "finishedGoodItem",
      "code name itemType unit category brand status"
    )
    .populate(
      "materialRequirements.item",
      "code name itemType unit category brand status"
    )
    .populate(
      "customer",
      "customerName name phone email address city status"
    )
    .populate(
      "salesOrder",
      "orderNo salesOrderNo customerName orderDate deliveryDate status"
    );
};

router.get(
  "/next-no",
  async (req, res) => {
    try {
      const jobNo =
        await peekNextJobNo();

      return res
        .status(200)
        .json({
          success: true,
          jobNo,
          code: jobNo,
        });
    } catch (error) {
      return res
        .status(500)
        .json({
          success: false,

          message:
            "Unable to generate the next production job number",

          error:
            error.message,
        });
    }
  }
);

router.get(
  "/next-code",
  async (req, res) => {
    try {
      const jobNo =
        await peekNextJobNo();

      return res
        .status(200)
        .json({
          success: true,
          jobNo,
          code: jobNo,
        });
    } catch (error) {
      return res
        .status(500)
        .json({
          success: false,

          message:
            "Unable to generate the next production job number",

          error:
            error.message,
        });
    }
  }
);

router.get(
  "/all",
  async (req, res) => {
    try {
      const {
        search = "",
        status = "",
        priority = "",
        sourceType = "",
        customer = "",
        finishedGoodItem = "",
        dateFrom = "",
        dateTo = "",
      } = req.query;

      const query = {};

      if (
        status &&
        status !== "All"
      ) {
        query.status = status;
      }

      if (
        priority &&
        priority !== "All"
      ) {
        query.priority =
          priority;
      }

      if (
        sourceType &&
        sourceType !== "All"
      ) {
        query.sourceType =
          sourceType;
      }

      if (customer) {
        if (
          !isValidObjectId(
            customer
          )
        ) {
          return res
            .status(400)
            .json({
              success: false,

              message:
                "Invalid customer ID",
            });
        }

        query.customer =
          customer;
      }

      if (
        finishedGoodItem
      ) {
        if (
          !isValidObjectId(
            finishedGoodItem
          )
        ) {
          return res
            .status(400)
            .json({
              success: false,

              message:
                "Invalid finished good item ID",
            });
        }

        query.finishedGoodItem =
          finishedGoodItem;
      }

      if (
        dateFrom ||
        dateTo
      ) {
        query.jobDate = {};

        if (dateFrom) {
          query.jobDate.$gte =
            dateFrom;
        }

        if (dateTo) {
          query.jobDate.$lte =
            dateTo;
        }
      }

      if (search) {
        query.$or = [
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
            customerName: {
              $regex: search,
              $options: "i",
            },
          },
          {
            customerPO: {
              $regex: search,
              $options: "i",
            },
          },
          {
            salesOrderNo: {
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
        ];
      }

      const jobs =
        await populateJob(
          ProductionItem.find(
            query
          ).sort({
            jobDate: -1,
            createdAt: -1,
          })
        );

      return res
        .status(200)
        .json(jobs);
    } catch (error) {
      console.error(
        "Production Jobs Load Error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Unable to load production jobs",

          error:
            error.message,
        });
    }
  }
);

router.get(
  "/:id",
  async (req, res) => {
    try {
      if (
        !isValidObjectId(
          req.params.id
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Invalid production job ID",
          });
      }

      const job =
        await populateJob(
          ProductionItem.findById(
            req.params.id
          )
        );

      if (!job) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Production job not found",
          });
      }

      return res
        .status(200)
        .json({
          success: true,
          data: job,
        });
    } catch (error) {
      return res
        .status(500)
        .json({
          success: false,

          message:
            "Unable to load the production job",

          error:
            error.message,
        });
    }
  }
);

router.post(
  "/add",
  async (req, res) => {
    try {
      const payload =
        await buildJobPayload(
          req.body
        );

      const jobNo =
        await getNextJobNo();

      const job =
        await ProductionItem.create({
          ...payload,
          jobNo,
          status: "Draft",
        });

      const populatedJob =
        await populateJob(
          ProductionItem.findById(
            job._id
          )
        );

      return res
        .status(201)
        .json({
          success: true,

          message:
            "Production job created successfully",

          data: populatedJob,
        });
    } catch (error) {
      console.error(
        "Production Job Add Error:",
        error
      );

      if (
        error.code === 11000
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "This production job number already exists",
          });
      }

      return res
        .status(400)
        .json({
          success: false,

          message:
            error.message ||
            "Unable to create the production job",
        });
    }
  }
);

router.put(
  "/update/:id",
  async (req, res) => {
    try {
      if (
        !isValidObjectId(
          req.params.id
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Invalid production job ID",
          });
      }

      const existingJob =
        await ProductionItem.findById(
          req.params.id
        );

      if (!existingJob) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Production job not found",
          });
      }

      if (
        ![
          "Draft",
          "Approved",
        ].includes(
          existingJob.status
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Only Draft or Approved production jobs can be edited",
          });
      }

      if (
        existingJob
          .materialIssuePosted
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "A production job cannot be edited after material has been issued",
          });
      }

      const payload =
        await buildJobPayload(
          req.body,
          existingJob
        );

      const updatedJob =
        await ProductionItem
          .findByIdAndUpdate(
            existingJob._id,
            {
              ...payload,

              jobNo:
                existingJob.jobNo,
            },
            {
              new: true,
              runValidators:
                true,
            }
          );

      const populatedJob =
        await populateJob(
          ProductionItem.findById(
            updatedJob._id
          )
        );

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Production job updated successfully",

          data: populatedJob,
        });
    } catch (error) {
      console.error(
        "Production Job Update Error:",
        error
      );

      if (
        error.code === 11000
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "This production job number already exists",
          });
      }

      return res
        .status(400)
        .json({
          success: false,

          message:
            error.message ||
            "Unable to update the production job",
        });
    }
  }
);

router.patch(
  "/status/:id",
  async (req, res) => {
    try {
      if (
        !isValidObjectId(
          req.params.id
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Invalid production job ID",
          });
      }

      const job =
        await ProductionItem.findById(
          req.params.id
        );

      if (!job) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Production job not found",
          });
      }

      const requestedStatus =
        normalizeText(
          req.body.status
        );

      const allowedStatuses =
        STATUS_TRANSITIONS[
          job.status
        ] || [];

      if (
        !allowedStatuses.includes(
          requestedStatus
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              `Status cannot be changed from ${job.status} to ${requestedStatus}`,
          });
      }

      if (
        requestedStatus ===
          "Approved" &&
        job.materialRequirements
          .length === 0
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Add at least one material requirement before approving the job",
          });
      }

      if (
        requestedStatus ===
          "Material Issued" &&
        !job.materialRequirements.some(
          (row) =>
            Number(
              row.issuedQty || 0
            ) > 0
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Material must be issued before this status can be selected",
          });
      }

      if (
        requestedStatus ===
          "Quality Check" &&
        Number(
          job.printedQty || 0
        ) <= 0
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Printed quantity is required before quality check",
          });
      }

      if (
        requestedStatus ===
          "Completed" &&
        !job.productionOutputPosted
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Production output must be posted before completing the job",
          });
      }

      if (
        requestedStatus ===
          "Cancelled" &&
        (
          job.materialIssuePosted ||
          job.productionOutputPosted
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "This job has stock movements and must be reversed before cancellation",
          });
      }

      job.status =
        requestedStatus;

      await job.save();

      const populatedJob =
        await populateJob(
          ProductionItem.findById(
            job._id
          )
        );

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Production job status updated successfully",

          data: populatedJob,
        });
    } catch (error) {
      console.error(
        "Production Job Status Error:",
        error
      );

      return res
        .status(400)
        .json({
          success: false,

          message:
            error.message ||
            "Unable to update production job status",
        });
    }
  }
);

router.delete(
  "/delete/:id",
  async (req, res) => {
    try {
      if (
        !isValidObjectId(
          req.params.id
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Invalid production job ID",
          });
      }

      const job =
        await ProductionItem.findById(
          req.params.id
        );

      if (!job) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Production job not found",
          });
      }

      if (
        ![
          "Draft",
          "Cancelled",
        ].includes(
          job.status
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Only Draft or unused Cancelled production jobs can be deleted",
          });
      }

      const stockMovementExists =
        await StockLedger.exists({
          referenceId:
            job._id,

          $or: [
            {
              referenceModel:
                "ProductionItem",
            },
            {
              sourceModule: {
                $regex:
                  "Production",

                $options: "i",
              },
            },
          ],
        });

      if (
        stockMovementExists ||
        job.materialIssuePosted ||
        job.productionOutputPosted
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "This production job has stock history and cannot be deleted",
          });
      }

      await ProductionItem
        .findByIdAndDelete(
          job._id
        );

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Production job deleted successfully",
        });
    } catch (error) {
      console.error(
        "Production Job Delete Error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            error.message ||
            "Unable to delete the production job",
        });
    }
  }
);

module.exports = router;