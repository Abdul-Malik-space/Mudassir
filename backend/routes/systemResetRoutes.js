const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

const Warehouse = require("../models/Warehouse");

const SYSTEM_WAREHOUSES = [
  {
    code: "WH-RM",
    name: "Raw Material Godown",
    warehouseType: "Raw Material",
    location: "",
    capacity: "",
    capacityPercent: 0,
    status: "Active",
    isSystem: true,
    notes:
      "System warehouse for raw materials, packing materials and consumables.",
  },

  {
    code: "WH-FG",
    name: "Finished Goods Godown",
    warehouseType: "Finished Goods",
    location: "",
    capacity: "",
    capacityPercent: 0,
    status: "Active",
    isSystem: true,
    notes:
      "System warehouse for completed finished products.",
  },
];

const TRANSACTION_COLLECTIONS = [
  "stockledgers",
  "grns",
  "purchaseorders",
  "purchases",
  "materialissues",
  "productionjobs",
  "productionitems",
  "printings",
  "laminations",
  "diecuttings",
  "pastings",
  "otherworks",
  "readyproducts",
  "salesorders",
  "deliverychallans",
  "invoices",
  "sales",
  "expenses",
  "payrolls",
  "payments",
  "journalentries",
  "generaljournals",
  "jobs",
];

const MASTER_COLLECTIONS = [
  "items",
  "products",
  "customers",
  "vendors",
  "traders",
  "leads",
  "deals",
  "categories",
  "brands",
  "units",
  "employees",
  "accounts",
];

const VALID_SCOPES = [
  "transactions",
  "all-business-data",
];

const CONFIRMATION_PHRASES = {
  transactions:
    "DELETE TRANSACTIONS",

  "all-business-data":
    "DELETE ALL MUDDASIR DATA",
};

const normalizeText = (
  value,
  fallback = ""
) => {
  const cleanedValue = String(
    value || ""
  ).trim();

  return cleanedValue || fallback;
};

const resetEnabled = () => {
  return String(
    process.env
      .RESET_DATA_ENABLED || ""
  )
    .trim()
    .toLowerCase() === "true";
};

const getExistingCollectionNames =
  async () => {
    const collections =
      await mongoose.connection.db
        .listCollections(
          {},
          {
            nameOnly: true,
          }
        )
        .toArray();

    return new Set(
      collections.map(
        (collection) =>
          collection.name
      )
    );
  };

const authorizeReset = (
  req,
  res,
  next
) => {
  if (!resetEnabled()) {
    return res.status(403).json({
      success: false,

      message:
        "Data reset disabled hai. Backend .env mein RESET_DATA_ENABLED=true karein.",
    });
  }

  const expectedKey =
    normalizeText(
      process.env.DATA_RESET_KEY
    );

  const suppliedKey =
    normalizeText(
      req.body?.resetKey
    );

  if (!expectedKey) {
    return res.status(500).json({
      success: false,

      message:
        "DATA_RESET_KEY environment variable missing hai.",
    });
  }

  if (
    !suppliedKey ||
    suppliedKey !== expectedKey
  ) {
    return res.status(401).json({
      success: false,
      message:
        "Invalid reset key",
    });
  }

  next();
};

const validateScope = (scope) => {
  if (
    !VALID_SCOPES.includes(scope)
  ) {
    throw new Error(
      `Invalid reset scope. Allowed scopes: ${VALID_SCOPES.join(
        ", "
      )}`
    );
  }
};

const collectionsForScope = (
  scope
) => {
  if (
    scope ===
    "all-business-data"
  ) {
    return Array.from(
      new Set([
        ...TRANSACTION_COLLECTIONS,
        ...MASTER_COLLECTIONS,
        "counters",
      ])
    );
  }

  return Array.from(
    new Set([
      ...TRANSACTION_COLLECTIONS,
      "counters",
    ])
  );
};

const ensureSystemWarehouses =
  async () => {
    for (
      const warehouse of
      SYSTEM_WAREHOUSES
    ) {
      await Warehouse.findOneAndUpdate(
        {
          $or: [
            {
              code:
                warehouse.code,
            },

            {
              name:
                warehouse.name,
            },
          ],
        },
        {
          $set: warehouse,
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert:
            true,
        }
      );
    }
  };

const getCollectionCounts =
  async (scope) => {
    const existingCollections =
      await getExistingCollectionNames();

    const collectionNames =
      collectionsForScope(scope);

    const counts = {};

    for (
      const collectionName of
      collectionNames
    ) {
      if (
        !existingCollections.has(
          collectionName
        )
      ) {
        counts[collectionName] = 0;
        continue;
      }

      counts[collectionName] =
        await mongoose.connection.db
          .collection(
            collectionName
          )
          .countDocuments({});
    }

    if (
      existingCollections.has(
        "warehouses"
      )
    ) {
      counts.nonSystemWarehouses =
        await mongoose.connection.db
          .collection(
            "warehouses"
          )
          .countDocuments({
            $and: [
              {
                isSystem: {
                  $ne: true,
                },
              },

              {
                name: {
                  $nin:
                    SYSTEM_WAREHOUSES.map(
                      (warehouse) =>
                        warehouse.name
                    ),
                },
              },
            ],
          });
    } else {
      counts.nonSystemWarehouses =
        0;
    }

    return counts;
  };

const writeResetAudit = async ({
  scope,
  deletedCounts,
  requestedBy,
  requestIp,
}) => {
  await mongoose.connection.db
    .collection(
      "systemresetaudits"
    )
    .insertOne({
      scope,

      deletedCounts,

      requestedBy:
        normalizeText(
          requestedBy,
          "Administrator"
        ),

      requestIp:
        normalizeText(requestIp),

      createdAt: new Date(),
    });
};

/*
|--------------------------------------------------------------------------
| Preview Data Reset
|--------------------------------------------------------------------------
*/

router.post(
  "/preview",
  authorizeReset,
  async (req, res) => {
    try {
      const scope =
        normalizeText(
          req.body.scope,
          "transactions"
        );

      validateScope(scope);

      const counts =
        await getCollectionCounts(
          scope
        );

      return res.status(200).json({
        success: true,

        scope,

        requiredConfirmation:
          CONFIRMATION_PHRASES[
            scope
          ],

        counts,

        preserved: [
          "Users",
          "Settings",
          "Branding",
          "Raw Material Godown",
          "Finished Goods Godown",
          "System Reset Audit",
        ],
      });
    } catch (error) {
      console.error(
        "Reset Preview Error:",
        error
      );

      return res.status(400).json({
        success: false,

        message:
          error.message ||
          "Reset preview load nahi hua",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| Clear Data
|--------------------------------------------------------------------------
*/

router.post(
  "/clear",
  authorizeReset,
  async (req, res) => {
    try {
      const scope =
        normalizeText(
          req.body.scope,
          "transactions"
        );

      const confirmation =
        normalizeText(
          req.body.confirmation
        );

      validateScope(scope);

      const requiredConfirmation =
        CONFIRMATION_PHRASES[
          scope
        ];

      if (
        confirmation !==
        requiredConfirmation
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              `Confirmation phrase bilkul yeh honi chahiye: ${requiredConfirmation}`,
          });
      }

      const existingCollections =
        await getExistingCollectionNames();

      const collectionNames =
        collectionsForScope(
          scope
        );

      const deletedCounts = {};

      for (
        const collectionName of
        collectionNames
      ) {
        if (
          !existingCollections.has(
            collectionName
          )
        ) {
          deletedCounts[
            collectionName
          ] = 0;

          continue;
        }

        const result =
          await mongoose.connection.db
            .collection(
              collectionName
            )
            .deleteMany({});

        deletedCounts[
          collectionName
        ] = Number(
          result.deletedCount || 0
        );
      }

      if (
        scope ===
          "all-business-data" &&
        existingCollections.has(
          "warehouses"
        )
      ) {
        const warehouseResult =
          await mongoose.connection.db
            .collection(
              "warehouses"
            )
            .deleteMany({
              $and: [
                {
                  isSystem: {
                    $ne: true,
                  },
                },

                {
                  name: {
                    $nin:
                      SYSTEM_WAREHOUSES.map(
                        (
                          warehouse
                        ) =>
                          warehouse.name
                      ),
                  },
                },
              ],
            });

        deletedCounts.nonSystemWarehouses =
          Number(
            warehouseResult.deletedCount ||
              0
          );
      }

      /*
       * Transactions صاف ہونے پر Item Master محفوظ رہتا ہے،
       * اس لیے Opening Stock flags بھی reset ہوں گے۔
       */
      if (
        scope ===
          "transactions" &&
        existingCollections.has(
          "items"
        )
      ) {
        const itemResetResult =
          await mongoose.connection.db
            .collection("items")
            .updateMany(
              {},
              {
                $set: {
                  openingStock: 0,

                  openingStockPosted:
                    false,
                },
              }
            );

        deletedCounts.itemsOpeningStockReset =
          Number(
            itemResetResult.modifiedCount ||
              0
          );
      }

      await ensureSystemWarehouses();

      await writeResetAudit({
        scope,

        deletedCounts,

        requestedBy:
          req.body.requestedBy,

        requestIp:
          req.headers[
            "x-forwarded-for"
          ] ||
          req.socket
            ?.remoteAddress ||
          "",
      });

      return res.status(200).json({
        success: true,

        message:
          scope ===
          "all-business-data"
            ? "All Muddasir business data cleared successfully"
            : "All transaction data cleared successfully",

        scope,

        deletedCounts,

        preserved: [
          "Users",
          "Settings",
          "Branding",
          "Raw Material Godown",
          "Finished Goods Godown",
          "System Reset Audit",
        ],
      });
    } catch (error) {
      console.error(
        "System Data Reset Error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          error.message ||
          "System data clear nahi hua",
      });
    }
  }
);

module.exports = router;