const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

const Counter = require("../models/Counter");
const Item = require("../models/Item");
const Printing = require("../models/Printing");
const ProductionItem = require("../models/ProductionItem");
const ReadyProduct = require("../models/ReadyProducts");
const StockLedger = require("../models/StockLedger");
const Warehouse = require("../models/Warehouse");

const {
  FINISHED_GOODS_GODOWN,
  ensureDefaultWarehouses,
  postStockMovement,
} = require("../utils/stockService");

const FINISHED_GOODS_WAREHOUSE =
  FINISHED_GOODS_GODOWN ||
  "Finished Goods Godown";

const todayDate = () =>
  new Date().toISOString().slice(0, 10);

const numberValue = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
};

const textValue = (value, fallback = "") => {
  const valueText = String(value || "").trim();

  return valueText || fallback;
};

const idOf = (value) => {
  if (!value) {
    return "";
  }

  if (typeof value === "object") {
    return String(
      value._id ||
      value.id ||
      ""
    );
  }

  return String(value);
};

const isValidId = (value) =>
  mongoose.isValidObjectId(value);

const duplicateMessage = (
  error,
  fallback
) => {
  if (error.code !== 11000) {
    return (
      error.message ||
      fallback
    );
  }

  const field =
    Object.keys(
      error.keyPattern || {}
    )[0] || "value";

  const value =
    error.keyValue?.[field];

  return `Duplicate ${field}: ${String(
    value
  )}`;
};

const populateEntry = (query) =>
  query
    .populate(
      "productionJob",
      "jobNo jobName customerName targetQty unit status goodQty productionOutputQty productionOutputPosted finishedGoodCode finishedGoodName"
    )
    .populate(
      "printing",
      "printingNo entryDate plannedQty printedQty goodQty rejectedQty wastageQty unit status qcStatus machine operator"
    )
    .populate(
      "finishedGoodItem",
      "code name itemType unit purchasePrice salePrice status stockManaged"
    )
    .populate(
      "warehouseId",
      "code name warehouseType status"
    );

const getFinishedGoodsWarehouse =
  async () => {
    await ensureDefaultWarehouses();

    const warehouse =
      await Warehouse.findOne({
        name:
          FINISHED_GOODS_WAREHOUSE,
      });

    if (!warehouse) {
      throw new Error(
        "Finished Goods Godown not found"
      );
    }

    if (
      warehouse.status ===
      "Inactive"
    ) {
      throw new Error(
        "Finished Goods Godown is inactive"
      );
    }

    return warehouse;
  };

const getHighestReadySequence =
  async () => {
    const result =
      await ReadyProduct.aggregate([
        {
          $match: {
            readyNo:
              /^RP-\d+$/i,
          },
        },
        {
          $project: {
            sequence: {
              $toInt: {
                $arrayElemAt: [
                  {
                    $split: [
                      "$readyNo",
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

    return numberValue(
      result[0]?.sequence
    );
  };

const syncReadyCounter =
  async () => {
    const highestSequence =
      await getHighestReadySequence();

    const counter =
      await Counter.findOneAndUpdate(
        {
          name:
            "readyProductNo",
        },
        {
          $max: {
            seq:
              highestSequence,
          },
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert:
            true,
        }
      );

    return numberValue(
      counter.seq
    );
  };

const getNextReadyNo =
  async () => {
    await syncReadyCounter();

    for (
      let attempt = 0;
      attempt < 20;
      attempt += 1
    ) {
      const counter =
        await Counter.findOneAndUpdate(
          {
            name:
              "readyProductNo",
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

      const readyNo = `RP-${String(
        counter.seq
      ).padStart(4, "0")}`;

      const exists =
        await ReadyProduct.exists({
          readyNo,
        });

      if (!exists) {
        return readyNo;
      }
    }

    throw new Error(
      "Unable to generate a unique ready product number"
    );
  };

const peekNextReadyNo =
  async () => {
    const currentSequence =
      await syncReadyCounter();

    return `RP-${String(
      currentSequence + 1
    ).padStart(4, "0")}`;
  };

const getJobOutputQty =
  async (jobId) => {
    const result =
      await ReadyProduct.aggregate([
        {
          $match: {
            productionJob:
              new mongoose.Types.ObjectId(
                jobId
              ),

            status: "Posted",

            stockPosted: true,
          },
        },
        {
          $group: {
            _id: null,

            total: {
              $sum:
                "$passedQty",
            },
          },
        },
      ]);

    return numberValue(
      result[0]?.total
    );
  };

const syncProductionJob =
  async (jobId) => {
    const job =
      await ProductionItem.findById(
        jobId
      );

    if (!job) {
      throw new Error(
        "Production job not found while syncing output"
      );
    }

    const outputQty =
      await getJobOutputQty(
        job._id
      );

    job.productionOutputQty =
      outputQty;

    job.productionOutputPosted =
      outputQty > 0;

    if (
      outputQty >=
      numberValue(
        job.targetQty
      )
    ) {
      job.status =
        "Completed";
    } else if (
      numberValue(
        job.goodQty
      ) > 0
    ) {
      job.status =
        "Quality Check";
    } else if (
      job.materialIssuePosted
    ) {
      job.status =
        "Material Issued";
    }

    await job.save();
  };

const preparePayload =
  async (
    body,
    existingEntry = null
  ) => {
    const printingId =
      idOf(
        existingEntry?.printing ||
        body.printing
      );

    if (
      !isValidId(
        printingId
      )
    ) {
      throw new Error(
        "A valid completed printing record is required"
      );
    }

    const printing =
      await Printing.findById(
        printingId
      );

    if (!printing) {
      throw new Error(
        "Printing record not found"
      );
    }

    if (
      printing.status !==
      "Completed"
    ) {
      throw new Error(
        "Only a Completed printing record can be selected"
      );
    }

    const existingActiveEntry =
      await ReadyProduct.exists({
        printing:
          printing._id,

        status: {
          $in: [
            "Draft",
            "Posted",
          ],
        },

        ...(existingEntry
          ? {
              _id: {
                $ne:
                  existingEntry._id,
              },
            }
          : {}),
      });

    if (
      existingActiveEntry
    ) {
      throw new Error(
        "This printing record already has a Draft or Posted ready product entry"
      );
    }

    const job =
      await ProductionItem.findById(
        printing.productionJob
      );

    if (!job) {
      throw new Error(
        "Production job not found"
      );
    }

    if (
      ![
        "Quality Check",
        "Completed",
      ].includes(
        job.status
      )
    ) {
      throw new Error(
        `Ready product entry cannot be created for a job with status ${job.status}`
      );
    }

    const finishedGood =
      await Item.findById(
        printing.finishedGoodItem
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
        "The linked item must be a stock-managed Finished Good"
      );
    }

    if (
      finishedGood.status ===
      "Inactive"
    ) {
      throw new Error(
        "The linked finished good item is inactive"
      );
    }

    const printingGoodQty =
      numberValue(
        printing.goodQty
      );

    const passedQty =
      numberValue(
        body.passedQty ??
        existingEntry?.passedQty
      );

    const rejectedQty =
      numberValue(
        body.rejectedQty ??
        existingEntry?.rejectedQty
      );

    const holdQty =
      numberValue(
        body.holdQty ??
        existingEntry?.holdQty
      );

    if (
      printingGoodQty <= 0
    ) {
      throw new Error(
        "Printing good quantity must be greater than zero"
      );
    }

    if (
      Math.abs(
        passedQty +
        rejectedQty +
        holdQty -
        printingGoodQty
      ) > 0.000001
    ) {
      throw new Error(
        "Passed, rejected and hold quantities must equal printing good quantity"
      );
    }

    const currentJobOutput =
      await getJobOutputQty(
        job._id
      );

    if (
      currentJobOutput +
      passedQty >
      numberValue(
        job.targetQty
      )
    ) {
      throw new Error(
        `Production output cannot exceed job target ${job.targetQty} ${job.unit}`
      );
    }

    const warehouse =
      await getFinishedGoodsWarehouse();

    return {
      payload: {
        productionJob:
          job._id,

        printing:
          printing._id,

        jobNo:
          job.jobNo,

        printingNo:
          printing.printingNo,

        customerName:
          job.customerName ||
          "",

        finishedGoodItem:
          finishedGood._id,

        finishedGoodCode:
          finishedGood.code,

        finishedGoodName:
          finishedGood.name,

        qcDate:
          textValue(
            body.qcDate,
            existingEntry?.qcDate ||
            todayDate()
          ),

        printingGoodQty,

        passedQty,

        rejectedQty,

        holdQty,

        unit:
          textValue(
            body.unit,
            existingEntry?.unit ||
            printing.unit ||
            job.unit ||
            "Pcs"
          ),

        warehouseId:
          warehouse._id,

        warehouse:
          warehouse.name,

        checkedBy:
          textValue(
            body.checkedBy,
            existingEntry?.checkedBy ||
            ""
          ),

        packedBy:
          textValue(
            body.packedBy,
            existingEntry?.packedBy ||
            ""
          ),

        packaging:
          textValue(
            body.packaging,
            existingEntry?.packaging ||
            ""
          ),

        rate:
          numberValue(
            body.rate ??
            existingEntry?.rate ??
            finishedGood.purchasePrice
          ),

        remarks:
          textValue(
            body.remarks,
            existingEntry?.remarks ||
            ""
          ),
      },
    };
  };

const deleteOutputLedger =
  async (entryId) => {
    await StockLedger.deleteMany({
      sourceModule:
        "Ready Product",

      referenceModel:
        "ReadyProduct",

      referenceId:
        entryId,

      movementType:
        "Production Output",

      isReversal: {
        $ne: true,
      },
    });
  };

const postOutput =
  async (entry) => {
    if (
      entry.status ===
      "Cancelled"
    ) {
      throw new Error(
        "Cancelled ready product entry cannot be posted"
      );
    }

    if (
      entry.status ===
      "Posted" ||
      entry.stockPosted
    ) {
      throw new Error(
        "Production output has already been posted"
      );
    }

    const prepared =
      await preparePayload(
        {
          printing:
            entry.printing,

          qcDate:
            entry.qcDate,

          passedQty:
            entry.passedQty,

          rejectedQty:
            entry.rejectedQty,

          holdQty:
            entry.holdQty,

          unit:
            entry.unit,

          checkedBy:
            entry.checkedBy,

          packedBy:
            entry.packedBy,

          packaging:
            entry.packaging,

          rate:
            entry.rate,

          remarks:
            entry.remarks,
        },

        entry
      );

    Object.assign(
      entry,
      prepared.payload
    );

    if (
      numberValue(
        entry.passedQty
      ) <= 0
    ) {
      throw new Error(
        "Passed quantity must be greater than zero before posting"
      );
    }

    let ledgerCreated =
      false;

    try {
      await postStockMovement({
        item:
          entry.finishedGoodItem,

        warehouse:
          entry.warehouseId ||
          entry.warehouse,

        date:
          entry.qcDate,

        movementType:
          "Production Output",

        sourceModule:
          "Ready Product",

        referenceModel:
          "ReadyProduct",

        referenceId:
          entry._id,

        referenceLineId:
          String(
            entry._id
          ),

        referenceNo:
          entry.readyNo,

        qtyIn:
          numberValue(
            entry.passedQty
          ),

        qtyOut: 0,

        rate:
          numberValue(
            entry.rate
          ),

        remarks:
          `Production output ${entry.readyNo} for job ${entry.jobNo}`,

        allowNegativeStock:
          false,

        allowDuplicate:
          false,
      });

      ledgerCreated =
        true;

      entry.status =
        "Posted";

      entry.stockPosted =
        true;

      entry.stockPostedAt =
        new Date();

      await entry.save();

      const printing =
        await Printing.findById(
          entry.printing
        );

      if (printing) {
        printing.qcStatus =
          entry.qcStatus;

        await printing.save();
      }

      await syncProductionJob(
        entry.productionJob
      );

      return entry;
    } catch (error) {
      if (ledgerCreated) {
        await deleteOutputLedger(
          entry._id
        );
      }

      entry.status =
        "Draft";

      entry.stockPosted =
        false;

      entry.stockPostedAt =
        null;

      try {
        await entry.save();
      } catch (
        rollbackError
      ) {
        console.error(
          "Ready product rollback failed:",
          rollbackError.message
        );
      }

      throw error;
    }
  };

const reverseOutput =
  async (
    entry,
    cancelReason = ""
  ) => {
    if (
      entry.status !==
      "Posted" ||
      !entry.stockPosted
    ) {
      throw new Error(
        "Only a Posted ready product entry can be cancelled"
      );
    }

    const originalEntries =
      await StockLedger.find({
        sourceModule:
          "Ready Product",

        referenceModel:
          "ReadyProduct",

        referenceId:
          entry._id,

        movementType:
          "Production Output",

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
        "Original production output stock entry was not found"
      );
    }

    for (
      const original of
      originalEntries
    ) {
      const alreadyReversed =
        await StockLedger.exists({
          reversalOf:
            original._id,

          isReversal:
            true,
        });

      if (
        alreadyReversed
      ) {
        continue;
      }

      await postStockMovement({
        item:
          original.item,

        warehouse:
          original.warehouseId ||
          original.warehouse,

        date:
          todayDate(),

        movementType:
          "Reversal Out",

        sourceModule:
          "Ready Product Cancellation",

        referenceModel:
          "ReadyProduct",

        referenceId:
          entry._id,

        referenceLineId:
          `REV-${original._id}`,

        referenceNo:
          entry.readyNo,

        qtyIn: 0,

        qtyOut:
          numberValue(
            original.qtyIn
          ),

        rate:
          numberValue(
            original.rate
          ),

        remarks:
          `Cancellation reversal of production output ${entry.readyNo}`,

        allowNegativeStock:
          false,

        allowInactiveItem:
          true,

        allowDuplicate:
          false,

        isReversal:
          true,

        reversalOf:
          original._id,
      });
    }

    entry.status =
      "Cancelled";

    entry.stockPosted =
      false;

    entry.reversalPosted =
      true;

    entry.cancelledAt =
      new Date();

    entry.cancelReason =
      textValue(
        cancelReason,
        "Production output cancelled"
      );

    await entry.save();

    const printing =
      await Printing.findById(
        entry.printing
      );

    if (printing) {
      printing.qcStatus =
        "Pending";

      await printing.save();
    }

    await syncProductionJob(
      entry.productionJob
    );
  };

router.get(
  "/next-no",
  async (req, res) => {
    try {
      return res.json({
        success: true,

        readyNo:
          await peekNextReadyNo(),
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
  "/eligible-printings",
  async (req, res) => {
    try {
      const activeEntries =
        await ReadyProduct.find({
          status: {
            $in: [
              "Draft",
              "Posted",
            ],
          },
        }).select(
          "printing"
        );

      const excludedPrintingIds =
        activeEntries.map(
          (entry) =>
            entry.printing
        );

      const printings =
        await Printing.find({
          status:
            "Completed",

          goodQty: {
            $gt: 0,
          },

          _id: {
            $nin:
              excludedPrintingIds,
          },
        })
          .populate(
            "productionJob",
            "jobNo jobName customerName targetQty unit status productionOutputQty productionOutputPosted finishedGoodCode finishedGoodName"
          )
          .populate(
            "finishedGoodItem",
            "code name itemType unit status stockManaged purchasePrice"
          )
          .sort({
            entryDate: -1,
            createdAt: -1,
          });

      const eligible =
        printings.filter(
          (printing) =>
            printing.productionJob &&
            [
              "Quality Check",
              "Completed",
            ].includes(
              printing.productionJob.status
            )
        );

      return res.json(
        eligible
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
  "/all",
  async (req, res) => {
    try {
      const {
        search = "",
        status = "",
        qcStatus = "",
      } = req.query;

      const query = {};

      if (
        status &&
        status !== "All"
      ) {
        query.status =
          status;
      }

      if (
        qcStatus &&
        qcStatus !== "All"
      ) {
        query.qcStatus =
          qcStatus;
      }

      if (search) {
        query.$or = [
          {
            readyNo: {
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
            printingNo: {
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
            checkedBy: {
              $regex: search,
              $options: "i",
            },
          },
        ];
      }

      const entries =
        await populateEntry(
          ReadyProduct.find(
            query
          ).sort({
            qcDate: -1,
            createdAt: -1,
          })
        );

      return res.json(
        entries
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
        !isValidId(
          req.params.id
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Invalid ready product ID",
          });
      }

      const entry =
        await populateEntry(
          ReadyProduct.findById(
            req.params.id
          )
        );

      if (!entry) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Ready product entry not found",
          });
      }

      return res.json({
        success: true,
        data: entry,
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
        await preparePayload(
          req.body
        );

      const readyNo =
        await getNextReadyNo();

      const entry =
        await ReadyProduct.create({
          ...prepared.payload,

          readyNo,

          status: "Draft",

          stockPosted:
            false,
        });

      const data =
        await populateEntry(
          ReadyProduct.findById(
            entry._id
          )
        );

      return res
        .status(201)
        .json({
          success: true,

          message:
            "Ready product draft created successfully",

          data,
        });
    } catch (error) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            duplicateMessage(
              error,
              "Unable to create ready product draft"
            ),
        });
    }
  }
);

router.post(
  "/create-and-post",
  async (req, res) => {
    let entry = null;

    try {
      const prepared =
        await preparePayload(
          req.body
        );

      const readyNo =
        await getNextReadyNo();

      entry =
        await ReadyProduct.create({
          ...prepared.payload,

          readyNo,

          status: "Draft",

          stockPosted:
            false,
        });

      await postOutput(
        entry
      );

      const data =
        await populateEntry(
          ReadyProduct.findById(
            entry._id
          )
        );

      return res
        .status(201)
        .json({
          success: true,

          message:
            "Production output posted successfully",

          data,
        });
    } catch (error) {
      if (
        entry &&
        !entry.stockPosted
      ) {
        await deleteOutputLedger(
          entry._id
        );
      }

      return res
        .status(400)
        .json({
          success: false,

          message:
            duplicateMessage(
              error,
              "Unable to post production output"
            ),
        });
    }
  }
);

router.put(
  "/update/:id",
  async (req, res) => {
    try {
      if (
        !isValidId(
          req.params.id
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Invalid ready product ID",
          });
      }

      const entry =
        await ReadyProduct.findById(
          req.params.id
        );

      if (!entry) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Ready product entry not found",
          });
      }

      if (
        entry.status !==
        "Draft" ||
        entry.stockPosted
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Only an unposted Draft entry can be edited",
          });
      }

      const prepared =
        await preparePayload(
          req.body,
          entry
        );

      Object.assign(
        entry,
        prepared.payload
      );

      await entry.save();

      const data =
        await populateEntry(
          ReadyProduct.findById(
            entry._id
          )
        );

      return res.json({
        success: true,

        message:
          "Ready product draft updated successfully",

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
  "/post/:id",
  async (req, res) => {
    try {
      if (
        !isValidId(
          req.params.id
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Invalid ready product ID",
          });
      }

      const entry =
        await ReadyProduct.findById(
          req.params.id
        );

      if (!entry) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Ready product entry not found",
          });
      }

      await postOutput(
        entry
      );

      const data =
        await populateEntry(
          ReadyProduct.findById(
            entry._id
          )
        );

      return res.json({
        success: true,

        message:
          "Production output posted successfully",

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
        !isValidId(
          req.params.id
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Invalid ready product ID",
          });
      }

      const entry =
        await ReadyProduct.findById(
          req.params.id
        );

      if (!entry) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Ready product entry not found",
          });
      }

      await reverseOutput(
        entry,
        req.body.cancelReason
      );

      const data =
        await populateEntry(
          ReadyProduct.findById(
            entry._id
          )
        );

      return res.json({
        success: true,

        message:
          "Production output cancelled and stock reversed",

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
        !isValidId(
          req.params.id
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Invalid ready product ID",
          });
      }

      const entry =
        await ReadyProduct.findById(
          req.params.id
        );

      if (!entry) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Ready product entry not found",
          });
      }

      if (
        entry.status !==
        "Draft" ||
        entry.stockPosted
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Only an unposted Draft entry can be deleted",
          });
      }

      await ReadyProduct.findByIdAndDelete(
        entry._id
      );

      return res.json({
        success: true,

        message:
          "Ready product draft deleted successfully",
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