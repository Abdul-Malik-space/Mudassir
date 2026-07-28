import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeftIcon,
  ArrowPathIcon,
  ArrowRightCircleIcon,
  CheckCircleIcon,
  ClipboardDocumentCheckIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

import {
  API_BASE_URL,
} from "../config/api";

const API_JOBS =
  `${API_BASE_URL}/production-items`;

const API_ITEMS =
  `${API_BASE_URL}/items`;

const API_SALES_ORDERS =
  `${API_BASE_URL}/sales-orders`;

const API_STOCK =
  `${API_BASE_URL}/stock-ledger`;

const API_MATERIAL_ISSUES =
  `${API_BASE_URL}/material-issues`;

const todayDate = () =>
  new Date()
    .toISOString()
    .slice(0, 10);

const num = (value) =>
  Number.isFinite(Number(value))
    ? Number(value)
    : 0;

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

const dateOnly = (value) =>
  value
    ? String(value).slice(0, 10)
    : "";

const qty = (value) =>
  num(value).toLocaleString(
    undefined,
    {
      maximumFractionDigits: 3,
    }
  );

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500";

const normalizeArray = (
  data,
  keys = []
) => {
  if (Array.isArray(data)) {
    return data;
  }

  for (const key of keys) {
    if (
      Array.isArray(data?.[key])
    ) {
      return data[key];
    }
  }

  if (
    Array.isArray(data?.data)
  ) {
    return data.data;
  }

  return [];
};

const apiRequest = async (
  url,
  options = {}
) => {
  const response = await fetch(
    url,
    {
      ...options,

      headers: {
        "Content-Type":
          "application/json",

        ...(options.headers ||
          {}),
      },
    }
  );

  const data =
    await response
      .json()
      .catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message ||
        data.error ||
        "Request failed"
    );
  }

  return data;
};

const optionalArrayRequest =
  async (
    url,
    keys = []
  ) => {
    try {
      return normalizeArray(
        await apiRequest(url),
        keys
      );
    } catch (error) {
      console.warn(
        `Optional request failed: ${url}`,
        error.message
      );

      return [];
    }
  };

const emptyMaterial = () => ({
  _id: undefined,

  item: "",

  itemCode: "",

  itemName: "",

  requiredQty: "",

  issuedQty: 0,

  returnedQty: 0,

  wastageQty: 0,

  unit: "Pcs",

  rate: "",

  remarks: "",
});

const emptyJob = () => ({
  jobNo: "",

  jobName: "",

  sourceType:
    "Internal Requirement",

  salesOrder: "",

  salesOrderNo: "",

  salesOrderItemId: "",

  selectedSalesOrderItemIds: [],

  productionSelections: [],

  salesOrderOrderDate: "",

  salesOrderDeliveryDate: "",

  salesOrderReferenceNo: "",

  internalReference: "",

  customer: "",

  customerName:
    "Internal Production",

  customerPhone: "",

  customerEmail: "",

  customerAddress: "",

  customerCity: "",

  customerNTN: "",

  customerPO: "",

  finishedGoodItem: "",

  finishedGoodCode: "",

  finishedGoodName: "",

  orderDescription: "",

  orderSize: "",

  orderTextType: "",

  orderCartons: 0,

  orderedQty: 0,

  plannedProductionQty: 0,

  remainingProductionQty: 0,

  preparedQty: 0,

  orderUnit: "Pcs",

  existingTargetQty: 0,

  targetQty: "",

  unit: "Pcs",

  jobDate: todayDate(),

  dueDate: "",

  priority: "Normal",

  paperType: "",

  gsm: "",

  sheetSize: "",

  finishedSize: "",

  totalSheets: "",

  noOfColors: "",

  dieNo: "",

  instructions: "",

  remarks: "",

  materialRequirements: [],
});

const statusClass = (
  status
) => {
  const map = {
    Draft:
      "bg-slate-100 text-slate-700 border-slate-200",

    Approved:
      "bg-blue-100 text-blue-700 border-blue-200",

    "Material Issued":
      "bg-indigo-100 text-indigo-700 border-indigo-200",

    "In Printing":
      "bg-purple-100 text-purple-700 border-purple-200",

    "Quality Check":
      "bg-amber-100 text-amber-700 border-amber-200",

    Completed:
      "bg-emerald-100 text-emerald-700 border-emerald-200",

    Closed:
      "bg-teal-100 text-teal-700 border-teal-200",

    Cancelled:
      "bg-red-100 text-red-700 border-red-200",
  };

  return (
    map[status] ||
    map.Draft
  );
};

const priorityClass = (
  priority
) => {
  if (
    priority === "Urgent"
  ) {
    return "bg-red-100 text-red-700";
  }

  if (
    priority === "High"
  ) {
    return "bg-orange-100 text-orange-700";
  }

  return "bg-slate-100 text-slate-600";
};

const ProductionItemsManager =
  () => {
    const [jobs, setJobs] =
      useState([]);

    const [items, setItems] =
      useState([]);

    const [
      salesOrders,
      setSalesOrders,
    ] = useState([]);

    const [
      selectedSalesOrder,
      setSelectedSalesOrder,
    ] = useState(null);

    const [
      salesOrderLoading,
      setSalesOrderLoading,
    ] = useState(false);

    const [
      stockBalances,
      setStockBalances,
    ] = useState([]);

    const [form, setForm] =
      useState(emptyJob());

    const [editId, setEditId] =
      useState(null);

    const [
      formOpen,
      setFormOpen,
    ] = useState(false);

    const [
      viewJob,
      setViewJob,
    ] = useState(null);

    const [
      issueModal,
      setIssueModal,
    ] = useState(null);

    const [search, setSearch] =
      useState("");

    const [
      statusFilter,
      setStatusFilter,
    ] = useState("All");

    const [
      sourceFilter,
      setSourceFilter,
    ] = useState("All");

    const [
      loading,
      setLoading,
    ] = useState(false);

    const [
      saving,
      setSaving,
    ] = useState(false);

    const [
      actionId,
      setActionId,
    ] = useState("");

    const finishedGoods =
      useMemo(
        () =>
          items.filter(
            (item) =>
              item.itemType ===
                "Finished Good" &&
              item.stockManaged !==
                false &&
              item.status !==
                "Inactive"
          ),
        [items]
      );

    const rawMaterials =
      useMemo(
        () =>
          items.filter(
            (item) =>
              [
                "Raw Material",
                "Packing Material",
                "Consumable",
              ].includes(
                item.itemType
              ) &&
              item.stockManaged !==
                false &&
              item.status !==
                "Inactive"
          ),
        [items]
      );

    const itemMap =
      useMemo(
        () =>
          new Map(
            items.map((item) => [
              String(item._id),
              item,
            ])
          ),
        [items]
      );

    const stockMap =
      useMemo(() => {
        const map =
          new Map();

        stockBalances.forEach(
          (row) => {
            if (
              row.warehouse !==
              "Raw Material Godown"
            ) {
              return;
            }

            const itemId =
              idOf(row.item);

            if (itemId) {
              map.set(
                itemId,
                num(
                  row.currentStock
                )
              );
            }
          }
        );

        return map;
      }, [stockBalances]);

    const fetchData =
      async () => {
        try {
          setLoading(true);

          const [
            jobData,
            itemData,
            orderData,
            stockData,
          ] = await Promise.all([
            apiRequest(
              `${API_JOBS}/all`
            ),

            apiRequest(
              `${API_ITEMS}/all`
            ),

            optionalArrayRequest(
              `${API_SALES_ORDERS}/production-options`,
              [
                "salesOrders",
                "orders",
              ]
            ),

            optionalArrayRequest(
              `${API_STOCK}/balances`,
              [
                "balances",
                "stock",
              ]
            ),
          ]);

          setJobs(
            normalizeArray(
              jobData,
              [
                "jobs",
                "productionItems",
              ]
            )
          );

          setItems(
            normalizeArray(
              itemData,
              ["items"]
            )
          );

          setSalesOrders(
            orderData
          );

          setStockBalances(
            stockData
          );
        } catch (error) {
          console.error(
            "Production page load error:",
            error
          );

          alert(
            error.message ||
              "Unable to load production jobs"
          );
        } finally {
          setLoading(false);
        }
      };

    useEffect(() => {
      fetchData();
    }, []);

    const nextJobNo =
      async () => {
        try {
          const data =
            await apiRequest(
              `${API_JOBS}/next-no`
            );

          return (
            data.jobNo ||
            data.code ||
            ""
          );
        } catch {
          const highest =
            jobs.reduce(
              (
                max,
                job
              ) => {
                const match =
                  String(
                    job.jobNo ||
                      job.code ||
                      ""
                  ).match(
                    /JOB-(\d+)/i
                  );

                return match
                  ? Math.max(
                      max,
                      Number(
                        match[1]
                      )
                    )
                  : max;
              },
              0
            );

          return `JOB-${String(
            highest + 1
          ).padStart(4, "0")}`;
        }
      };

    const jobToForm = (
      job
    ) => ({
      ...emptyJob(),

      jobNo:
        job.jobNo ||
        job.code ||
        "",

      jobName:
        job.jobName ||
        job.name ||
        "",

      sourceType:
        job.sourceType ||
        "Internal Requirement",

      salesOrder: idOf(
        job.salesOrder
      ),

      salesOrderNo:
        job.salesOrderNo ||
        "",

      salesOrderItemId:
        idOf(
          job.salesOrderItemId
        ),

      selectedSalesOrderItemIds:
        idOf(
          job.salesOrderItemId
        )
          ? [
              idOf(
                job.salesOrderItemId
              ),
            ]
          : [],

      productionSelections: [],

      salesOrderOrderDate:
        dateOnly(
          job.salesOrderOrderDate ||
            job.salesOrder
              ?.orderDate
        ),

      salesOrderDeliveryDate:
        dateOnly(
          job.salesOrderDeliveryDate ||
            job.salesOrder
              ?.deliveryDate
        ),

      salesOrderReferenceNo:
        job.salesOrderReferenceNo ||
        "",

      internalReference:
        job.internalReference ||
        "",

      customer: idOf(
        job.customer
      ),

      customerName:
        job.customerName ||
        "",

      customerPhone:
        job.customerPhone ||
        "",

      customerEmail:
        job.customerEmail ||
        "",

      customerAddress:
        job.customerAddress ||
        "",

      customerCity:
        job.customerCity ||
        "",

      customerNTN:
        job.customerNTN ||
        "",

      customerPO:
        job.customerPO ||
        "",

      finishedGoodItem:
        idOf(
          job.finishedGoodItem
        ),

      finishedGoodCode:
        job.finishedGoodCode ||
        job.finishedGoodItem
          ?.code ||
        "",

      finishedGoodName:
        job.finishedGoodName ||
        job.finishedGoodItem
          ?.name ||
        "",

      orderDescription:
        job.orderDescription ||
        "",

      orderSize:
        job.orderSize ||
        "",

      orderTextType:
        job.orderTextType ||
        "",

      orderCartons:
        num(
          job.orderCartons
        ),

      orderedQty:
        num(
          job.orderedQty
        ),

      plannedProductionQty:
        0,

      remainingProductionQty:
        num(
          job.targetQty
        ),

      preparedQty:
        num(
          job.productionOutputQty
        ),

      orderUnit:
        job.orderUnit ||
        job.unit ||
        "Pcs",

      existingTargetQty:
        num(
          job.targetQty
        ),

      targetQty:
        job.targetQty ??
        job.quantity ??
        "",

      unit:
        job.unit || "Pcs",

      jobDate:
        dateOnly(
          job.jobDate
        ) || todayDate(),

      dueDate:
        dateOnly(
          job.dueDate ||
            job.deliveryDate
        ),

      priority:
        job.priority ||
        "Normal",

      paperType:
        job.paperType || "",

      gsm:
        job.gsm ?? "",

      sheetSize:
        job.sheetSize || "",

      finishedSize:
        job.finishedSize ||
        "",

      totalSheets:
        job.totalSheets ?? "",

      noOfColors:
        job.noOfColors || "",

      dieNo:
        job.dieNo || "",

      instructions:
        job.instructions ||
        "",

      remarks:
        job.remarks || "",

      materialRequirements:
        (
          job.materialRequirements ||
          []
        ).map((row) => ({
          _id: row._id,

          item: idOf(
            row.item
          ),

          itemCode:
            row.itemCode ||
            row.item?.code ||
            "",

          itemName:
            row.itemName ||
            row.item?.name ||
            "",

          requiredQty:
            row.requiredQty ??
            "",

          issuedQty: num(
            row.issuedQty
          ),

          returnedQty: num(
            row.returnedQty
          ),

          wastageQty: num(
            row.wastageQty
          ),

          unit:
            row.unit ||
            row.item?.unit ||
            "Pcs",

          rate:
            row.rate ??
            row.item
              ?.purchasePrice ??
            "",

          remarks:
            row.remarks || "",
        })),
    });

    const loadSalesOrderSource =
      async (
        orderId
      ) => {
        const response =
          await apiRequest(
            `${API_SALES_ORDERS}/production-source/${orderId}`
          );

        return (
          response.data ||
          response
        );
      };

    const openForm =
      async (job = null) => {
        if (job) {
          setEditId(job._id);

          let nextForm =
            jobToForm(job);

          if (
            job.sourceType ===
              "Sales Order" &&
            idOf(
              job.salesOrder
            )
          ) {
            try {
              setSalesOrderLoading(
                true
              );

              const order =
                await loadSalesOrderSource(
                  idOf(
                    job.salesOrder
                  )
                );

              setSelectedSalesOrder(
                order
              );

              setSalesOrders(
                (current) => {
                  const exists =
                    current.some(
                      (row) =>
                        String(
                          row._id
                        ) ===
                        String(
                          order._id
                        )
                    );

                  return exists
                    ? current.map(
                        (row) =>
                          String(
                            row._id
                          ) ===
                          String(
                            order._id
                          )
                            ? order
                            : row
                      )
                    : [
                        order,
                        ...current,
                      ];
                }
              );

              const line =
                (
                  order.items || []
                ).find(
                  (row) =>
                    String(
                      row.salesOrderItemId
                    ) ===
                    String(
                      idOf(
                        job.salesOrderItemId
                      )
                    )
                );

              const editableQty =
                num(
                  line
                    ?.remainingProductionQty
                ) +
                num(
                  job.targetQty
                );

              nextForm = {
                ...nextForm,

                salesOrder:
                  order._id,

                salesOrderNo:
                  order.salesOrderNo ||
                  nextForm.salesOrderNo,

                salesOrderOrderDate:
                  dateOnly(
                    order.orderDate
                  ),

                salesOrderDeliveryDate:
                  dateOnly(
                    order.deliveryDate
                  ),

                salesOrderReferenceNo:
                  order.referenceNo ||
                  "",

                customer:
                  idOf(
                    order.customer
                  ),

                customerName:
                  order.customerName ||
                  nextForm.customerName,

                customerPhone:
                  order.customerPhone ||
                  "",

                customerEmail:
                  order.customerEmail ||
                  "",

                customerAddress:
                  order.customerAddress ||
                  "",

                customerCity:
                  order.customerCity ||
                  "",

                customerNTN:
                  order.customerNTN ||
                  "",

                customerPO:
                  order.poNo ||
                  nextForm.customerPO,

                plannedProductionQty:
                  num(
                    line
                      ?.plannedProductionQty
                  ),

                remainingProductionQty:
                  editableQty,

                preparedQty:
                  num(
                    line
                      ?.preparedQty
                  ),

                orderedQty:
                  num(
                    line?.orderedQty ??
                      job.orderedQty
                  ),

                orderCartons:
                  num(
                    line?.cartons ??
                      job.orderCartons
                  ),

                orderDescription:
                  line?.description ||
                  job.orderDescription ||
                  "",

                orderSize:
                  line?.size ||
                  job.orderSize ||
                  "",

                orderTextType:
                  line?.textType ||
                  job.orderTextType ||
                  "",

                orderUnit:
                  line?.unit ||
                  job.orderUnit ||
                  job.unit ||
                  "Pcs",

                selectedSalesOrderItemIds:
                  line
                    ? [
                        String(
                          line
                            .salesOrderItemId
                        ),
                      ]
                    : [],

                productionSelections:
                  line
                    ? [
                        buildProductionSelection(
                          {
                            ...line,

                            remainingProductionQty:
                              editableQty,
                          },

                          job.targetQty,

                          job.jobName
                        ),
                      ]
                    : [],
              };
            } catch (error) {
              alert(
                error.message ||
                  "Unable to load Sales Order details"
              );

              setSelectedSalesOrder(
                null
              );
            } finally {
              setSalesOrderLoading(
                false
              );
            }
          } else {
            setSelectedSalesOrder(
              null
            );
          }

          setForm(
            nextForm
          );
        } else {
          setEditId(null);

          setSelectedSalesOrder(
            null
          );

          setForm({
            ...emptyJob(),

            jobNo:
              await nextJobNo(),
          });
        }

        setFormOpen(true);
      };

    const closeForm = () => {
      setFormOpen(false);
      setEditId(null);
      setSelectedSalesOrder(null);
      setForm(emptyJob());
    };

    const change = (
      field,
      value
    ) =>
      setForm((current) => ({
        ...current,
        [field]: value,
      }));

    const changeSource = (
      sourceType
    ) => {
      setSelectedSalesOrder(
        null
      );

      setForm((current) => ({
        ...current,

        sourceType,

        salesOrder: "",

        salesOrderNo: "",

        salesOrderItemId: "",

        selectedSalesOrderItemIds: [],

        productionSelections: [],

        salesOrderOrderDate: "",

        salesOrderDeliveryDate: "",

        salesOrderReferenceNo: "",

        internalReference: "",

        customer: "",

        customerName:
          sourceType ===
          "Internal Requirement"
            ? "Internal Production"
            : "",

        customerPhone: "",

        customerEmail: "",

        customerAddress: "",

        customerCity: "",

        customerNTN: "",

        customerPO: "",

        finishedGoodItem: "",

        finishedGoodCode: "",

        finishedGoodName: "",

        orderDescription: "",

        orderSize: "",

        orderTextType: "",

        orderCartons: 0,

        orderedQty: 0,

        plannedProductionQty: 0,

        remainingProductionQty: 0,

        preparedQty: 0,

        orderUnit: "Pcs",

        existingTargetQty: 0,

        targetQty: "",

        unit: "Pcs",

        dueDate: "",

        finishedSize: "",
      }));
    };

    const selectSalesOrder =
      async (
        orderId
      ) => {
        if (!orderId) {
          setSelectedSalesOrder(
            null
          );

          setForm(
            (current) => ({
              ...current,

              salesOrder: "",

              salesOrderNo: "",

              salesOrderItemId: "",

              selectedSalesOrderItemIds: [],

              productionSelections: [],

              salesOrderOrderDate: "",

              salesOrderDeliveryDate: "",

              salesOrderReferenceNo: "",

              customer: "",

              customerName: "",

              customerPhone: "",

              customerEmail: "",

              customerAddress: "",

              customerCity: "",

              customerNTN: "",

              customerPO: "",

              finishedGoodItem: "",

              finishedGoodCode: "",

              finishedGoodName: "",

              orderDescription: "",

              orderSize: "",

              orderTextType: "",

              orderCartons: 0,

              orderedQty: 0,

              plannedProductionQty: 0,

              remainingProductionQty: 0,

              preparedQty: 0,

              orderUnit: "Pcs",

              existingTargetQty: 0,

              targetQty: "",

              unit: "Pcs",

              dueDate: "",

              finishedSize: "",
            })
          );

          return;
        }

        try {
          setSalesOrderLoading(
            true
          );

          const order =
            await loadSalesOrderSource(
              orderId
            );

          setSelectedSalesOrder(
            order
          );

          setSalesOrders(
            (current) => {
              const exists =
                current.some(
                  (row) =>
                    String(
                      row._id
                    ) ===
                    String(
                      order._id
                    )
                );

              return exists
                ? current.map(
                    (row) =>
                      String(
                        row._id
                      ) ===
                      String(
                        order._id
                      )
                        ? order
                        : row
                  )
                : [
                    order,
                    ...current,
                  ];
            }
          );

          setForm(
            (current) => ({
              ...current,

              salesOrder:
                order._id,

              salesOrderNo:
                order.salesOrderNo ||
                "",

              salesOrderItemId: "",

              selectedSalesOrderItemIds: [],

              productionSelections: [],

              salesOrderOrderDate:
                dateOnly(
                  order.orderDate
                ),

              salesOrderDeliveryDate:
                dateOnly(
                  order.deliveryDate
                ),

              salesOrderReferenceNo:
                order.referenceNo ||
                "",

              customer:
                idOf(
                  order.customer
                ),

              customerName:
                order.customerName ||
                "",

              customerPhone:
                order.customerPhone ||
                "",

              customerEmail:
                order.customerEmail ||
                "",

              customerAddress:
                order.customerAddress ||
                "",

              customerCity:
                order.customerCity ||
                "",

              customerNTN:
                order.customerNTN ||
                "",

              customerPO:
                order.poNo ||
                "",

              finishedGoodItem: "",

              finishedGoodCode: "",

              finishedGoodName: "",

              jobName: "",

              orderDescription: "",

              orderSize: "",

              orderTextType: "",

              orderCartons: 0,

              orderedQty: 0,

              plannedProductionQty: 0,

              remainingProductionQty: 0,

              preparedQty: 0,

              orderUnit: "Pcs",

              existingTargetQty: 0,

              targetQty: "",

              unit: "Pcs",

              dueDate:
                dateOnly(
                  order.deliveryDate
                ),

              finishedSize: "",
            })
          );
        } catch (error) {
          setSelectedSalesOrder(
            null
          );

          alert(
            error.message ||
              "Unable to load Sales Order details"
          );
        } finally {
          setSalesOrderLoading(
            false
          );
        }
      };

    const buildProductionSelection = (
      line,
      targetQtyOverride = null,
      jobNameOverride = ""
    ) => {
      const availableQty =
        num(
          line
            ?.remainingProductionQty
        );

      const targetQty =
        targetQtyOverride ===
          null ||
        targetQtyOverride ===
          undefined ||
        targetQtyOverride ===
          ""
          ? availableQty
          : num(
              targetQtyOverride
            );

      return {
        salesOrderItemId:
          String(
            line
              ?.salesOrderItemId ||
              ""
          ),

        finishedGoodItem:
          idOf(
            line?.item
          ),

        finishedGoodCode:
          line?.itemCode ||
          "",

        finishedGoodName:
          line?.itemName ||
          "",

        jobName:
          jobNameOverride ||
          line?.description ||
          line?.itemName ||
          "Production Job",

        orderDescription:
          line?.description ||
          line?.itemName ||
          "",

        orderSize:
          line?.size ||
          "",

        orderTextType:
          line?.textType ||
          "",

        orderCartons:
          num(
            line?.cartons
          ),

        orderedQty:
          num(
            line?.orderedQty
          ),

        plannedProductionQty:
          num(
            line
              ?.plannedProductionQty
          ),

        remainingProductionQty:
          availableQty,

        preparedQty:
          num(
            line?.preparedQty
          ),

        targetQty:
          targetQty > 0
            ? String(
                targetQty
              )
            : "",

        unit:
          line?.unit ||
          "Pcs",

        remarks:
          line?.remarks ||
          "",
      };
    };

    const applyProductionSelections = (
      current,
      selections
    ) => {
      const cleanSelections =
        selections.filter(
          (selection) =>
            selection
              ?.salesOrderItemId
        );

      const selectedIds =
        cleanSelections.map(
          (selection) =>
            String(
              selection
                .salesOrderItemId
            )
        );

      const primary =
        cleanSelections[0];

      if (!primary) {
        return {
          ...current,

          salesOrderItemId: "",

          selectedSalesOrderItemIds:
            [],

          productionSelections:
            [],

          finishedGoodItem: "",

          finishedGoodCode: "",

          finishedGoodName: "",

          jobName: "",

          orderDescription: "",

          orderSize: "",

          orderTextType: "",

          orderCartons: 0,

          orderedQty: 0,

          plannedProductionQty:
            0,

          remainingProductionQty:
            0,

          preparedQty: 0,

          orderUnit: "Pcs",

          existingTargetQty: 0,

          targetQty: "",

          unit: "Pcs",

          finishedSize: "",
        };
      }

      const allUnits =
        [
          ...new Set(
            cleanSelections.map(
              (selection) =>
                selection.unit ||
                "Pcs"
            )
          ),
        ];

      const totalTargetQty =
        cleanSelections.reduce(
          (
            total,
            selection
          ) =>
            total +
            num(
              selection.targetQty
            ),
          0
        );

      return {
        ...current,

        salesOrderItemId:
          primary.salesOrderItemId,

        selectedSalesOrderItemIds:
          selectedIds,

        productionSelections:
          cleanSelections,

        finishedGoodItem:
          primary.finishedGoodItem,

        finishedGoodCode:
          primary.finishedGoodCode,

        finishedGoodName:
          primary.finishedGoodName,

        jobName:
          cleanSelections.length ===
          1
            ? primary.jobName
            : `${cleanSelections.length} Production Jobs`,

        orderDescription:
          cleanSelections.length ===
          1
            ? primary.orderDescription
            : "Multiple Sales Order Items",

        orderSize:
          cleanSelections.length ===
          1
            ? primary.orderSize
            : "Multiple",

        orderTextType:
          cleanSelections.length ===
          1
            ? primary.orderTextType
            : "multiple",

        orderCartons:
          cleanSelections.reduce(
            (
              total,
              selection
            ) =>
              total +
              num(
                selection
                  .orderCartons
              ),
            0
          ),

        orderedQty:
          cleanSelections.reduce(
            (
              total,
              selection
            ) =>
              total +
              num(
                selection.orderedQty
              ),
            0
          ),

        plannedProductionQty:
          cleanSelections.reduce(
            (
              total,
              selection
            ) =>
              total +
              num(
                selection
                  .plannedProductionQty
              ),
            0
          ),

        remainingProductionQty:
          cleanSelections.reduce(
            (
              total,
              selection
            ) =>
              total +
              num(
                selection
                  .remainingProductionQty
              ),
            0
          ),

        preparedQty:
          cleanSelections.reduce(
            (
              total,
              selection
            ) =>
              total +
              num(
                selection.preparedQty
              ),
            0
          ),

        orderUnit:
          allUnits.length === 1
            ? allUnits[0]
            : "Mixed",

        existingTargetQty:
          cleanSelections.length ===
          1
            ? num(
                current
                  .existingTargetQty
              )
            : 0,

        targetQty:
          cleanSelections.length ===
          1
            ? primary.targetQty
            : String(
                totalTargetQty
              ),

        unit:
          allUnits.length === 1
            ? allUnits[0]
            : "Mixed",

        finishedSize:
          cleanSelections.length ===
          1
            ? primary.orderSize ||
              current.finishedSize
            : "",
      };
    };

    const selectSalesOrderItem = (
      lineId
    ) => {
      const line =
        (
          selectedSalesOrder
            ?.items || []
        ).find(
          (row) =>
            String(
              row.salesOrderItemId
            ) ===
            String(
              lineId
            )
        );

      if (!line) {
        return;
      }

      setForm(
        (current) => {
          const lineKey =
            String(
              line.salesOrderItemId
            );

          const alreadySelected =
            (
              current
                .selectedSalesOrderItemIds ||
              []
            ).some(
              (value) =>
                String(value) ===
                lineKey
            );

          if (editId) {
            const editableQty =
              productionAvailableQty(
                line
              );

            const selection =
              buildProductionSelection(
                {
                  ...line,

                  remainingProductionQty:
                    editableQty,
                },

                String(
                  lineKey
                ) ===
                  String(
                    current
                      .salesOrderItemId
                  )
                  ? current.targetQty
                  : editableQty,

                String(
                  lineKey
                ) ===
                  String(
                    current
                      .salesOrderItemId
                  )
                  ? current.jobName
                  : ""
              );

            return applyProductionSelections(
              current,
              [
                selection,
              ]
            );
          }

          if (
            alreadySelected
          ) {
            return applyProductionSelections(
              current,

              (
                current
                  .productionSelections ||
                []
              ).filter(
                (selection) =>
                  String(
                    selection
                      .salesOrderItemId
                  ) !==
                  lineKey
              )
            );
          }

          const availableQty =
            productionAvailableQty(
              line
            );

          if (
            availableQty <= 0
          ) {
            return current;
          }

          const selection =
            buildProductionSelection({
              ...line,

              remainingProductionQty:
                availableQty,
            });

          return applyProductionSelections(
            current,

            [
              ...(
                current
                  .productionSelections ||
                []
              ),

              selection,
            ]
          );
        }
      );
    };

    const toggleAllSalesOrderItems =
      () => {
        if (
          editId ||
          !selectedSalesOrder
        ) {
          return;
        }

        setForm(
          (current) => {
            const eligibleRows =
              (
                selectedSalesOrder
                  .items || []
              ).filter(
                (row) =>
                  productionAvailableQty(
                    row
                  ) > 0
              );

            const allSelected =
              eligibleRows.length >
                0 &&
              eligibleRows.every(
                (row) =>
                  (
                    current
                      .selectedSalesOrderItemIds ||
                    []
                  ).some(
                    (value) =>
                      String(
                        value
                      ) ===
                      String(
                        row
                          .salesOrderItemId
                      )
                  )
              );

            if (allSelected) {
              return applyProductionSelections(
                current,
                []
              );
            }

            const existingMap =
              new Map(
                (
                  current
                    .productionSelections ||
                  []
                ).map(
                  (selection) => [
                    String(
                      selection
                        .salesOrderItemId
                    ),

                    selection,
                  ]
                )
              );

            const selections =
              eligibleRows.map(
                (row) => {
                  const key =
                    String(
                      row
                        .salesOrderItemId
                    );

                  return (
                    existingMap.get(
                      key
                    ) ||
                    buildProductionSelection({
                      ...row,

                      remainingProductionQty:
                        productionAvailableQty(
                          row
                        ),
                    })
                  );
                }
              );

            return applyProductionSelections(
              current,
              selections
            );
          }
        );
      };

    const updateProductionSelection =
      (
        lineId,
        field,
        value
      ) => {
        setForm(
          (current) => {
            const selections =
              (
                current
                  .productionSelections ||
                []
              ).map(
                (selection) =>
                  String(
                    selection
                      .salesOrderItemId
                  ) ===
                  String(lineId)
                    ? {
                        ...selection,

                        [field]:
                          value,
                      }
                    : selection
              );

            return applyProductionSelections(
              current,
              selections
            );
          }
        );
      };

    const selectFinishedGood =
      (itemId) => {
        if (
          form.sourceType ===
          "Sales Order"
        ) {
          return;
        }

        const item =
          finishedGoods.find(
            (row) =>
              String(row._id) ===
              String(itemId)
          );

        setForm((current) => ({
          ...current,

          finishedGoodItem:
            itemId,

          finishedGoodCode:
            item?.code ||
            "",

          finishedGoodName:
            item?.name ||
            "",

          jobName:
            current.jobName ||
            item?.name ||
            "",

          unit:
            item?.unit ||
            current.unit ||
            "Pcs",
        }));
      };

    const addMaterial = () =>
      setForm((current) => ({
        ...current,

        materialRequirements: [
          ...current.materialRequirements,

          emptyMaterial(),
        ],
      }));

    const updateMaterial = (
      index,
      field,
      value
    ) => {
      setForm((current) => ({
        ...current,

        materialRequirements:
          current.materialRequirements.map(
            (
              row,
              rowIndex
            ) => {
              if (
                rowIndex !==
                index
              ) {
                return row;
              }

              if (
                field !==
                "item"
              ) {
                return {
                  ...row,

                  [field]:
                    value,
                };
              }

              const item =
                itemMap.get(
                  String(value)
                );

              return {
                ...row,

                item: value,

                itemCode:
                  item?.code ||
                  "",

                itemName:
                  item?.name ||
                  "",

                unit:
                  item?.unit ||
                  "Pcs",

                rate:
                  item
                    ?.purchasePrice ??
                  row.rate ??
                  "",
              };
            }
          ),
      }));
    };

    const removeMaterial = (
      index
    ) =>
      setForm((current) => ({
        ...current,

        materialRequirements:
          current.materialRequirements.filter(
            (
              _,
              rowIndex
            ) =>
              rowIndex !== index
          ),
      }));

    const validateJob = () => {
      if (
        form.sourceType ===
        "Sales Order"
      ) {
        if (
          !form.salesOrder
        ) {
          alert(
            "Please select a Sales Order"
          );

          return false;
        }

        const selections =
          form
            .productionSelections ||
          [];

        if (
          selections.length === 0
        ) {
          alert(
            "Select at least one Sales Order item"
          );

          return false;
        }

        if (
          editId &&
          selections.length !== 1
        ) {
          alert(
            "Only one Sales Order item can be selected while editing a production job"
          );

          return false;
        }

        for (
          const selection of
          selections
        ) {
          if (
            !selection
              .salesOrderItemId ||
            !selection
              .finishedGoodItem
          ) {
            alert(
              "One selected Sales Order item is invalid"
            );

            return false;
          }

          if (
            !String(
              selection.jobName ||
              ""
            ).trim()
          ) {
            alert(
              "Job name is required for every selected item"
            );

            return false;
          }

          const targetQty =
            num(
              selection.targetQty
            );

          if (
            targetQty <= 0
          ) {
            alert(
              `${selection.finishedGoodName || "Selected item"}: target quantity must be greater than zero`
            );

            return false;
          }

          if (
            targetQty >
            num(
              selection
                .remainingProductionQty
            )
          ) {
            alert(
              `${selection.finishedGoodName || "Selected item"}: target quantity cannot exceed available quantity ${qty(
                selection
                  .remainingProductionQty
              )} ${
                selection.unit ||
                "Pcs"
              }`
            );

            return false;
          }
        }

        if (
          selections.length > 1 &&
          form
            .materialRequirements
            .length > 0
        ) {
          alert(
            "Multiple production jobs use separate material requirements. Remove the material rows, create the jobs, then add materials to each job separately."
          );

          return false;
        }
      } else {
        if (
          !form.jobName.trim()
        ) {
          alert(
            "Job name is required"
          );

          return false;
        }

        if (
          !form.finishedGoodItem
        ) {
          alert(
            "Please select a finished good item"
          );

          return false;
        }

        if (
          num(
            form.targetQty
          ) <= 0
        ) {
          alert(
            "Target quantity must be greater than zero"
          );

          return false;
        }
      }

      if (!form.jobDate) {
        alert(
          "Job date is required"
        );

        return false;
      }

      if (
        form.dueDate &&
        form.dueDate <
          form.jobDate
      ) {
        alert(
          "Due date cannot be earlier than job date"
        );

        return false;
      }

      if (
        !form.customerName.trim()
      ) {
        alert(
          "Customer name is required"
        );

        return false;
      }

      const materialIds =
        form.materialRequirements
          .map(
            (row) =>
              row.item
          )
          .filter(Boolean);

      if (
        new Set(materialIds)
          .size !==
        materialIds.length
      ) {
        alert(
          "The same material cannot be added more than once"
        );

        return false;
      }

      for (
        const row of
        form.materialRequirements
      ) {
        if (!row.item) {
          alert(
            "Select an item for every material line"
          );

          return false;
        }

        if (
          num(
            row.requiredQty
          ) <= 0
        ) {
          alert(
            `Required quantity for ${row.itemName || "material"} must be greater than zero`
          );

          return false;
        }
      }

      return true;
    };

    const materialPayload =
      () =>
        form
          .materialRequirements
          .map(
            (row) => ({
              _id:
                row._id,

              item:
                row.item,

              requiredQty:
                num(
                  row.requiredQty
                ),

              issuedQty:
                num(
                  row.issuedQty
                ),

              returnedQty:
                num(
                  row.returnedQty
                ),

              wastageQty:
                num(
                  row.wastageQty
                ),

              unit:
                row.unit,

              rate:
                num(
                  row.rate
                ),

              remarks:
                String(
                  row.remarks ||
                  ""
                ).trim(),
            })
          );

    const commonJobPayload =
      () => ({
        sourceType:
          form.sourceType,

        salesOrder:
          form.sourceType ===
          "Sales Order"
            ? form.salesOrder
            : null,

        salesOrderNo:
          form.sourceType ===
          "Sales Order"
            ? form.salesOrderNo
            : "",

        internalReference:
          form.sourceType ===
          "Internal Requirement"
            ? form
                .internalReference
                .trim()
            : "",

        customer:
          form.customer ||
          null,

        customerName:
          form
            .customerName
            .trim(),

        customerPO:
          form.customerPO.trim(),

        jobDate:
          form.jobDate,

        dueDate:
          form.dueDate,

        priority:
          form.priority,

        paperType:
          form.paperType.trim(),

        gsm:
          num(
            form.gsm
          ),

        sheetSize:
          form.sheetSize.trim(),

        finishedSize:
          form.finishedSize.trim(),

        totalSheets:
          num(
            form.totalSheets
          ),

        noOfColors:
          form.noOfColors.trim(),

        dieNo:
          form.dieNo.trim(),

        instructions:
          form.instructions.trim(),

        remarks:
          form.remarks.trim(),
      });

    const singleJobPayload =
      () => {
        const selection =
          form.sourceType ===
          "Sales Order"
            ? (
                form
                  .productionSelections ||
                []
              )[0]
            : null;

        return {
          ...commonJobPayload(),

          jobNo:
            form.jobNo,

          jobName:
            selection
              ? String(
                  selection.jobName ||
                  ""
                ).trim()
              : form.jobName.trim(),

          salesOrderItemId:
            selection
              ? selection
                  .salesOrderItemId
              : null,

          finishedGoodItem:
            selection
              ? selection
                  .finishedGoodItem
              : form.finishedGoodItem,

          targetQty:
            selection
              ? num(
                  selection.targetQty
                )
              : num(
                  form.targetQty
                ),

          unit:
            selection
              ? selection.unit
              : form.unit,

          finishedSize:
            selection
              ?.orderSize ||
            form.finishedSize.trim(),

          materialRequirements:
            materialPayload(),
        };
      };

    const bulkSalesOrderPayload =
      () => {
        const selections =
          form
            .productionSelections ||
          [];

        return {
          ...commonJobPayload(),

          sourceType:
            "Sales Order",

          salesOrder:
            form.salesOrder,

          items:
            selections.map(
              (selection) => ({
                salesOrderItemId:
                  selection
                    .salesOrderItemId,

                jobName:
                  String(
                    selection.jobName ||
                    selection
                      .orderDescription ||
                    selection
                      .finishedGoodName ||
                    ""
                  ).trim(),

                finishedGoodItem:
                  selection
                    .finishedGoodItem,

                targetQty:
                  num(
                    selection.targetQty
                  ),

                unit:
                  selection.unit,

                finishedSize:
                  selection
                    .orderSize ||
                  form.finishedSize.trim(),

                remarks:
                  selection.remarks ||
                  form.remarks.trim(),

                materialRequirements:
                  selections.length ===
                  1
                    ? materialPayload()
                    : [],
              })
            ),
        };
      };

    const saveJob =
      async (event) => {
        event.preventDefault();

        if (!validateJob()) {
          return;
        }

        try {
          setSaving(true);

          if (editId) {
            await apiRequest(
              `${API_JOBS}/update/${editId}`,
              {
                method: "PUT",

                body:
                  JSON.stringify(
                    singleJobPayload()
                  ),
              }
            );
          } else if (
            form.sourceType ===
            "Sales Order"
          ) {
            const response =
              await apiRequest(
                `${API_JOBS}/add-bulk`,
                {
                  method: "POST",

                  body:
                    JSON.stringify(
                      bulkSalesOrderPayload()
                    ),
                }
              );

            const createdCount =
              num(
                response.createdCount ??
                response.data
                  ?.length ??
                form
                  .productionSelections
                  .length
              );

            alert(
              `${createdCount} production job${
                createdCount === 1
                  ? ""
                  : "s"
              } created successfully`
            );
          } else {
            await apiRequest(
              `${API_JOBS}/add`,
              {
                method: "POST",

                body:
                  JSON.stringify(
                    singleJobPayload()
                  ),
              }
            );
          }

          await fetchData();

          closeForm();
        } catch (error) {
          alert(
            error.message ||
              "Unable to save production job"
          );
        } finally {
          setSaving(false);
        }
      };

    const updateStatus =
      async (
        job,
        status
      ) => {
        if (
          !window.confirm(
            `Change ${job.jobNo || job.code} to ${status}?`
          )
        ) {
          return;
        }

        try {
          setActionId(
            job._id
          );

          await apiRequest(
            `${API_JOBS}/status/${job._id}`,
            {
              method:
                "PATCH",

              body:
                JSON.stringify({
                  status,
                }),
            }
          );

          await fetchData();
        } catch (error) {
          alert(
            error.message ||
              "Unable to update status"
          );
        } finally {
          setActionId("");
        }
      };

    const deleteJob =
      async (job) => {
        if (
          !window.confirm(
            `Delete ${job.jobNo || job.code}?`
          )
        ) {
          return;
        }

        try {
          setActionId(
            job._id
          );

          await apiRequest(
            `${API_JOBS}/delete/${job._id}`,
            {
              method:
                "DELETE",
            }
          );

          await fetchData();
        } catch (error) {
          alert(
            error.message ||
              "Unable to delete production job"
          );
        } finally {
          setActionId("");
        }
      };

    const openIssue =
      async (job) => {
        const pendingRows =
          (
            job.materialRequirements ||
            []
          )
            .map((row) => {
              const itemId =
                idOf(row.item);

              const pendingQty =
                Math.max(
                  num(
                    row.requiredQty
                  ) -
                    num(
                      row.issuedQty
                    ),
                  0
                );

              return {
                materialRequirementId:
                  row._id,

                item:
                  itemId,

                itemCode:
                  row.itemCode ||
                  row.item?.code ||
                  "",

                itemName:
                  row.itemName ||
                  row.item?.name ||
                  "",

                requiredQty:
                  num(
                    row.requiredQty
                  ),

                issuedQty:
                  num(
                    row.issuedQty
                  ),

                pendingQty,

                availableQty:
                  stockMap.get(
                    itemId
                  ) || 0,

                issueQty: "",

                unit:
                  row.unit ||
                  row.item?.unit ||
                  "Pcs",

                remarks: "",
              };
            })
            .filter(
              (row) =>
                row.pendingQty >
                0
            );

        if (
          !pendingRows.length
        ) {
          alert(
            "All required materials have already been issued"
          );

          return;
        }

        try {
          const next =
            await apiRequest(
              `${API_MATERIAL_ISSUES}/next-no`
            );

          setIssueModal({
            job,

            issueNo:
              next.issueNo ||
              "",

            issueDate:
              todayDate(),

            issuedBy: "",

            receivedBy: "",

            remarks: "",

            items:
              pendingRows,
          });
        } catch (error) {
          alert(
            error.message ||
              "Unable to prepare material issue"
          );
        }
      };

    const changeIssueRow = (
      index,
      field,
      value
    ) => {
      setIssueModal(
        (current) => ({
          ...current,

          items:
            current.items.map(
              (
                row,
                rowIndex
              ) =>
                rowIndex ===
                index
                  ? {
                      ...row,

                      [field]:
                        value,
                    }
                  : row
            ),
        })
      );
    };

    const postMaterialIssue =
      async () => {
        const selected =
          issueModal.items.filter(
            (row) =>
              num(
                row.issueQty
              ) > 0
          );

        if (
          !selected.length
        ) {
          alert(
            "Enter issue quantity for at least one material"
          );

          return;
        }

        for (
          const row of
          selected
        ) {
          if (
            num(
              row.issueQty
            ) >
            row.pendingQty
          ) {
            alert(
              `${row.itemName}: issue quantity exceeds pending requirement`
            );

            return;
          }

          if (
            num(
              row.issueQty
            ) >
            row.availableQty
          ) {
            alert(
              `${row.itemName}: available stock is only ${qty(row.availableQty)} ${row.unit}`
            );

            return;
          }
        }

        try {
          setSaving(true);

          await apiRequest(
            `${API_MATERIAL_ISSUES}/create-and-post`,
            {
              method: "POST",

              body:
                JSON.stringify({
                  issueNo:
                    issueModal.issueNo,

                  productionJob:
                    issueModal.job
                      ._id,

                  issueDate:
                    issueModal.issueDate,

                  issuedBy:
                    issueModal.issuedBy,

                  receivedBy:
                    issueModal.receivedBy,

                  remarks:
                    issueModal.remarks,

                  items:
                    selected.map(
                      (row) => ({
                        materialRequirementId:
                          row.materialRequirementId,

                        issueQty:
                          num(
                            row.issueQty
                          ),

                        remarks:
                          row.remarks,
                      })
                    ),
                }),
            }
          );

          setIssueModal(null);

          await fetchData();
        } catch (error) {
          alert(
            error.message ||
              "Unable to post material issue"
          );
        } finally {
          setSaving(false);
        }
      };

    const filteredJobs =
      useMemo(() => {
        const keyword =
          search
            .trim()
            .toLowerCase();

        return jobs.filter(
          (job) => {
            const searchable =
              [
                job.jobNo ||
                  job.code,

                job.jobName ||
                  job.name,

                job.customerName,

                job.salesOrderNo,

                job.finishedGoodCode,

                job.finishedGoodName,

                job.orderDescription,

                job.orderSize,

                job.salesOrderReferenceNo,

                job
                  .finishedGoodItem
                  ?.code,

                job
                  .finishedGoodItem
                  ?.name,
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return (
              (!keyword ||
                searchable.includes(
                  keyword
                )) &&

              (statusFilter ===
                "All" ||
                job.status ===
                  statusFilter) &&

              (sourceFilter ===
                "All" ||
                job.sourceType ===
                  sourceFilter)
            );
          }
        );
      }, [
        jobs,
        search,
        statusFilter,
        sourceFilter,
      ]);

    const stats =
      useMemo(
        () => ({
          total:
            jobs.length,

          draft:
            jobs.filter(
              (job) =>
                job.status ===
                "Draft"
            ).length,

          approved:
            jobs.filter(
              (job) =>
                job.status ===
                "Approved"
            ).length,

          active:
            jobs.filter(
              (job) =>
                [
                  "Material Issued",
                  "In Printing",
                  "Quality Check",
                ].includes(
                  job.status
                )
            ).length,

          completed:
            jobs.filter(
              (job) =>
                [
                  "Completed",
                  "Closed",
                ].includes(
                  job.status
                )
            ).length,
        }),
        [jobs]
      );

    const canEdit = (
      job
    ) =>
      [
        "Draft",
        "Approved",
      ].includes(job.status) &&
      !job.materialIssuePosted;

    const canDelete = (
      job
    ) =>
      [
        "Draft",
        "Cancelled",
      ].includes(job.status) &&
      !job.materialIssuePosted &&
      !job.productionOutputPosted;

    const canIssue = (
      job
    ) =>
      [
        "Approved",
        "Material Issued",
      ].includes(job.status) &&
      (
        job.materialRequirements ||
        []
      ).some(
        (row) =>
          num(
            row.requiredQty
          ) >
          num(
            row.issuedQty
          )
      );

    const productionAvailableQty = (
      row
    ) =>
      num(
        row
          .remainingProductionQty
      ) +
      (
        editId &&
        String(
          form.salesOrderItemId
        ) ===
          String(
            row.salesOrderItemId
          )
          ? num(
              form
                .existingTargetQty
            )
          : 0
      );

    return (
      <div className="mx-auto max-w-[1500px] space-y-5 p-3 sm:p-5 md:p-7">
        {viewJob && (
          <JobDetails
            job={viewJob}
            onClose={() =>
              setViewJob(null)
            }
          />
        )}

        {issueModal && (
          <MaterialIssueModal
            data={issueModal}
            saving={saving}
            onClose={() =>
              setIssueModal(null)
            }
            onChange={(
              field,
              value
            ) =>
              setIssueModal(
                (current) => ({
                  ...current,

                  [field]:
                    value,
                })
              )
            }
            onRowChange={
              changeIssueRow
            }
            onPost={
              postMaterialIssue
            }
          />
        )}

        {!formOpen ? (
          <>
            <div className="flex flex-col gap-4 rounded-xl bg-blue-700 px-5 py-5 text-white shadow-sm lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="flex items-center gap-2 text-xl font-bold">
                  <ClipboardDocumentCheckIcon className="h-6 w-6" />

                  Production Jobs
                </h1>

                <p className="mt-1 text-sm text-blue-100">
                  Plan finished goods, raw material requirements, and printing production.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={
                    fetchData
                  }
                  disabled={
                    loading
                  }
                  className="flex items-center justify-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-semibold hover:bg-white/20 disabled:opacity-60"
                >
                  <ArrowPathIcon
                    className={`h-5 w-5 ${
                      loading
                        ? "animate-spin"
                        : ""
                    }`}
                  />

                  Refresh
                </button>

                <button
                  type="button"
                  onClick={() =>
                    openForm()
                  }
                  className="flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-50"
                >
                  <PlusIcon className="h-5 w-5" />

                  New Production Job
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <Stat
                label="Total Jobs"
                value={
                  stats.total
                }
              />

              <Stat
                label="Draft"
                value={
                  stats.draft
                }
              />

              <Stat
                label="Approved"
                value={
                  stats.approved
                }
              />

              <Stat
                label="In Production"
                value={
                  stats.active
                }
              />

              <Stat
                label="Completed"
                value={
                  stats.completed
                }
              />
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b bg-slate-50/60 p-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h2 className="font-bold text-slate-800">
                    Production Job Register
                  </h2>

                  <p className="text-xs text-slate-500">
                    Approve a Draft job before issuing material.
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />

                    <input
                      value={
                        search
                      }
                      onChange={(
                        event
                      ) =>
                        setSearch(
                          event
                            .target
                            .value
                        )
                      }
                      placeholder="Search job, customer, item, or order..."
                      className="w-full rounded-lg border py-2 pl-10 pr-3 text-sm outline-none focus:border-blue-500 sm:w-80"
                    />
                  </div>

                  <select
                    value={
                      statusFilter
                    }
                    onChange={(
                      event
                    ) =>
                      setStatusFilter(
                        event
                          .target
                          .value
                      )
                    }
                    className="rounded-lg border px-3 py-2 text-sm"
                  >
                    {[
                      "All",
                      "Draft",
                      "Approved",
                      "Material Issued",
                      "In Printing",
                      "Quality Check",
                      "Completed",
                      "Closed",
                      "Cancelled",
                    ].map(
                      (value) => (
                        <option
                          key={
                            value
                          }
                          value={
                            value
                          }
                        >
                          {value ===
                          "All"
                            ? "All Statuses"
                            : value}
                        </option>
                      )
                    )}
                  </select>

                  <select
                    value={
                      sourceFilter
                    }
                    onChange={(
                      event
                    ) =>
                      setSourceFilter(
                        event
                          .target
                          .value
                      )
                    }
                    className="rounded-lg border px-3 py-2 text-sm"
                  >
                    <option value="All">
                      All Sources
                    </option>

                    <option value="Sales Order">
                      Sales Order
                    </option>

                    <option value="Internal Requirement">
                      Internal Requirement
                    </option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1280px] text-left text-xs">
                  <thead className="bg-slate-800 uppercase text-white">
                    <tr>
                      <th className="p-4">
                        Job
                      </th>

                      <th className="p-4">
                        Source / Customer
                      </th>

                      <th className="p-4">
                        Finished Good
                      </th>

                      <th className="p-4 text-right">
                        Target
                      </th>

                      <th className="p-4">
                        Materials
                      </th>

                      <th className="p-4">
                        Dates
                      </th>

                      <th className="p-4 text-center">
                        Status
                      </th>

                      <th className="p-4 text-center">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {loading ? (
                      <tr>
                        <td
                          colSpan="8"
                          className="p-10 text-center text-slate-500"
                        >
                          Loading production jobs...
                        </td>
                      </tr>
                    ) : filteredJobs.length ===
                      0 ? (
                      <tr>
                        <td
                          colSpan="8"
                          className="p-10 text-center text-slate-400"
                        >
                          No production jobs found.
                        </td>
                      </tr>
                    ) : (
                      filteredJobs.map(
                        (job) => {
                          const busy =
                            actionId ===
                            job._id;

                          const materialCount =
                            (
                              job.materialRequirements ||
                              []
                            ).length;

                          const pendingCount =
                            (
                              job.materialRequirements ||
                              []
                            ).filter(
                              (
                                row
                              ) =>
                                num(
                                  row.requiredQty
                                ) >
                                num(
                                  row.issuedQty
                                )
                            ).length;

                          return (
                            <tr
                              key={
                                job._id
                              }
                              className="border-t hover:bg-slate-50"
                            >
                              <td className="p-4">
                                <div className="font-bold text-slate-900">
                                  {job.jobNo ||
                                    job.code}
                                </div>

                                <div className="mt-1 text-slate-600">
                                  {job.jobName ||
                                    job.name}
                                </div>

                                <span
                                  className={`mt-2 inline-flex rounded px-2 py-0.5 text-[10px] font-bold ${priorityClass(
                                    job.priority
                                  )}`}
                                >
                                  {job.priority ||
                                    "Normal"}
                                </span>
                              </td>

                              <td className="p-4">
                                <div className="font-semibold">
                                  {job.customerName ||
                                    "-"}
                                </div>

                                <div className="mt-1 text-[10px] text-slate-500">
                                  {job.sourceType ||
                                    "Internal Requirement"}
                                </div>

                                <div className="text-[10px] text-blue-600">
                                  {job.salesOrderNo ||
                                    job.internalReference ||
                                    ""}
                                </div>
                              </td>

                              <td className="p-4">
                                <div className="font-semibold">
                                  {job.finishedGoodName ||
                                    job
                                      .finishedGoodItem
                                      ?.name ||
                                    "-"}
                                </div>

                                <div className="mt-1 font-mono text-[10px] text-blue-600">
                                  {job.finishedGoodCode ||
                                    job
                                      .finishedGoodItem
                                      ?.code ||
                                    ""}
                                </div>

                                <div className="mt-1 text-[10px] text-slate-500">
                                  {job.orderSize ||
                                    job.finishedSize ||
                                    job.paperType ||
                                    "-"}

                                  {job.orderTextType
                                    ? ` · ${String(
                                        job.orderTextType
                                      ).replace(
                                        /-/g,
                                        " "
                                      )}`
                                    : num(
                                        job.gsm
                                      ) > 0
                                      ? ` · ${job.gsm} GSM`
                                      : ""}
                                </div>

                                {job.orderDescription && (
                                  <div className="mt-1 text-[10px] text-slate-500">
                                    {job.orderDescription}
                                  </div>
                                )}
                              </td>

                              <td className="p-4 text-right">
                                <div className="font-bold text-blue-700">
                                  {qty(
                                    job.targetQty ??
                                      job.quantity
                                  )}{" "}
                                  {job.unit}
                                </div>

                                <div className="mt-1 text-[10px] text-emerald-700">
                                  Prepared:{" "}
                                  {qty(
                                    job.productionOutputQty
                                  )}{" "}
                                  {job.unit}
                                </div>
                              </td>

                              <td className="p-4">
                                <div className="font-semibold">
                                  {materialCount}{" "}
                                  item(s)
                                </div>

                                <div className="mt-1 text-[10px] text-slate-500">
                                  Pending lines:{" "}
                                  {pendingCount}
                                </div>

                                <div className="text-[10px] text-slate-500">
                                  Issue posted:{" "}
                                  {job.materialIssuePosted
                                    ? "Yes"
                                    : "No"}
                                </div>
                              </td>

                              <td className="p-4">
                                <div>
                                  Job:{" "}
                                  {dateOnly(
                                    job.jobDate
                                  ) ||
                                    "-"}
                                </div>

                                <div className="mt-1 text-slate-500">
                                  Due:{" "}
                                  {dateOnly(
                                    job.dueDate
                                  ) ||
                                    "-"}
                                </div>
                              </td>

                              <td className="p-4 text-center">
                                <span
                                  className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-bold ${statusClass(
                                    job.status
                                  )}`}
                                >
                                  {job.status}
                                </span>
                              </td>

                              <td className="p-4">
                                <div className="flex flex-wrap justify-center gap-1.5">
                                  <IconButton
                                    title="View"
                                    onClick={() =>
                                      setViewJob(
                                        job
                                      )
                                    }
                                    color="blue"
                                  >
                                    <EyeIcon className="h-4 w-4" />
                                  </IconButton>

                                  {canEdit(
                                    job
                                  ) && (
                                    <IconButton
                                      title="Edit"
                                      onClick={() =>
                                        openForm(
                                          job
                                        )
                                      }
                                      color="cyan"
                                    >
                                      <PencilSquareIcon className="h-4 w-4" />
                                    </IconButton>
                                  )}

                                  {job.status ===
                                    "Draft" && (
                                    <IconButton
                                      title="Approve"
                                      disabled={
                                        busy
                                      }
                                      onClick={() =>
                                        updateStatus(
                                          job,
                                          "Approved"
                                        )
                                      }
                                      color="emerald"
                                    >
                                      <CheckCircleIcon className="h-4 w-4" />
                                    </IconButton>
                                  )}

                                  {canIssue(
                                    job
                                  ) && (
                                    <IconButton
                                      title="Issue Material"
                                      disabled={
                                        busy
                                      }
                                      onClick={() =>
                                        openIssue(
                                          job
                                        )
                                      }
                                      color="indigo"
                                    >
                                      <ArrowRightCircleIcon className="h-4 w-4" />
                                    </IconButton>
                                  )}

                                  {[
                                    "Draft",
                                    "Approved",
                                  ].includes(
                                    job.status
                                  ) && (
                                    <IconButton
                                      title="Cancel Job"
                                      disabled={
                                        busy
                                      }
                                      onClick={() =>
                                        updateStatus(
                                          job,
                                          "Cancelled"
                                        )
                                      }
                                      color="orange"
                                    >
                                      <XMarkIcon className="h-4 w-4" />
                                    </IconButton>
                                  )}

                                  {canDelete(
                                    job
                                  ) && (
                                    <IconButton
                                      title="Delete"
                                      disabled={
                                        busy
                                      }
                                      onClick={() =>
                                        deleteJob(
                                          job
                                        )
                                      }
                                      color="red"
                                    >
                                      <TrashIcon className="h-4 w-4" />
                                    </IconButton>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        }
                      )
                    )}
                  </tbody>
                </table>
              </div>

              <div className="border-t bg-blue-50 p-4 text-xs text-blue-800">
                Draft → Approved → Material Issue → Raw Material Warehouse Stock Out → Printing.
              </div>
            </div>
          </>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 bg-blue-700 px-5 py-4 text-white sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={
                    closeForm
                  }
                  className="rounded-lg p-2 hover:bg-blue-800"
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                </button>

                <div>
                  <h2 className="text-lg font-bold">
                    {editId
                      ? `Edit Production Job ${form.jobNo}`
                      : "New Production Job"}
                  </h2>

                  <p className="text-xs text-blue-100">
                    Define output, schedule, and raw material requirements.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={
                  closeForm
                }
                className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-semibold hover:bg-blue-900"
              >
                Back to List
              </button>
            </div>

            <form
              onSubmit={
                saveJob
              }
              className="space-y-7 p-5 md:p-7"
            >
              <Section title="1. Job Source and Customer">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Field label="Job Number">
                    <input
                      value={
                        form.jobNo
                      }
                      readOnly
                      className={`${inputClass} font-mono`}
                    />
                  </Field>

                  <Field
                    label="Source Type"
                    required
                  >
                    <select
                      value={
                        form.sourceType
                      }
                      onChange={(
                        event
                      ) =>
                        changeSource(
                          event
                            .target
                            .value
                        )
                      }
                      disabled={
                        Boolean(
                          editId
                        )
                      }
                      className={
                        inputClass
                      }
                    >
                      <option value="Internal Requirement">
                        Internal Requirement
                      </option>

                      <option value="Sales Order">
                        Sales Order
                      </option>
                    </select>
                  </Field>

                  {form.sourceType ===
                  "Sales Order" ? (
                    <Field
                      label="Sales Order"
                      required
                      wide
                    >
                      <select
                        value={
                          form.salesOrder
                        }
                        onChange={(
                          event
                        ) =>
                          selectSalesOrder(
                            event
                              .target
                              .value
                          )
                        }
                        disabled={
                          salesOrderLoading ||
                          Boolean(
                            editId
                          )
                        }
                        className={
                          inputClass
                        }
                      >
                        <option value="">
                          {salesOrderLoading
                            ? "Loading Sales Order..."
                            : "Select Sales Order"}
                        </option>

                        {salesOrders.map(
                          (
                            order
                          ) => (
                            <option
                              key={
                                order._id
                              }
                              value={
                                order._id
                              }
                            >
                              {order.salesOrderNo ||
                                order.orderNo ||
                                order.code ||
                                order._id}

                              {order.customerName
                                ? ` — ${order.customerName}`
                                : ""}

                              {num(
                                order.totalQuantity
                              ) > 0
                                ? ` — ${qty(
                                    order.totalQuantity
                                  )}`
                                : ""}
                            </option>
                          )
                        )}
                      </select>
                    </Field>
                  ) : (
                    <Field
                      label="Internal Reference"
                      wide
                    >
                      <input
                        value={
                          form.internalReference
                        }
                        onChange={(
                          event
                        ) =>
                          change(
                            "internalReference",
                            event
                              .target
                              .value
                          )
                        }
                        className={
                          inputClass
                        }
                        placeholder="e.g. Monthly stock requirement"
                      />
                    </Field>
                  )}

                  <Field
                    label="Customer Name"
                    required
                  >
                    <input
                      value={
                        form.customerName
                      }
                      readOnly
                      className={
                        inputClass
                      }
                    />
                  </Field>

                  <Field label="Customer PO">
                    <input
                      value={
                        form.customerPO
                      }
                      onChange={(
                        event
                      ) =>
                        change(
                          "customerPO",
                          event
                            .target
                            .value
                        )
                      }
                      readOnly={
                        form.sourceType ===
                        "Sales Order"
                      }
                      className={
                        inputClass
                      }
                    />
                  </Field>

                  <Field
                    label="Job Name"
                    required
                    wide
                  >
                    <input
                      value={
                        form.sourceType ===
                          "Sales Order" &&
                        (
                          form
                            .productionSelections ||
                          []
                        ).length > 1
                          ? `${form.productionSelections.length} Production Jobs`
                          : form.jobName
                      }
                      onChange={(
                        event
                      ) =>
                        form.sourceType ===
                          "Sales Order" &&
                        (
                          form
                            .productionSelections ||
                          []
                        ).length === 1
                          ? updateProductionSelection(
                              form
                                .productionSelections[0]
                                .salesOrderItemId,
                              "jobName",
                              event
                                .target
                                .value
                            )
                          : change(
                              "jobName",
                              event
                                .target
                                .value
                            )
                      }
                      readOnly={
                        form.sourceType ===
                          "Sales Order" &&
                        (
                          form
                            .productionSelections ||
                          []
                        ).length > 1
                      }
                      className={
                        inputClass
                      }
                      placeholder="e.g. Medicine Carton Printing"
                    />
                  </Field>
                </div>
              </Section>

              {form.sourceType ===
                "Sales Order" &&
                selectedSalesOrder && (
                <Section title="2. Sales Order Details — Production View">
                  <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Detail
                      label="Sales Order No"
                      value={
                        selectedSalesOrder.salesOrderNo
                      }
                    />

                    <Detail
                      label="Status"
                      value={
                        selectedSalesOrder.status
                      }
                    />

                    <Detail
                      label="Order Date"
                      value={
                        dateOnly(
                          selectedSalesOrder.orderDate
                        )
                      }
                    />

                    <Detail
                      label="Delivery Date"
                      value={
                        dateOnly(
                          selectedSalesOrder.deliveryDate
                        )
                      }
                    />

                    <Detail
                      label="Customer"
                      value={
                        selectedSalesOrder.customerName
                      }
                    />

                    <Detail
                      label="Phone"
                      value={
                        selectedSalesOrder.customerPhone
                      }
                    />

                    <Detail
                      label="Email"
                      value={
                        selectedSalesOrder.customerEmail
                      }
                    />

                    <Detail
                      label="City"
                      value={
                        selectedSalesOrder.customerCity
                      }
                    />

                    <Detail
                      label="Address"
                      value={
                        selectedSalesOrder.customerAddress
                      }
                    />

                    <Detail
                      label="Customer NTN"
                      value={
                        selectedSalesOrder.customerNTN
                      }
                    />

                    <Detail
                      label="Customer PO"
                      value={
                        selectedSalesOrder.poNo
                      }
                    />

                    <Detail
                      label="Reference No"
                      value={
                        selectedSalesOrder.referenceNo
                      }
                    />

                    <Detail
                      label="Total Cartons"
                      value={qty(
                        selectedSalesOrder.totalCartons
                      )}
                    />

                    <Detail
                      label="Total Quantity"
                      value={qty(
                        selectedSalesOrder.totalQuantity
                      )}
                    />

                    <Detail
                      label="Production Planned"
                      value={qty(
                        selectedSalesOrder
                          .totalPlannedProductionQty
                      )}
                    />

                    <Detail
                      label="Prepared Quantity"
                      value={qty(
                        selectedSalesOrder
                          .totalPreparedQty
                      )}
                    />
                  </div>

                  <div className="mb-3 flex flex-col gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      Tick every Sales Order item that should become a Production Job.
                    </span>

                    <strong>
                      Selected:{" "}
                      {
                        (
                          form
                            .productionSelections ||
                          []
                        ).length
                      }
                    </strong>
                  </div>

                  <div className="overflow-x-auto rounded-xl border">
                    <table className="w-full min-w-[1650px] text-xs">
                      <thead className="bg-slate-800 uppercase text-white">
                        <tr>
                          <th className="p-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <input
                                type="checkbox"
                                checked={
                                  !editId &&
                                  (
                                    selectedSalesOrder
                                      .items ||
                                    []
                                  ).filter(
                                    (row) =>
                                      productionAvailableQty(
                                        row
                                      ) > 0
                                  ).length >
                                    0 &&
                                  (
                                    selectedSalesOrder
                                      .items ||
                                    []
                                  )
                                    .filter(
                                      (row) =>
                                        productionAvailableQty(
                                          row
                                        ) > 0
                                    )
                                    .every(
                                      (row) =>
                                        (
                                          form
                                            .selectedSalesOrderItemIds ||
                                          []
                                        ).some(
                                          (value) =>
                                            String(
                                              value
                                            ) ===
                                            String(
                                              row
                                                .salesOrderItemId
                                            )
                                        )
                                    )
                                }
                                disabled={
                                  Boolean(
                                    editId
                                  )
                                }
                                onChange={
                                  toggleAllSalesOrderItems
                                }
                                className="h-4 w-4 accent-blue-600"
                              />

                              <span>
                                Select
                              </span>
                            </div>
                          </th>

                          <th className="p-3 text-left">
                            Finished Good
                          </th>

                          <th className="p-3 text-left">
                            Description
                          </th>

                          <th className="p-3 text-left">
                            Size
                          </th>

                          <th className="p-3 text-left">
                            Text Type
                          </th>

                          <th className="p-3 text-right">
                            Cartons
                          </th>

                          <th className="p-3 text-right">
                            Ordered
                          </th>

                          <th className="p-3 text-right">
                            Planned
                          </th>

                          <th className="p-3 text-right">
                            Prepared
                          </th>

                          <th className="p-3 text-right">
                            Available
                          </th>

                          <th className="p-3 text-right">
                            Production Qty
                          </th>

                          <th className="p-3 text-left">
                            Unit
                          </th>

                          <th className="p-3 text-left">
                            Remarks
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {(
                          selectedSalesOrder.items ||
                          []
                        ).map(
                          (row) => {
                            const availableQty =
                              productionAvailableQty(
                                row
                              );

                            const selected =
                              (
                                form
                                  .selectedSalesOrderItemIds ||
                                []
                              ).some(
                                (value) =>
                                  String(
                                    value
                                  ) ===
                                  String(
                                    row
                                      .salesOrderItemId
                                  )
                              );

                            const selection =
                              (
                                form
                                  .productionSelections ||
                                []
                              ).find(
                                (value) =>
                                  String(
                                    value
                                      .salesOrderItemId
                                  ) ===
                                  String(
                                    row
                                      .salesOrderItemId
                                  )
                              );

                            return (
                              <tr
                                key={
                                  row.salesOrderItemId
                                }
                                className={
                                  selected
                                    ? "border-t bg-blue-50"
                                    : "border-t hover:bg-slate-50"
                                }
                              >
                                <td className="p-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={
                                      selected
                                    }
                                    disabled={
                                      availableQty <=
                                        0 &&
                                      !selected
                                    }
                                    onChange={() =>
                                      selectSalesOrderItem(
                                        row.salesOrderItemId
                                      )
                                    }
                                    className="h-4 w-4 accent-blue-700"
                                  />
                                </td>

                                <td className="p-3">
                                  <div className="font-semibold text-slate-900">
                                    {row.itemName ||
                                      "-"}
                                  </div>

                                  <div className="font-mono text-[10px] text-blue-600">
                                    {row.itemCode ||
                                      ""}
                                  </div>
                                </td>

                                <td className="p-3">
                                  {row.description ||
                                    "-"}
                                </td>

                                <td className="p-3">
                                  {row.size ||
                                    "-"}
                                </td>

                                <td className="p-3">
                                  {row.textType
                                    ? row.textType.replace(
                                        /-/g,
                                        " "
                                      )
                                    : "-"}
                                </td>

                                <td className="p-3 text-right">
                                  {qty(
                                    row.cartons
                                  )}
                                </td>

                                <td className="p-3 text-right font-semibold">
                                  {qty(
                                    row.orderedQty
                                  )}
                                </td>

                                <td className="p-3 text-right">
                                  {qty(
                                    row
                                      .plannedProductionQty
                                  )}
                                </td>

                                <td className="p-3 text-right text-emerald-700">
                                  {qty(
                                    row.preparedQty
                                  )}
                                </td>

                                <td className="p-3 text-right font-bold text-blue-700">
                                  {qty(
                                    availableQty
                                  )}
                                </td>

                                <td className="p-3">
                                  {selected ? (
                                    <input
                                      type="number"
                                      min="0.000001"
                                      step="any"
                                      max={
                                        availableQty
                                      }
                                      value={
                                        selection
                                          ?.targetQty ||
                                        ""
                                      }
                                      onChange={(
                                        event
                                      ) =>
                                        updateProductionSelection(
                                          row
                                            .salesOrderItemId,
                                          "targetQty",
                                          event
                                            .target
                                            .value
                                        )
                                      }
                                      className="w-28 rounded border border-blue-300 bg-white px-2 py-1.5 text-right font-semibold outline-none focus:border-blue-600"
                                    />
                                  ) : (
                                    <span className="text-slate-400">
                                      —
                                    </span>
                                  )}
                                </td>

                                <td className="p-3">
                                  {row.unit ||
                                    "Pcs"}
                                </td>

                                <td className="p-3">
                                  {row.remarks ||
                                    "-"}
                                </td>
                              </tr>
                            );
                          }
                        )}

                        {!(
                          selectedSalesOrder.items ||
                          []
                        ).length && (
                          <tr>
                            <td
                              colSpan="13"
                              className="p-8 text-center text-slate-400"
                            >
                              No Sales Order items are available for production.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <p className="mt-3 text-xs text-slate-500">
                    Production view intentionally excludes selling price, amounts, tax type, tax rate, sales tax, and grand total.
                  </p>
                </Section>
              )}

              <Section
                title={
                  form.sourceType ===
                  "Sales Order"
                    ? "3. Finished Good and Schedule"
                    : "2. Finished Good and Schedule"
                }
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Field
                    label="Finished Good Item"
                    required
                    wide
                  >
                    {form.sourceType ===
                    "Sales Order" ? (
                      <input
                        value={
                          (
                            form
                              .productionSelections ||
                            []
                          ).length > 1
                            ? `${form.productionSelections.length} Finished Goods Selected`
                            : form.finishedGoodItem
                              ? `${form.finishedGoodCode || ""}${
                                  form.finishedGoodCode
                                    ? " — "
                                    : ""
                                }${form.finishedGoodName || ""}`
                              : ""
                        }
                        readOnly
                        className={
                          inputClass
                        }
                        placeholder="Select a Sales Order item above"
                      />
                    ) : (
                      <select
                        value={
                          form.finishedGoodItem
                        }
                        onChange={(
                          event
                        ) =>
                          selectFinishedGood(
                            event
                              .target
                              .value
                          )
                        }
                        className={
                          inputClass
                        }
                      >
                        <option value="">
                          Select Finished Good
                        </option>

                        {finishedGoods.map(
                          (item) => (
                            <option
                              key={
                                item._id
                              }
                              value={
                                item._id
                              }
                            >
                              {item.code} —{" "}
                              {item.name}
                            </option>
                          )
                        )}
                      </select>
                    )}
                  </Field>

                  <Field
                    label="Target Quantity"
                    required
                  >
                    <div>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        max={
                          form.sourceType ===
                          "Sales Order"
                            ? form
                                .remainingProductionQty ||
                              undefined
                            : undefined
                        }
                        value={
                          form.targetQty
                        }
                        onChange={(
                          event
                        ) =>
                          form.sourceType ===
                            "Sales Order" &&
                          (
                            form
                              .productionSelections ||
                            []
                          ).length === 1
                            ? updateProductionSelection(
                                form
                                  .productionSelections[0]
                                  .salesOrderItemId,
                                "targetQty",
                                event
                                  .target
                                  .value
                              )
                            : (
                                form
                                  .productionSelections ||
                                []
                              ).length > 1
                              ? undefined
                              : change(
                                  "targetQty",
                                  event
                                    .target
                                    .value
                                )
                        }
                        readOnly={
                          form.sourceType ===
                            "Sales Order" &&
                          (
                            form
                              .productionSelections ||
                            []
                          ).length > 1
                        }
                        className={
                          inputClass
                        }
                      />

                      {form.sourceType ===
                        "Sales Order" &&
                        form.salesOrderItemId && (
                          <p className="mt-1 text-[10px] text-slate-500">
                            Ordered:{" "}
                            {qty(
                              form.orderedQty
                            )}{" "}
                            {form.unit} · Planned:{" "}
                            {qty(
                              form
                                .plannedProductionQty
                            )}{" "}
                            {form.unit} · Available:{" "}
                            {qty(
                              form
                                .remainingProductionQty
                            )}{" "}
                            {form.unit}
                          </p>
                        )}
                    </div>
                  </Field>

                  <Field label="Unit">
                    <input
                      value={
                        form.unit
                      }
                      onChange={(
                        event
                      ) =>
                        change(
                          "unit",
                          event
                            .target
                            .value
                        )
                      }
                      readOnly={
                        form.sourceType ===
                        "Sales Order"
                      }
                      className={
                        inputClass
                      }
                    />
                  </Field>

                  <Field
                    label="Job Date"
                    required
                  >
                    <input
                      type="date"
                      value={
                        form.jobDate
                      }
                      onChange={(
                        event
                      ) =>
                        change(
                          "jobDate",
                          event
                            .target
                            .value
                        )
                      }
                      className={
                        inputClass
                      }
                    />
                  </Field>

                  <Field label="Due Date">
                    <input
                      type="date"
                      value={
                        form.dueDate
                      }
                      onChange={(
                        event
                      ) =>
                        change(
                          "dueDate",
                          event
                            .target
                            .value
                        )
                      }
                      className={
                        inputClass
                      }
                    />
                  </Field>

                  <Field label="Priority">
                    <select
                      value={
                        form.priority
                      }
                      onChange={(
                        event
                      ) =>
                        change(
                          "priority",
                          event
                            .target
                            .value
                        )
                      }
                      className={
                        inputClass
                      }
                    >
                      <option value="Normal">
                        Normal
                      </option>

                      <option value="High">
                        High
                      </option>

                      <option value="Urgent">
                        Urgent
                      </option>
                    </select>
                  </Field>

                  {form.sourceType ===
                    "Sales Order" &&
                    (
                      form
                        .productionSelections ||
                      []
                    ).length === 1 && (
                      <>
                        <Field label="Order Description">
                          <input
                            value={
                              form.orderDescription
                            }
                            readOnly
                            className={
                              inputClass
                            }
                          />
                        </Field>

                        <Field label="Order Size">
                          <input
                            value={
                              form.orderSize
                            }
                            readOnly
                            className={
                              inputClass
                            }
                          />
                        </Field>

                        <Field label="Text Type">
                          <input
                            value={
                              form.orderTextType
                                ? form.orderTextType.replace(
                                    /-/g,
                                    " "
                                  )
                                : ""
                            }
                            readOnly
                            className={
                              inputClass
                            }
                          />
                        </Field>

                        <Field label="Order Cartons">
                          <input
                            value={
                              form.orderCartons
                            }
                            readOnly
                            className={
                              inputClass
                            }
                          />
                        </Field>

                        <Field label="Prepared Quantity">
                          <input
                            value={`${qty(
                              form.preparedQty
                            )} ${
                              form.unit ||
                              ""
                            }`}
                            readOnly
                            className={
                              inputClass
                            }
                          />
                        </Field>
                      </>
                    )}
                </div>
              </Section>

              <Section title="4. Printing Specifications">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Field label="Paper Type">
                    <input
                      value={
                        form.paperType
                      }
                      onChange={(
                        event
                      ) =>
                        change(
                          "paperType",
                          event
                            .target
                            .value
                        )
                      }
                      className={
                        inputClass
                      }
                    />
                  </Field>

                  <Field label="GSM">
                    <input
                      type="number"
                      min="0"
                      value={
                        form.gsm
                      }
                      onChange={(
                        event
                      ) =>
                        change(
                          "gsm",
                          event
                            .target
                            .value
                        )
                      }
                      className={
                        inputClass
                      }
                    />
                  </Field>

                  <Field label="Open Sheet Size">
                    <input
                      value={
                        form.sheetSize
                      }
                      onChange={(
                        event
                      ) =>
                        change(
                          "sheetSize",
                          event
                            .target
                            .value
                        )
                      }
                      className={
                        inputClass
                      }
                    />
                  </Field>

                  <Field label="Finished Size">
                    <input
                      value={
                        form.finishedSize
                      }
                      onChange={(
                        event
                      ) =>
                        change(
                          "finishedSize",
                          event
                            .target
                            .value
                        )
                      }
                      className={
                        inputClass
                      }
                    />
                  </Field>

                  <Field label="Allocated Sheets">
                    <input
                      type="number"
                      min="0"
                      value={
                        form.totalSheets
                      }
                      onChange={(
                        event
                      ) =>
                        change(
                          "totalSheets",
                          event
                            .target
                            .value
                        )
                      }
                      className={
                        inputClass
                      }
                    />
                  </Field>

                  <Field label="Number of Colours">
                    <input
                      value={
                        form.noOfColors
                      }
                      onChange={(
                        event
                      ) =>
                        change(
                          "noOfColors",
                          event
                            .target
                            .value
                        )
                      }
                      className={
                        inputClass
                      }
                    />
                  </Field>

                  <Field label="Die / Plate Number">
                    <input
                      value={
                        form.dieNo
                      }
                      onChange={(
                        event
                      ) =>
                        change(
                          "dieNo",
                          event
                            .target
                            .value
                        )
                      }
                      className={
                        inputClass
                      }
                    />
                  </Field>
                </div>
              </Section>

              <Section title="5. Material Requirements">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-slate-500">
                    Add every material required before printing starts.
                  </p>

                  <button
                    type="button"
                    onClick={
                      addMaterial
                    }
                    className="flex items-center justify-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:bg-slate-900"
                  >
                    <PlusIcon className="h-4 w-4" />

                    Add Material
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border">
                  <table className="w-full min-w-[1100px] text-xs">
                    <thead className="bg-slate-50 uppercase text-slate-500">
                      <tr>
                        <th className="p-3 text-left">
                          Material
                        </th>

                        <th className="p-3 text-right">
                          Available
                        </th>

                        <th className="p-3 text-right">
                          Required
                        </th>

                        <th className="p-3 text-left">
                          Unit
                        </th>

                        <th className="p-3 text-right">
                          Rate
                        </th>

                        <th className="p-3 text-left">
                          Remarks
                        </th>

                        <th className="p-3 text-center">
                          Remove
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {form.materialRequirements.map(
                        (
                          row,
                          index
                        ) => (
                          <tr
                            key={
                              row._id ||
                              `row-${index}`
                            }
                            className="border-t"
                          >
                            <td className="p-3">
                              <select
                                value={
                                  row.item
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateMaterial(
                                    index,
                                    "item",
                                    event
                                      .target
                                      .value
                                  )
                                }
                                className={`${inputClass} min-w-[250px]`}
                              >
                                <option value="">
                                  Select Material
                                </option>

                                {rawMaterials.map(
                                  (
                                    item
                                  ) => (
                                    <option
                                      key={
                                        item._id
                                      }
                                      value={
                                        item._id
                                      }
                                    >
                                      {
                                        item.code
                                      }{" "}
                                      —{" "}
                                      {
                                        item.name
                                      }
                                    </option>
                                  )
                                )}
                              </select>
                            </td>

                            <td className="p-3 text-right font-bold text-blue-700">
                              {qty(
                                stockMap.get(
                                  String(
                                    row.item
                                  )
                                ) ||
                                  0
                              )}{" "}
                              {row.unit}
                            </td>

                            <td className="p-3">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={
                                  row.requiredQty
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateMaterial(
                                    index,
                                    "requiredQty",
                                    event
                                      .target
                                      .value
                                  )
                                }
                                className={`${inputClass} min-w-[130px] text-right`}
                              />
                            </td>

                            <td className="p-3">
                              <input
                                value={
                                  row.unit
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateMaterial(
                                    index,
                                    "unit",
                                    event
                                      .target
                                      .value
                                  )
                                }
                                className={`${inputClass} min-w-[90px]`}
                              />
                            </td>

                            <td className="p-3">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={
                                  row.rate
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateMaterial(
                                    index,
                                    "rate",
                                    event
                                      .target
                                      .value
                                  )
                                }
                                className={`${inputClass} min-w-[120px] text-right`}
                              />
                            </td>

                            <td className="p-3">
                              <input
                                value={
                                  row.remarks
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateMaterial(
                                    index,
                                    "remarks",
                                    event
                                      .target
                                      .value
                                  )
                                }
                                className={`${inputClass} min-w-[200px]`}
                              />
                            </td>

                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() =>
                                  removeMaterial(
                                    index
                                  )
                                }
                                disabled={
                                  num(
                                    row.issuedQty
                                  ) > 0
                                }
                                className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        )
                      )}

                      {!form
                        .materialRequirements
                        .length && (
                        <tr>
                          <td
                            colSpan="7"
                            className="p-8 text-center text-slate-400"
                          >
                            No materials added. Draft can be saved, but material is required before approval.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Section>

              <Section title="6. Instructions and Remarks">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <Field label="Production Instructions">
                    <textarea
                      rows="4"
                      value={
                        form.instructions
                      }
                      onChange={(
                        event
                      ) =>
                        change(
                          "instructions",
                          event
                            .target
                            .value
                        )
                      }
                      className={`${inputClass} min-h-[110px]`}
                    />
                  </Field>

                  <Field label="Internal Remarks">
                    <textarea
                      rows="4"
                      value={
                        form.remarks
                      }
                      onChange={(
                        event
                      ) =>
                        change(
                          "remarks",
                          event
                            .target
                            .value
                        )
                      }
                      className={`${inputClass} min-h-[110px]`}
                    />
                  </Field>
                </div>
              </Section>

              <div className="flex flex-col justify-end gap-3 border-t pt-5 sm:flex-row">
                <button
                  type="button"
                  onClick={
                    closeForm
                  }
                  className="rounded-lg border px-6 py-2.5 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    saving
                  }
                  className="flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-7 py-2.5 font-bold text-white hover:bg-blue-800 disabled:opacity-60"
                >
                  {saving && (
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                  )}

                  {saving
                    ? "Saving..."
                    : editId
                      ? "Update Job"
                      : form.sourceType ===
                          "Sales Order" &&
                        (
                          form
                            .productionSelections ||
                          []
                        ).length > 1
                        ? `Create ${form.productionSelections.length} Draft Jobs`
                        : "Save Draft Job"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  };

const MaterialIssueModal = ({
  data,
  saving,
  onClose,
  onChange,
  onRowChange,
  onPost,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
    <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white shadow-xl">
      <div className="sticky top-0 z-10 flex items-center justify-between bg-indigo-700 px-5 py-4 text-white">
        <div>
          <h2 className="text-lg font-bold">
            Issue Material —{" "}
            {data.job.jobNo}
          </h2>

          <p className="text-xs text-indigo-100">
            Posting will create Production Issue stock-out entries.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 hover:bg-indigo-800"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-5 p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Issue Number">
            <input
              value={
                data.issueNo
              }
              readOnly
              className={`${inputClass} font-mono`}
            />
          </Field>

          <Field label="Issue Date">
            <input
              type="date"
              value={
                data.issueDate
              }
              onChange={(
                event
              ) =>
                onChange(
                  "issueDate",
                  event.target
                    .value
                )
              }
              className={
                inputClass
              }
            />
          </Field>

          <Field label="Issued By">
            <input
              value={
                data.issuedBy
              }
              onChange={(
                event
              ) =>
                onChange(
                  "issuedBy",
                  event.target
                    .value
                )
              }
              className={
                inputClass
              }
              placeholder="Store keeper"
            />
          </Field>

          <Field label="Received By">
            <input
              value={
                data.receivedBy
              }
              onChange={(
                event
              ) =>
                onChange(
                  "receivedBy",
                  event.target
                    .value
                )
              }
              className={
                inputClass
              }
              placeholder="Printing operator"
            />
          </Field>
        </div>

        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[1050px] text-xs">
            <thead className="bg-slate-50 uppercase text-slate-500">
              <tr>
                <th className="p-3 text-left">
                  Material
                </th>

                <th className="p-3 text-right">
                  Required
                </th>

                <th className="p-3 text-right">
                  Previously Issued
                </th>

                <th className="p-3 text-right">
                  Pending
                </th>

                <th className="p-3 text-right">
                  Available
                </th>

                <th className="p-3 text-right">
                  Issue Qty
                </th>

                <th className="p-3 text-left">
                  Remarks
                </th>
              </tr>
            </thead>

            <tbody>
              {data.items.map(
                (
                  row,
                  index
                ) => (
                  <tr
                    key={
                      row.materialRequirementId
                    }
                    className="border-t"
                  >
                    <td className="p-3">
                      <div className="font-semibold">
                        {
                          row.itemName
                        }
                      </div>

                      <div className="font-mono text-[10px] text-blue-600">
                        {
                          row.itemCode
                        }
                      </div>
                    </td>

                    <td className="p-3 text-right">
                      {qty(
                        row.requiredQty
                      )}{" "}
                      {row.unit}
                    </td>

                    <td className="p-3 text-right">
                      {qty(
                        row.issuedQty
                      )}{" "}
                      {row.unit}
                    </td>

                    <td className="p-3 text-right font-bold text-orange-700">
                      {qty(
                        row.pendingQty
                      )}{" "}
                      {row.unit}
                    </td>

                    <td
                      className={`p-3 text-right font-bold ${
                        row.availableQty <
                        row.pendingQty
                          ? "text-red-600"
                          : "text-emerald-700"
                      }`}
                    >
                      {qty(
                        row.availableQty
                      )}{" "}
                      {row.unit}
                    </td>

                    <td className="p-3">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        max={Math.min(
                          row.pendingQty,
                          row.availableQty
                        )}
                        value={
                          row.issueQty
                        }
                        onChange={(
                          event
                        ) =>
                          onRowChange(
                            index,
                            "issueQty",
                            event
                              .target
                              .value
                          )
                        }
                        className={`${inputClass} min-w-[130px] text-right`}
                        placeholder="0"
                      />
                    </td>

                    <td className="p-3">
                      <input
                        value={
                          row.remarks
                        }
                        onChange={(
                          event
                        ) =>
                          onRowChange(
                            index,
                            "remarks",
                            event
                              .target
                              .value
                          )
                        }
                        className={`${inputClass} min-w-[200px]`}
                      />
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>

        <Field label="General Remarks">
          <textarea
            rows="3"
            value={
              data.remarks
            }
            onChange={(
              event
            ) =>
              onChange(
                "remarks",
                event.target.value
              )
            }
            className={`${inputClass} min-h-[90px]`}
          />
        </Field>
      </div>

      <div className="flex flex-col justify-end gap-3 border-t bg-slate-50 p-4 sm:flex-row">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border bg-white px-5 py-2.5 font-semibold text-slate-600"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={onPost}
          disabled={saving}
          className="flex items-center justify-center gap-2 rounded-lg bg-indigo-700 px-6 py-2.5 font-bold text-white hover:bg-indigo-800 disabled:opacity-60"
        >
          {saving ? (
            <ArrowPathIcon className="h-5 w-5 animate-spin" />
          ) : (
            <ArrowRightCircleIcon className="h-5 w-5" />
          )}

          {saving
            ? "Posting..."
            : "Post Material Issue"}
        </button>
      </div>
    </div>
  </div>
);

const JobDetails = ({
  job,
  onClose,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
    <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white shadow-xl">
      <div className="sticky top-0 z-10 flex items-center justify-between bg-blue-700 px-5 py-4 text-white">
        <div>
          <h3 className="text-lg font-bold">
            {job.jobNo ||
              job.code}{" "}
            —{" "}
            {job.jobName ||
              job.name}
          </h3>

          <p className="text-xs text-blue-100">
            Production job details
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 hover:bg-blue-800"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-5 p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Detail
            label="Status"
            value={job.status}
          />

          <Detail
            label="Source"
            value={
              job.sourceType
            }
          />

          <Detail
            label="Sales Order"
            value={
              job.salesOrderNo ||
              job.internalReference
            }
          />

          <Detail
            label="Customer"
            value={
              job.customerName
            }
          />

          <Detail
            label="Customer PO"
            value={
              job.customerPO
            }
          />

          <Detail
            label="Finished Good"
            value={
              job.finishedGoodName ||
              job
                .finishedGoodItem
                ?.name
            }
          />

          <Detail
            label="Item Code"
            value={
              job.finishedGoodCode ||
              job
                .finishedGoodItem
                ?.code
            }
          />

          <Detail
            label="Order Description"
            value={
              job.orderDescription
            }
          />

          <Detail
            label="Order Size"
            value={
              job.orderSize
            }
          />

          <Detail
            label="Text Type"
            value={
              job.orderTextType
                ? String(
                    job.orderTextType
                  ).replace(
                    /-/g,
                    " "
                  )
                : ""
            }
          />

          <Detail
            label="Order Cartons"
            value={qty(
              job.orderCartons
            )}
          />

          <Detail
            label="Ordered Quantity"
            value={`${qty(
              job.orderedQty
            )} ${
              job.orderUnit ||
              job.unit ||
              ""
            }`}
          />

          <Detail
            label="Production Target"
            value={`${qty(
              job.targetQty
            )} ${
              job.unit || ""
            }`}
          />

          <Detail
            label="Prepared Quantity"
            value={`${qty(
              job.productionOutputQty
            )} ${
              job.unit || ""
            }`}
          />

          <Detail
            label="Pending Production"
            value={`${qty(
              Math.max(
                num(
                  job.targetQty
                ) -
                  num(
                    job.productionOutputQty
                  ),
                0
              )
            )} ${
              job.unit || ""
            }`}
          />

          <Detail
            label="Sales Order Date"
            value={dateOnly(
              job.salesOrderOrderDate
            )}
          />

          <Detail
            label="Sales Order Delivery"
            value={dateOnly(
              job.salesOrderDeliveryDate
            )}
          />

          <Detail
            label="Reference No"
            value={
              job.salesOrderReferenceNo
            }
          />

          <Detail
            label="Job Date"
            value={dateOnly(
              job.jobDate
            )}
          />

          <Detail
            label="Due Date"
            value={dateOnly(
              job.dueDate
            )}
          />

          <Detail
            label="Priority"
            value={
              job.priority
            }
          />

          <Detail
            label="Finished Size"
            value={
              job.finishedSize
            }
          />

          <Detail
            label="Sheet Size"
            value={
              job.sheetSize
            }
          />

          <Detail
            label="Total Sheets"
            value={qty(
              job.totalSheets
            )}
          />
        </div>

        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs text-blue-800">
          Selling price, order amount, tax type, tax rate, sales tax, and grand total are intentionally excluded from Production.
        </div>

        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[750px] text-xs">
            <thead className="bg-slate-50 uppercase text-slate-500">
              <tr>
                <th className="p-3 text-left">
                  Material
                </th>

                <th className="p-3 text-right">
                  Required
                </th>

                <th className="p-3 text-right">
                  Issued
                </th>

                <th className="p-3 text-right">
                  Pending
                </th>

                <th className="p-3 text-left">
                  Remarks
                </th>
              </tr>
            </thead>

            <tbody>
              {(
                job.materialRequirements ||
                []
              ).map(
                (row) => (
                  <tr
                    key={
                      row._id
                    }
                    className="border-t"
                  >
                    <td className="p-3">
                      <div className="font-semibold">
                        {row.itemName ||
                          row.item
                            ?.name}
                      </div>

                      <div className="font-mono text-[10px] text-blue-600">
                        {row.itemCode ||
                          row.item
                            ?.code}
                      </div>
                    </td>

                    <td className="p-3 text-right">
                      {qty(
                        row.requiredQty
                      )}{" "}
                      {row.unit}
                    </td>

                    <td className="p-3 text-right">
                      {qty(
                        row.issuedQty
                      )}{" "}
                      {row.unit}
                    </td>

                    <td className="p-3 text-right">
                      {qty(
                        Math.max(
                          num(
                            row.requiredQty
                          ) -
                            num(
                              row.issuedQty
                            ),
                          0
                        )
                      )}{" "}
                      {row.unit}
                    </td>

                    <td className="p-3">
                      {row.remarks ||
                        "-"}
                    </td>
                  </tr>
                )
              )}

              {!(
                job.materialRequirements ||
                []
              ).length && (
                <tr>
                  <td
                    colSpan="5"
                    className="p-8 text-center text-slate-400"
                  >
                    No material requirements.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
);

const Section = ({
  title,
  children,
}) => (
  <section>
    <h3 className="mb-4 border-b pb-2 text-xs font-bold uppercase tracking-wider text-blue-700">
      {title}
    </h3>

    {children}
  </section>
);

const Field = ({
  label,
  required = false,
  wide = false,
  children,
}) => (
  <div
    className={
      wide
        ? "md:col-span-2"
        : ""
    }
  >
    <label className="mb-1.5 block text-xs font-bold text-slate-600">
      {label}

      {required && (
        <span className="text-red-600">
          {" "}
          *
        </span>
      )}
    </label>

    {children}
  </div>
);

const Stat = ({
  label,
  value,
}) => (
  <div className="rounded-xl border bg-white p-4 shadow-sm">
    <p className="text-xs text-slate-500">
      {label}
    </p>

    <h3 className="mt-1 text-2xl font-bold text-slate-900">
      {value}
    </h3>
  </div>
);

const Detail = ({
  label,
  value,
}) => (
  <div className="rounded-xl border bg-slate-50 p-3">
    <p className="text-[10px] font-bold uppercase text-slate-500">
      {label}
    </p>

    <p className="mt-1 font-semibold text-slate-900">
      {value || "-"}
    </p>
  </div>
);

const IconButton = ({
  title,
  onClick,
  disabled,
  color,
  children,
}) => {
  const colors = {
    blue:
      "text-blue-600 hover:bg-blue-50",

    cyan:
      "text-cyan-600 hover:bg-cyan-50",

    emerald:
      "text-emerald-600 hover:bg-emerald-50",

    indigo:
      "text-indigo-600 hover:bg-indigo-50",

    orange:
      "text-orange-600 hover:bg-orange-50",

    red:
      "text-red-600 hover:bg-red-50",
  };

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg p-2 disabled:cursor-not-allowed disabled:opacity-40 ${colors[color]}`}
    >
      {children}
    </button>
  );
};

export default ProductionItemsManager;