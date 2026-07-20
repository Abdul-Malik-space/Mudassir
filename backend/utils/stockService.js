const mongoose = require("mongoose");

const Item = require("../models/Item");
const Warehouse = require("../models/Warehouse");
const StockLedger = require("../models/StockLedger");

const RAW_MATERIAL_GODOWN = "Raw Material Godown";
const FINISHED_GOODS_GODOWN =
  "Finished Goods Godown";

/*
 * پرانے Stock Ledger records کو فوری طور پر ضائع ہونے
 * سے بچانے کے لیے ان names کو legacy aliases رکھا ہے۔
 */
const LEGACY_WAREHOUSE_NAMES = [
  "Main Godown",
  "Muddasir Godown",
];

const VALID_MOVEMENT_TYPES = [
  "Opening Stock",

  "Purchase In",
  "GRN In",
  "Purchase Return Out",

  "Production Issue",
  "Production Return",
  "Production Wastage",
  "Production Output",

  "Warehouse Transfer In",
  "Warehouse Transfer Out",

  "Sales Out",
  "Delivery Challan Out",
  "Sales Return In",

  "Adjustment In",
  "Adjustment Out",

  "Reversal In",
  "Reversal Out",
];

const DEFAULT_WAREHOUSES = [
  {
    code: "WH-RM",
    name: RAW_MATERIAL_GODOWN,
    warehouseType: "Raw Material",
    status: "Active",
    isSystem: true,
    notes:
      "System warehouse for raw material, packing material and consumables.",
  },
  {
    code: "WH-FG",
    name: FINISHED_GOODS_GODOWN,
    warehouseType: "Finished Goods",
    status: "Active",
    isSystem: true,
    notes:
      "System warehouse for completed finished products.",
  },
];

const todayDate = () =>
  new Date().toISOString().slice(0, 10);

const normalizeText = (value, fallback = "") => {
  const cleanedValue = String(value || "").trim();

  return cleanedValue || fallback;
};

const normalizeNumber = (value, fallback = 0) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return number;
};

const escapeRegex = (value) => {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
};

const withSession = (query, session) => {
  if (session) {
    return query.session(session);
  }

  return query;
};

const getDefaultWarehouseName = (itemType) => {
  if (itemType === "Finished Good") {
    return FINISHED_GOODS_GODOWN;
  }

  return RAW_MATERIAL_GODOWN;
};

/*
|--------------------------------------------------------------------------
| Ensure System Warehouses
|--------------------------------------------------------------------------
*/

const ensureDefaultWarehouses = async ({
  session = null,
} = {}) => {
  for (const warehouseData of DEFAULT_WAREHOUSES) {
    let warehouse = await withSession(
      Warehouse.findOne({
        $or: [
          { name: warehouseData.name },
          { code: warehouseData.code },
        ],
      }),
      session
    );

    if (!warehouse) {
      try {
        const createdWarehouses =
          await Warehouse.create(
            [
              {
                ...warehouseData,
                location: "",
                capacity: "",
                capacityPercent: 0,
              },
            ],
            session ? { session } : {}
          );

        warehouse = createdWarehouses[0];
      } catch (error) {
        /*
         * دو requests ایک وقت پر default warehouse بنائیں
         * تو duplicate error کے بعد موجودہ record دوبارہ load ہوگا۔
         */
        if (error.code !== 11000) {
          throw error;
        }

        warehouse = await withSession(
          Warehouse.findOne({
            $or: [
              { name: warehouseData.name },
              { code: warehouseData.code },
            ],
          }),
          session
        );
      }
    }

    if (!warehouse) {
      throw new Error(
        `${warehouseData.name} create nahi hua`
      );
    }

    const requiredChanges = {};

    if (warehouse.name !== warehouseData.name) {
      requiredChanges.name = warehouseData.name;
    }

    if (warehouse.code !== warehouseData.code) {
      requiredChanges.code = warehouseData.code;
    }

    if (
      warehouse.warehouseType !==
      warehouseData.warehouseType
    ) {
      requiredChanges.warehouseType =
        warehouseData.warehouseType;
    }

    if (warehouse.isSystem !== true) {
      requiredChanges.isSystem = true;
    }

    if (Object.keys(requiredChanges).length > 0) {
      await withSession(
        Warehouse.findByIdAndUpdate(
          warehouse._id,
          requiredChanges,
          {
            new: true,
            runValidators: true,
          }
        ),
        session
      );
    }
  }
};

/*
|--------------------------------------------------------------------------
| Find Warehouse
|--------------------------------------------------------------------------
*/

const findWarehouseByName = async (
  warehouseName,
  session = null
) => {
  const escapedName = escapeRegex(warehouseName);

  return withSession(
    Warehouse.findOne({
      name: {
        $regex: `^${escapedName}$`,
        $options: "i",
      },
    }),
    session
  );
};

const resolveWarehouse = async ({
  item,
  warehouse = "",
  session = null,
}) => {
  await ensureDefaultWarehouses({ session });

  const defaultWarehouseName =
    getDefaultWarehouseName(item.itemType);

  let requestedWarehouse = warehouse;

  if (
    requestedWarehouse &&
    typeof requestedWarehouse === "object"
  ) {
    requestedWarehouse =
      requestedWarehouse._id ||
      requestedWarehouse.id ||
      requestedWarehouse.name ||
      "";
  }

  requestedWarehouse = normalizeText(
    requestedWarehouse
  );

  let selectedWarehouse = null;

  /*
   * Warehouse ObjectId آیا ہو۔
   */
  if (
    requestedWarehouse &&
    mongoose.isValidObjectId(requestedWarehouse)
  ) {
    selectedWarehouse = await withSession(
      Warehouse.findById(requestedWarehouse),
      session
    );
  }

  /*
   * Warehouse name آیا ہو۔
   */
  if (!selectedWarehouse && requestedWarehouse) {
    selectedWarehouse = await findWarehouseByName(
      requestedWarehouse,
      session
    );
  }

  /*
   * پرانا Main Godown database میں موجود نہ ہو تو
   * Item Type کے مطابق نئے system godown میں بھیج دیں۔
   */
  if (
    !selectedWarehouse &&
    LEGACY_WAREHOUSE_NAMES.some(
      (legacyName) =>
        legacyName.toLowerCase() ===
        requestedWarehouse.toLowerCase()
    )
  ) {
    selectedWarehouse = await findWarehouseByName(
      defaultWarehouseName,
      session
    );
  }

  /*
   * Warehouse دیا ہی نہ گیا ہو۔
   */
  if (!selectedWarehouse && !requestedWarehouse) {
    selectedWarehouse = await findWarehouseByName(
      defaultWarehouseName,
      session
    );
  }

  if (!selectedWarehouse) {
    throw new Error(
      `Warehouse not found: ${
        requestedWarehouse || defaultWarehouseName
      }`
    );
  }

  if (selectedWarehouse.status === "Inactive") {
    throw new Error(
      `${selectedWarehouse.name} inactive hai`
    );
  }

  return selectedWarehouse;
};

/*
|--------------------------------------------------------------------------
| Validate Item and Warehouse Combination
|--------------------------------------------------------------------------
*/

const validateItemWarehouse = ({
  item,
  warehouse,
  movementType,
}) => {
  if (
    item.itemType === "Service" ||
    item.stockManaged === false
  ) {
    throw new Error(
      "Service item ka warehouse stock manage nahi hota"
    );
  }

  const warehouseType = warehouse.warehouseType;

  if (
    item.itemType === "Finished Good" &&
    warehouseType === "Raw Material"
  ) {
    throw new Error(
      "Finished Good ko Raw Material Godown mein post nahi kiya ja sakta"
    );
  }

  if (
    item.itemType !== "Finished Good" &&
    warehouseType === "Finished Goods"
  ) {
    throw new Error(
      "Raw Material ko Finished Goods Godown mein post nahi kiya ja sakta"
    );
  }

  if (movementType === "Production Issue") {
    if (item.itemType === "Finished Good") {
      throw new Error(
        "Finished Good ko Production Issue nahi kiya ja sakta"
      );
    }

    if (
      !["Raw Material", "General"].includes(
        warehouseType
      )
    ) {
      throw new Error(
        "Production Issue Raw Material Godown se hona chahiye"
      );
    }
  }

  if (
    ["Production Return", "Production Wastage"].includes(
      movementType
    ) &&
    item.itemType === "Finished Good"
  ) {
    throw new Error(
      `${movementType} finished good item ke liye allowed nahi`
    );
  }

  if (movementType === "Production Output") {
    if (item.itemType !== "Finished Good") {
      throw new Error(
        "Production Output sirf Finished Good item ka ho sakta hai"
      );
    }

    if (
      !["Finished Goods", "General"].includes(
        warehouseType
      )
    ) {
      throw new Error(
        "Production Output Finished Goods Godown mein jana chahiye"
      );
    }
  }
};

/*
|--------------------------------------------------------------------------
| Legacy Warehouse Names
|--------------------------------------------------------------------------
*/

const getWarehouseMatchNames = (
  selectedWarehouse
) => {
  const names = [selectedWarehouse.name];

  /*
   * پرانے Main Godown/Muddasir Godown balances بھی نئے
   * system warehouses کے stock check میں شامل رہیں گے۔
   */
  if (
    [
      RAW_MATERIAL_GODOWN,
      FINISHED_GOODS_GODOWN,
    ].includes(selectedWarehouse.name)
  ) {
    names.push(...LEGACY_WAREHOUSE_NAMES);
  }

  return Array.from(new Set(names));
};

/*
|--------------------------------------------------------------------------
| Internal Stock Calculation
|--------------------------------------------------------------------------
*/

const calculateItemStock = async ({
  itemId,
  warehouseNames = null,
  session = null,
}) => {
  const match = {
    item: new mongoose.Types.ObjectId(itemId),
  };

  if (
    Array.isArray(warehouseNames) &&
    warehouseNames.length > 0
  ) {
    match.warehouse = {
      $in: warehouseNames,
    };
  }

  const aggregation = StockLedger.aggregate([
    {
      $match: match,
    },
    {
      $group: {
        _id: "$item",
        qtyIn: {
          $sum: {
            $ifNull: ["$qtyIn", 0],
          },
        },
        qtyOut: {
          $sum: {
            $ifNull: ["$qtyOut", 0],
          },
        },
      },
    },
  ]);

  if (session) {
    aggregation.session(session);
  }

  const result = await aggregation;
  const row = result[0];

  if (!row) {
    return 0;
  }

  return (
    Number(row.qtyIn || 0) -
    Number(row.qtyOut || 0)
  );
};

/*
|--------------------------------------------------------------------------
| Get Item Stock
|--------------------------------------------------------------------------
*/

const getItemStock = async (
  itemId,
  warehouse = "",
  options = {}
) => {
  const { session = null } = options;

  if (!mongoose.isValidObjectId(itemId)) {
    throw new Error("Invalid stock item ID");
  }

  const selectedItem = await withSession(
    Item.findById(itemId),
    session
  );

  if (!selectedItem) {
    throw new Error("Stock item not found");
  }

  /*
   * Warehouse نہ دیا جائے تو تمام warehouses کا total stock۔
   */
  if (!warehouse) {
    return calculateItemStock({
      itemId: selectedItem._id,
      warehouseNames: null,
      session,
    });
  }

  const selectedWarehouse = await resolveWarehouse({
    item: selectedItem,
    warehouse,
    session,
  });

  const warehouseNames =
    getWarehouseMatchNames(selectedWarehouse);

  return calculateItemStock({
    itemId: selectedItem._id,
    warehouseNames,
    session,
  });
};

/*
|--------------------------------------------------------------------------
| Posting Key
|--------------------------------------------------------------------------
*/

const buildPostingKey = ({
  sourceModule,
  referenceModel,
  referenceId,
  referenceNo,
  referenceLineId,
  movementType,
  itemId,
  warehouseName,
}) => {
  const hasReference =
    referenceId || referenceNo;

  if (!sourceModule || !hasReference) {
    return undefined;
  }

  return [
    normalizeText(sourceModule).toLowerCase(),
    normalizeText(referenceModel).toLowerCase(),
    referenceId
      ? String(referenceId)
      : normalizeText(referenceNo).toLowerCase(),
    normalizeText(referenceLineId, "default")
      .toLowerCase(),
    normalizeText(movementType).toLowerCase(),
    String(itemId),
    normalizeText(warehouseName).toLowerCase(),
  ].join("|");
};

/*
|--------------------------------------------------------------------------
| Post Stock Movement
|--------------------------------------------------------------------------
*/

const postStockMovement = async ({
  item,
  warehouse = "",

  date = todayDate(),

  movementType,

  sourceModule = "",
  referenceModel = "",
  referenceId = null,
  referenceLineId = "",
  referenceNo = "",

  qtyIn = 0,
  qtyOut = 0,

  rate,

  remarks = "",

  allowNegativeStock = false,
  allowInactiveItem = false,
  allowDuplicate = false,

  isReversal = false,
  reversalOf = null,

  session = null,
}) => {
  if (!mongoose.isValidObjectId(item)) {
    throw new Error("Invalid stock item ID");
  }

  if (!VALID_MOVEMENT_TYPES.includes(movementType)) {
    throw new Error(
      `Invalid stock movement type: ${movementType}`
    );
  }

  const selectedItem = await withSession(
    Item.findById(item),
    session
  );

  if (!selectedItem) {
    throw new Error("Stock item not found");
  }

  if (
    selectedItem.status === "Inactive" &&
    !allowInactiveItem
  ) {
    throw new Error(
      `${selectedItem.name} inactive item hai`
    );
  }

  if (
    selectedItem.itemType === "Service" ||
    selectedItem.stockManaged === false
  ) {
    throw new Error(
      "Service item ka stock movement nahi ho sakta"
    );
  }

  const finalQtyIn = normalizeNumber(qtyIn);
  const finalQtyOut = normalizeNumber(qtyOut);

  if (finalQtyIn < 0 || finalQtyOut < 0) {
    throw new Error(
      "Stock quantity negative nahi ho sakti"
    );
  }

  if (finalQtyIn <= 0 && finalQtyOut <= 0) {
    throw new Error(
      "Stock IN ya Stock OUT quantity required hai"
    );
  }

  if (finalQtyIn > 0 && finalQtyOut > 0) {
    throw new Error(
      "Aik entry mein IN aur OUT dono nahi ho sakte"
    );
  }

  const selectedWarehouse =
    await resolveWarehouse({
      item: selectedItem,
      warehouse,
      session,
    });

  validateItemWarehouse({
    item: selectedItem,
    warehouse: selectedWarehouse,
    movementType,
  });

  /*
   * Full warehouse میں نیا stock IN نہیں ہوگا،
   * لیکن موجودہ stock OUT کیا جاسکتا ہے۔
   */
  if (
    finalQtyIn > 0 &&
    selectedWarehouse.status === "Full"
  ) {
    throw new Error(
      `${selectedWarehouse.name} full hai. Stock IN nahi ho sakta`
    );
  }

  const warehouseNames =
    getWarehouseMatchNames(selectedWarehouse);

  if (
    finalQtyOut > 0 &&
    !allowNegativeStock
  ) {
    const currentStock =
      await calculateItemStock({
        itemId: selectedItem._id,
        warehouseNames,
        session,
      });

    if (finalQtyOut > currentStock) {
      throw new Error(
        `Stock available nahi hai. Current stock sirf ${currentStock} ${selectedItem.unit} hai`
      );
    }
  }

  let normalizedReferenceId = null;

  if (referenceId) {
    if (!mongoose.isValidObjectId(referenceId)) {
      throw new Error("Invalid stock reference ID");
    }

    normalizedReferenceId =
      new mongoose.Types.ObjectId(referenceId);
  }

  let normalizedReversalOf = null;

  if (reversalOf) {
    if (!mongoose.isValidObjectId(reversalOf)) {
      throw new Error(
        "Invalid reversal Stock Ledger ID"
      );
    }

    normalizedReversalOf =
      new mongoose.Types.ObjectId(reversalOf);
  }

  const postingKey = allowDuplicate
    ? undefined
    : buildPostingKey({
        sourceModule,
        referenceModel,
        referenceId: normalizedReferenceId,
        referenceNo,
        referenceLineId,
        movementType,
        itemId: selectedItem._id,
        warehouseName: selectedWarehouse.name,
      });

  /*
   * Same source document دوبارہ submit ہونے پر
   * پرانی entry return ہوگی، نئی duplicate entry نہیں بنے گی۔
   */
  if (postingKey) {
    const existingMovement = await withSession(
      StockLedger.findOne({
        postingKey,
      }),
      session
    );

    if (existingMovement) {
      return existingMovement;
    }
  }

  const finalRate =
    rate === undefined ||
    rate === null ||
    rate === ""
      ? normalizeNumber(
          selectedItem.purchasePrice,
          0
        )
      : normalizeNumber(rate, 0);

  if (finalRate < 0) {
    throw new Error(
      "Stock rate negative nahi ho sakta"
    );
  }

  const ledgerPayload = {
    date: normalizeText(date, todayDate()),

    item: selectedItem._id,
    itemCode: selectedItem.code,
    itemName: selectedItem.name,

    warehouseId: selectedWarehouse._id,
    warehouse: selectedWarehouse.name,

    movementType,

    sourceModule: normalizeText(sourceModule),
    referenceModel:
      normalizeText(referenceModel),
    referenceId: normalizedReferenceId,
    referenceLineId:
      normalizeText(referenceLineId),
    referenceNo: normalizeText(referenceNo),

    qtyIn: finalQtyIn,
    qtyOut: finalQtyOut,

    unit: selectedItem.unit,

    rate: finalRate,

    remarks: normalizeText(remarks),

    postingKey,

    isReversal: Boolean(isReversal),
    reversalOf: normalizedReversalOf,
  };

  try {
    const createdMovements =
      await StockLedger.create(
        [ledgerPayload],
        session ? { session } : {}
      );

    return createdMovements[0];
  } catch (error) {
    /*
     * ایک ہی وقت میں duplicate request آنے پر unique index
     * دوسری entry block کرے گا، پھر پہلی entry return ہوگی۔
     */
    if (error.code === 11000 && postingKey) {
      const existingMovement =
        await withSession(
          StockLedger.findOne({
            postingKey,
          }),
          session
        );

      if (existingMovement) {
        return existingMovement;
      }
    }

    throw error;
  }
};

module.exports = {
  RAW_MATERIAL_GODOWN,
  FINISHED_GOODS_GODOWN,
  LEGACY_WAREHOUSE_NAMES,
  VALID_MOVEMENT_TYPES,

  ensureDefaultWarehouses,
  resolveWarehouse,
  getItemStock,
  postStockMovement,
};