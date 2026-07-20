const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

const Counter = require(
  "../models/Counter"
);

const Item = require(
  "../models/Item"
);

const MaterialIssue = require(
  "../models/MaterialIssue"
);

const ProductionItem = require(
  "../models/ProductionItem"
);

const StockLedger = require(
  "../models/StockLedger"
);

const Warehouse = require(
  "../models/Warehouse"
);

const {
  RAW_MATERIAL_GODOWN,
  ensureDefaultWarehouses,
  getItemStock,
  postStockMovement,
} = require("../utils/stockService");

const ALLOWED_JOB_STATUSES = [
  "Approved",
  "Material Issued",
];

const ALLOWED_ITEM_TYPES = [
  "Raw Material",
  "Packing Material",
  "Consumable",
];

const todayDate = () =>
  new Date()
    .toISOString()
    .slice(0, 10);

const num = (value) =>
  Number.isFinite(Number(value))
    ? Number(value)
    : 0;

const text = (
  value,
  fallback = ""
) =>
  String(value || "").trim() ||
  fallback;

const idOf = (value) => {
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

const validId = (value) =>
  mongoose.isValidObjectId(
    value
  );

const populateIssue = (
  query
) =>
  query
    .populate(
      "productionJob",
      "jobNo jobName status customerName finishedGoodCode finishedGoodName targetQty unit materialIssuePosted"
    )
    .populate(
      "items.item",
      "code name itemType unit purchasePrice status stockManaged"
    )
    .populate(
      "finishedGoodItem",
      "code name itemType unit status"
    )
    .populate(
      "warehouseId",
      "code name warehouseType status"
    );

const getRawMaterialWarehouse =
  async () => {
    await ensureDefaultWarehouses();

    const warehouse =
      await Warehouse.findOne({
        name:
          RAW_MATERIAL_GODOWN,
      });

    if (!warehouse) {
      throw new Error(
        "Raw Material Godown not found"
      );
    }

    if (
      warehouse.status ===
      "Inactive"
    ) {
      throw new Error(
        "Raw Material Godown is inactive"
      );
    }

    return warehouse;
  };

const getNextIssueNo =
  async () => {
    for (
      let attempt = 0;
      attempt < 10;
      attempt += 1
    ) {
      const counter =
        await Counter.findOneAndUpdate(
          {
            name:
              "materialIssueNo",
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

      const issueNo = `MI-${String(
        counter.seq
      ).padStart(4, "0")}`;

      const exists =
        await MaterialIssue.exists(
          {
            issueNo,
          }
        );

      if (!exists) {
        return issueNo;
      }
    }

    throw new Error(
      "Unable to generate a unique material issue number"
    );
  };

const peekNextIssueNo =
  async () => {
    const counter =
      await Counter.findOne({
        name:
          "materialIssueNo",
      });

    const next = counter
      ? num(counter.seq) + 1
      : 1;

    return `MI-${String(
      next
    ).padStart(4, "0")}`;
  };

const prepareIssuePayload =
  async (body) => {
    const jobId = idOf(
      body.productionJob
    );

    if (!validId(jobId)) {
      throw new Error(
        "A valid production job is required"
      );
    }

    const job =
      await ProductionItem.findById(
        jobId
      );

    if (!job) {
      throw new Error(
        "Production job not found"
      );
    }

    if (
      !ALLOWED_JOB_STATUSES.includes(
        job.status
      )
    ) {
      throw new Error(
        `Material can only be issued against an Approved or Material Issued job. Current status is ${job.status}.`
      );
    }

    const incomingRows =
      Array.isArray(body.items)
        ? body.items.filter(
            (row) =>
              num(row.issueQty) >
              0
          )
        : [];

    if (
      !incomingRows.length
    ) {
      throw new Error(
        "Enter an issue quantity for at least one material"
      );
    }

    const requirementMap =
      new Map(
        (
          job.materialRequirements ||
          []
        ).map((row) => [
          String(row._id),
          row,
        ])
      );

    const lineIds = new Set();
    const itemIds = new Set();
    const cleanItems = [];

    for (
      const incoming of
      incomingRows
    ) {
      const lineId = idOf(
        incoming.materialRequirementId ||
          incoming.requirementId
      );

      if (!validId(lineId)) {
        throw new Error(
          "A valid production material line is required"
        );
      }

      if (
        lineIds.has(lineId)
      ) {
        throw new Error(
          "The same material line cannot be issued twice"
        );
      }

      lineIds.add(lineId);

      const requirement =
        requirementMap.get(
          lineId
        );

      if (!requirement) {
        throw new Error(
          "A selected material is not part of this production job"
        );
      }

      const itemId = idOf(
        requirement.item
      );

      if (!validId(itemId)) {
        throw new Error(
          `Material item link is missing for ${requirement.itemName}`
        );
      }

      if (
        itemIds.has(itemId)
      ) {
        throw new Error(
          "The same material item cannot be issued more than once in one document"
        );
      }

      itemIds.add(itemId);

      const item =
        await Item.findById(
          itemId
        );

      if (!item) {
        throw new Error(
          `Material item not found: ${requirement.itemName}`
        );
      }

      if (
        item.status ===
        "Inactive"
      ) {
        throw new Error(
          `Material item ${item.name} is inactive`
        );
      }

      if (
        item.stockManaged ===
          false ||
        !ALLOWED_ITEM_TYPES.includes(
          item.itemType
        )
      ) {
        throw new Error(
          `Item ${item.name} cannot be issued to production`
        );
      }

      const requiredQty =
        num(
          requirement.requiredQty
        );

      const previousIssuedQty =
        num(
          requirement.issuedQty
        );

      const pendingQty =
        Math.max(
          requiredQty -
            previousIssuedQty,
          0
        );

      const issueQty = num(
        incoming.issueQty
      );

      if (
        pendingQty <= 0
      ) {
        throw new Error(
          `${item.name} has already been issued in full`
        );
      }

      if (
        issueQty >
        pendingQty
      ) {
        throw new Error(
          `Issue quantity for ${item.name} cannot exceed pending quantity ${pendingQty} ${requirement.unit}`
        );
      }

      cleanItems.push({
        materialRequirementId:
          requirement._id,

        item: item._id,

        itemCode:
          item.code,

        itemName:
          item.name,

        requiredQty,

        previousIssuedQty,

        issueQty,

        pendingAfterIssue:
          Math.max(
            pendingQty -
              issueQty,
            0
          ),

        unit:
          requirement.unit ||
          item.unit ||
          "Pcs",

        rate: num(
          requirement.rate ||
            item.purchasePrice
        ),

        remarks: text(
          incoming.remarks
        ),
      });
    }

    const warehouse =
      await getRawMaterialWarehouse();

    return {
      job,
      warehouse,

      issueDate: text(
        body.issueDate,
        todayDate()
      ),

      issuedBy: text(
        body.issuedBy
      ),

      receivedBy: text(
        body.receivedBy
      ),

      remarks: text(
        body.remarks
      ),

      items: cleanItems,
    };
  };

const validateAvailableStock =
  async (issue) => {
    for (
      const row of
      issue.items || []
    ) {
      const available =
        await getItemStock(
          row.item,
          issue.warehouseId ||
            issue.warehouse
        );

      if (
        available <
        num(row.issueQty)
      ) {
        throw new Error(
          `Insufficient stock for ${row.itemName}. Available ${available} ${row.unit}, requested ${row.issueQty} ${row.unit}.`
        );
      }
    }
  };

const deleteOriginalIssueEntries =
  async (issueId) => {
    await StockLedger.deleteMany(
      {
        sourceModule:
          "Material Issue",

        referenceModel:
          "MaterialIssue",

        referenceId:
          issueId,

        movementType:
          "Production Issue",

        isReversal: {
          $ne: true,
        },
      }
    );
  };

const applyIssueToJob =
  async (
    issue,
    direction = 1
  ) => {
    const job =
      await ProductionItem.findById(
        issue.productionJob
      );

    if (!job) {
      throw new Error(
        "Production job not found while updating material quantities"
      );
    }

    const issueMap =
      new Map(
        (
          issue.items || []
        ).map((row) => [
          String(
            row.materialRequirementId
          ),

          num(row.issueQty),
        ])
      );

    job.materialRequirements.forEach(
      (row) => {
        const quantity =
          issueMap.get(
            String(row._id)
          );

        if (quantity) {
          row.issuedQty =
            Math.max(
              num(row.issuedQty) +
                direction *
                  quantity,
              0
            );
        }
      }
    );

    if (direction > 0) {
      job.materialIssuePosted =
        true;

      job.status =
        "Material Issued";
    } else {
      const otherPostedIssue =
        await MaterialIssue.exists(
          {
            productionJob:
              job._id,

            _id: {
              $ne: issue._id,
            },

            status: "Posted",

            stockPosted: true,
          }
        );

      const stillIssued =
        job.materialRequirements.some(
          (row) =>
            num(
              row.issuedQty
            ) > 0
        );

      job.materialIssuePosted =
        Boolean(
          otherPostedIssue ||
            stillIssued
        );

      job.status =
        job.materialIssuePosted
          ? "Material Issued"
          : "Approved";
    }

    await job.save();
  };

const postIssueStock =
  async (issue) => {
    if (
      issue.status ===
      "Cancelled"
    ) {
      throw new Error(
        "Cancelled material issue cannot be posted"
      );
    }

    if (
      issue.status ===
        "Posted" ||
      issue.stockPosted
    ) {
      throw new Error(
        "Material issue stock has already been posted"
      );
    }

    await validateAvailableStock(
      issue
    );

    let jobUpdated = false;

    try {
      for (
        let index = 0;
        index <
        issue.items.length;
        index += 1
      ) {
        const row =
          issue.items[index];

        await postStockMovement({
          item: row.item,

          warehouse:
            issue.warehouseId ||
            issue.warehouse,

          date:
            issue.issueDate,

          movementType:
            "Production Issue",

          sourceModule:
            "Material Issue",

          referenceModel:
            "MaterialIssue",

          referenceId:
            issue._id,

          referenceLineId:
            String(
              row._id ||
                row.materialRequirementId ||
                index
            ),

          referenceNo:
            issue.issueNo,

          qtyIn: 0,

          qtyOut: num(
            row.issueQty
          ),

          rate: num(row.rate),

          remarks:
            `Material issue ${issue.issueNo} for production job ${issue.jobNo}`,

          allowNegativeStock:
            false,

          allowDuplicate:
            false,
        });
      }

      await applyIssueToJob(
        issue,
        1
      );

      jobUpdated = true;

      issue.status = "Posted";
      issue.stockPosted = true;

      issue.stockPostedAt =
        new Date();

      await issue.save();

      return issue;
    } catch (error) {
      await deleteOriginalIssueEntries(
        issue._id
      );

      if (jobUpdated) {
        try {
          await applyIssueToJob(
            issue,
            -1
          );
        } catch (
          rollbackError
        ) {
          console.error(
            "Material issue job rollback failed:",
            rollbackError.message
          );
        }
      }

      throw error;
    }
  };

const reverseIssueStock =
  async (
    issue,
    cancelReason = ""
  ) => {
    if (
      !issue.stockPosted ||
      issue.status !== "Posted"
    ) {
      throw new Error(
        "Only a posted material issue can be cancelled"
      );
    }

    const job =
      await ProductionItem.findById(
        issue.productionJob
      );

    if (!job) {
      throw new Error(
        "Production job not found"
      );
    }

    if (
      ![
        "Approved",
        "Material Issued",
      ].includes(job.status)
    ) {
      throw new Error(
        `Material issue cannot be cancelled after printing has started. Current job status is ${job.status}.`
      );
    }

    const originalEntries =
      await StockLedger.find({
        sourceModule:
          "Material Issue",

        referenceModel:
          "MaterialIssue",

        referenceId:
          issue._id,

        movementType:
          "Production Issue",

        isReversal: {
          $ne: true,
        },
      }).sort({
        createdAt: 1,
      });

    if (
      !originalEntries.length
    ) {
      throw new Error(
        "Original material issue stock entries were not found"
      );
    }

    for (
      const original of
      originalEntries
    ) {
      const alreadyReversed =
        await StockLedger.exists(
          {
            reversalOf:
              original._id,

            isReversal: true,
          }
        );

      if (alreadyReversed) {
        continue;
      }

      await postStockMovement({
        item: original.item,

        warehouse:
          original.warehouseId ||
          original.warehouse,

        date: todayDate(),

        movementType:
          "Reversal In",

        sourceModule:
          "Material Issue Cancellation",

        referenceModel:
          "MaterialIssue",

        referenceId:
          issue._id,

        referenceLineId:
          `REV-${original._id}`,

        referenceNo:
          issue.issueNo,

        qtyIn: num(
          original.qtyOut
        ),

        qtyOut: 0,

        rate: num(
          original.rate
        ),

        remarks:
          `Cancellation reversal of material issue ${issue.issueNo}`,

        allowNegativeStock:
          false,

        allowInactiveItem:
          true,

        allowDuplicate:
          false,

        isReversal: true,

        reversalOf:
          original._id,
      });
    }

    await applyIssueToJob(
      issue,
      -1
    );

    issue.status =
      "Cancelled";

    issue.stockPosted =
      false;

    issue.reversalPosted =
      true;

    issue.cancelledAt =
      new Date();

    issue.cancelReason =
      text(cancelReason);

    await issue.save();
  };

router.get(
  "/next-no",
  async (req, res) => {
    try {
      return res.json({
        success: true,

        issueNo:
          await peekNextIssueNo(),
      });
    } catch (error) {
      return res
        .status(500)
        .json({
          success: false,
          message:
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
        productionJob = "",
        dateFrom = "",
        dateTo = "",
      } = req.query;

      const query = {};

      if (
        status &&
        status !== "All"
      ) {
        query.status =
          status;
      }

      if (productionJob) {
        if (
          !validId(
            productionJob
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

        query.productionJob =
          productionJob;
      }

      if (
        dateFrom ||
        dateTo
      ) {
        query.issueDate = {};

        if (dateFrom) {
          query.issueDate.$gte =
            dateFrom;
        }

        if (dateTo) {
          query.issueDate.$lte =
            dateTo;
        }
      }

      if (search) {
        query.$or = [
          {
            issueNo: {
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
        ];
      }

      const issues =
        await populateIssue(
          MaterialIssue.find(
            query
          ).sort({
            issueDate: -1,
            createdAt: -1,
          })
        );

      return res.json(
        issues
      );
    } catch (error) {
      return res
        .status(500)
        .json({
          success: false,

          message:
            error.message,
        });
    }
  }
);

router.get(
  "/job/:jobId",
  async (req, res) => {
    try {
      if (
        !validId(
          req.params.jobId
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

      const issues =
        await populateIssue(
          MaterialIssue.find({
            productionJob:
              req.params.jobId,
          }).sort({
            issueDate: -1,
            createdAt: -1,
          })
        );

      return res.json(
        issues
      );
    } catch (error) {
      return res
        .status(500)
        .json({
          success: false,

          message:
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
        !validId(
          req.params.id
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Invalid material issue ID",
          });
      }

      const issue =
        await populateIssue(
          MaterialIssue.findById(
            req.params.id
          )
        );

      if (!issue) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Material issue not found",
          });
      }

      return res.json({
        success: true,
        data: issue,
      });
    } catch (error) {
      return res
        .status(500)
        .json({
          success: false,

          message:
            error.message,
        });
    }
  }
);

router.post(
  "/add",
  async (req, res) => {
    try {
      const prepared =
        await prepareIssuePayload(
          req.body
        );

      const issueNo =
        req.body.issueNo
          ? text(
              req.body.issueNo
            ).toUpperCase()
          : await getNextIssueNo();

      const issue =
        await MaterialIssue.create({
          issueNo,

          productionJob:
            prepared.job._id,

          jobNo:
            prepared.job.jobNo,

          jobName:
            prepared.job.jobName,

          finishedGoodItem:
            prepared.job
              .finishedGoodItem,

          finishedGoodCode:
            prepared.job
              .finishedGoodCode,

          finishedGoodName:
            prepared.job
              .finishedGoodName,

          issueDate:
            prepared.issueDate,

          warehouseId:
            prepared.warehouse._id,

          warehouse:
            prepared.warehouse.name,

          items:
            prepared.items,

          issuedBy:
            prepared.issuedBy,

          receivedBy:
            prepared.receivedBy,

          remarks:
            prepared.remarks,

          status: "Draft",
        });

      const data =
        await populateIssue(
          MaterialIssue.findById(
            issue._id
          )
        );

      return res
        .status(201)
        .json({
          success: true,

          message:
            "Material issue draft created",

          data,
        });
    } catch (error) {
      const message =
        error.code === 11000
          ? "This material issue number already exists"
          : error.message;

      return res
        .status(400)
        .json({
          success: false,
          message,
        });
    }
  }
);

router.post(
  "/create-and-post",
  async (req, res) => {
    let issue = null;

    try {
      const prepared =
        await prepareIssuePayload(
          req.body
        );

      const issueNo =
        req.body.issueNo
          ? text(
              req.body.issueNo
            ).toUpperCase()
          : await getNextIssueNo();

      issue =
        await MaterialIssue.create({
          issueNo,

          productionJob:
            prepared.job._id,

          jobNo:
            prepared.job.jobNo,

          jobName:
            prepared.job.jobName,

          finishedGoodItem:
            prepared.job
              .finishedGoodItem,

          finishedGoodCode:
            prepared.job
              .finishedGoodCode,

          finishedGoodName:
            prepared.job
              .finishedGoodName,

          issueDate:
            prepared.issueDate,

          warehouseId:
            prepared.warehouse._id,

          warehouse:
            prepared.warehouse.name,

          items:
            prepared.items,

          issuedBy:
            prepared.issuedBy,

          receivedBy:
            prepared.receivedBy,

          remarks:
            prepared.remarks,

          status: "Draft",
        });

      await postIssueStock(
        issue
      );

      const data =
        await populateIssue(
          MaterialIssue.findById(
            issue._id
          )
        );

      return res
        .status(201)
        .json({
          success: true,

          message:
            "Material issued and stock posted successfully",

          data,
        });
    } catch (error) {
      if (
        issue &&
        !issue.stockPosted
      ) {
        await deleteOriginalIssueEntries(
          issue._id
        );
      }

      const message =
        error.code === 11000
          ? "This material issue number already exists"
          : error.message;

      return res
        .status(400)
        .json({
          success: false,

          message,

          draftIssueId:
            issue?._id ||
            null,
        });
    }
  }
);

router.post(
  "/post/:id",
  async (req, res) => {
    try {
      if (
        !validId(
          req.params.id
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Invalid material issue ID",
          });
      }

      const issue =
        await MaterialIssue.findById(
          req.params.id
        );

      if (!issue) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Material issue not found",
          });
      }

      await postIssueStock(
        issue
      );

      const data =
        await populateIssue(
          MaterialIssue.findById(
            issue._id
          )
        );

      return res.json({
        success: true,

        message:
          "Material issue stock posted",

        data,
      });
    } catch (error) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            error.message,
        });
    }
  }
);

router.post(
  "/cancel/:id",
  async (req, res) => {
    try {
      if (
        !validId(
          req.params.id
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Invalid material issue ID",
          });
      }

      const issue =
        await MaterialIssue.findById(
          req.params.id
        );

      if (!issue) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Material issue not found",
          });
      }

      await reverseIssueStock(
        issue,
        req.body.cancelReason
      );

      const data =
        await populateIssue(
          MaterialIssue.findById(
            issue._id
          )
        );

      return res.json({
        success: true,

        message:
          "Material issue cancelled and stock reversed",

        data,
      });
    } catch (error) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            error.message,
        });
    }
  }
);

router.delete(
  "/delete/:id",
  async (req, res) => {
    try {
      if (
        !validId(
          req.params.id
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Invalid material issue ID",
          });
      }

      const issue =
        await MaterialIssue.findById(
          req.params.id
        );

      if (!issue) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Material issue not found",
          });
      }

      if (
        issue.status !==
          "Draft" ||
        issue.stockPosted
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Only an unposted Draft material issue can be deleted",
          });
      }

      await MaterialIssue.findByIdAndDelete(
        issue._id
      );

      return res.json({
        success: true,

        message:
          "Material issue draft deleted",
      });
    } catch (error) {
      return res
        .status(500)
        .json({
          success: false,

          message:
            error.message,
        });
    }
  }
);

module.exports = router;