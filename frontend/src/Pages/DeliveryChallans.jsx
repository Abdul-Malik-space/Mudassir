import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  CheckCircle2,
  Edit3,
  FileText,
  Loader2,
  Package,
  Plus,
  Printer,
  RefreshCcw,
  Search,
  Send,
  Trash2,
  Truck,
  X,
  XCircle,
} from "lucide-react";

import {
  API_BASE_URL,
} from "../config/api";

const API_DELIVERY =
  `${API_BASE_URL}/delivery-challans`;

const todayDate = () =>
  new Date()
    .toISOString()
    .slice(0, 10);

const numberValue = (
  value
) => {
  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : 0;
};

const formatQuantity = (
  value
) =>
  numberValue(
    value
  ).toLocaleString(
    undefined,
    {
      maximumFractionDigits:
        3,
    }
  );

const formatDate = (
  value
) => {
  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return String(
      value
    ).slice(0, 10);
  }

  return date.toLocaleDateString(
    "en-GB"
  );
};

const idOf = (
  value
) => {
  if (!value) {
    return "";
  }

  if (
    typeof value ===
    "object"
  ) {
    return String(
      value._id ||
        value.id ||
        ""
    );
  }

  return String(value);
};

const safeText = (
  value
) =>
  String(value ?? "")
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );

const normalizeArray = (
  data,
  keys = []
) => {
  if (
    Array.isArray(data)
  ) {
    return data;
  }

  for (
    const key of keys
  ) {
    if (
      Array.isArray(
        data?.[key]
      )
    ) {
      return data[key];
    }
  }

  if (
    Array.isArray(
      data?.data
    )
  ) {
    return data.data;
  }

  return [];
};

const primaryOutputItem = (
  output
) =>
  output?.items?.[0] ||
  {};

const outputCompatibilityKey = (
  output
) => {
  const salesOrderId =
    idOf(
      output?.salesOrder
    );

  const customerId =
    idOf(
      output?.customer
    );

  const customerName =
    String(
      output?.customerName ||
        ""
    )
      .trim()
      .toLowerCase();

  return `${
    salesOrderId ||
    "NO-SALES-ORDER"
  }|${
    customerId ||
    customerName ||
    "NO-CUSTOMER"
  }`;
};

const outputToDeliveryItem = (
  output,
  existingItem = null
) => {
  const source =
    primaryOutputItem(
      output
    );

  return {
    salesOrderItemId:
      idOf(
        source.salesOrderItemId
      ) ||
      null,

    productionOutput:
      idOf(
        output?._id ||
          output?.productionOutput
      ),

    productionOutputNo:
      output?.readyNo ||
      output?.sourceNo ||
      "",

    productionJob:
      idOf(
        output?.productionJob
      ),

    productionJobNo:
      output?.jobNo ||
      output?.productionJob?.jobNo ||
      "",

    item:
      idOf(
        source.item
      ),

    itemCode:
      source.itemCode ||
      "",

    itemName:
      source.itemName ||
      source.description ||
      "Finished Good",

    description:
      source.description ||
      source.itemName ||
      "",

    size:
      source.size ||
      "",

    textType:
      source.textType ||
      "",

    orderedQty:
      numberValue(
        source.orderedQty
      ),

    alreadyDeliveredQty:
      numberValue(
        source.alreadyDeliveredQty
      ),

    pendingQty:
      numberValue(
        source.pendingQty
      ),

    availableStock:
      numberValue(
        source.availableStock
      ),

    quantity:
      existingItem
        ? existingItem.quantity
        : (
            numberValue(
              source.quantity
            ) > 0
              ? String(
                  source.quantity
                )
              : ""
          ),

    unit:
      source.unit ||
      "Pcs",

    cartons:
      existingItem
        ? existingItem.cartons
        : (
            source.cartons ||
            ""
          ),

    rolls:
      existingItem
        ? existingItem.rolls
        : (
            source.rolls ||
            ""
          ),

    grossWeight:
      existingItem
        ? existingItem.grossWeight
        : (
            source.grossWeight ||
            ""
          ),

    netWeight:
      existingItem
        ? existingItem.netWeight
        : (
            source.netWeight ||
            ""
          ),

    unitPrice:
      numberValue(
        source.unitPrice
      ),

    remarks:
      existingItem
        ? existingItem.remarks
        : (
            source.remarks ||
            ""
          ),

    warehouseId:
      idOf(
        source.warehouseId
      ),

    warehouse:
      "Finished Goods Godown",
  };
};

const apiRequest =
  async (
    url,
    options = {}
  ) => {
    const response =
      await fetch(
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
        .catch(
          () => ({})
        );

    if (!response.ok) {
      throw new Error(
        data.message ||
          data.error ||
          "Request failed."
      );
    }

    return data;
  };

const emptyForm = (
  challanNo = ""
) => ({
  challanNo,
  sourceType:
    "Sales Order",
  sourceNo: "",
  salesOrder: "",
  salesOrderNo: "",
  productionOutput: "",
  productionOutputs: [],
  productionJob: "",
  productionJobs: [],
  jobNo: "",
  poNo: "",
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  customerAddress: "",
  deliveryAddress: "",
  attentionTo: "",
  companyName:
    "URWA PACKAGES",
  companyLogo:
    "/logo.png",
  documentNo:
    "UP-DC-01 / 01",
  issueNo: "01",
  revisionNo: "00",
  documentIssueDate:
    todayDate(),
  challanDate:
    todayDate(),
  dispatchDate:
    todayDate(),
  vehicleNo: "",
  driverName: "",
  driverPhone: "",
  preparedBy: "",
  dispatchedBy: "",
  referenceNo: "",
  remarks: "",
  items: [],
});

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";

const statusClass = (
  status
) => {
  const classes = {
    Draft:
      "border-slate-200 bg-slate-100 text-slate-700",

    Dispatched:
      "border-blue-200 bg-blue-100 text-blue-700",

    Received:
      "border-emerald-200 bg-emerald-100 text-emerald-700",

    Cancelled:
      "border-red-200 bg-red-100 text-red-700",
  };

  return (
    classes[status] ||
    classes.Draft
  );
};

const DeliveryChallans =
  () => {
    const [
      challans,
      setChallans,
    ] = useState([]);

    const [
      salesOrders,
      setSalesOrders,
    ] = useState([]);

    const [
      productionOutputs,
      setProductionOutputs,
    ] = useState([]);

    const [
      form,
      setForm,
    ] = useState(
      emptyForm()
    );

    const [
      showForm,
      setShowForm,
    ] = useState(false);

    const [
      editId,
      setEditId,
    ] = useState(null);

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

    const [
      search,
      setSearch,
    ] = useState("");

    const [
      statusFilter,
      setStatusFilter,
    ] = useState("All");

    const fetchData =
      async () => {
        try {
          setLoading(true);

          const [
            challanData,
            orderData,
            outputData,
          ] =
            await Promise.all([
              apiRequest(
                `${API_DELIVERY}/all`
              ),

              apiRequest(
                `${API_DELIVERY}/eligible-sales-orders`
              ),

              apiRequest(
                `${API_DELIVERY}/eligible-production-outputs`
              ),
            ]);

          setChallans(
            normalizeArray(
              challanData,
              [
                "challans",
                "deliveryChallans",
              ]
            )
          );

          setSalesOrders(
            normalizeArray(
              orderData,
              [
                "orders",
                "salesOrders",
              ]
            )
          );

          setProductionOutputs(
            normalizeArray(
              outputData,
              [
                "outputs",
                "productionOutputs",
                "readyProducts",
              ]
            )
          );
        } catch (error) {
          console.error(
            "Delivery Challan Load Error:",
            error
          );

          alert(
            error.message ||
              "Unable to load delivery challans."
          );
        } finally {
          setLoading(false);
        }
      };

    useEffect(
      () => {
        fetchData();
      },
      []
    );

    const selectedOrder =
      useMemo(
        () =>
          salesOrders.find(
            (order) =>
              String(
                order._id
              ) ===
              String(
                form.salesOrder
              )
          ),
        [
          salesOrders,
          form.salesOrder,
        ]
      );

    const selectedProductionOutputs =
      useMemo(
        () =>
          productionOutputs.filter(
            (output) =>
              (
                form.productionOutputs ||
                []
              ).includes(
                idOf(
                  output._id
                )
              )
          ),
        [
          productionOutputs,
          form.productionOutputs,
        ]
      );

    const selectedOutputGroupKey =
      selectedProductionOutputs.length
        ? outputCompatibilityKey(
            selectedProductionOutputs[0]
          )
        : "";

    const compatibleProductionOutputs =
      useMemo(
        () =>
          productionOutputs.filter(
            (output) =>
              !selectedOutputGroupKey ||
              outputCompatibilityKey(
                output
              ) ===
                selectedOutputGroupKey
          ),
        [
          productionOutputs,
          selectedOutputGroupKey,
        ]
      );

    const totals =
      useMemo(
        () => ({
          cartons:
            form.items.reduce(
              (
                sum,
                item
              ) =>
                sum +
                numberValue(
                  item.cartons
                ),
              0
            ),

          rolls:
            form.items.reduce(
              (
                sum,
                item
              ) =>
                sum +
                numberValue(
                  item.rolls
                ),
              0
            ),

          quantity:
            form.items.reduce(
              (
                sum,
                item
              ) =>
                sum +
                numberValue(
                  item.quantity
                ),
              0
            ),

          grossWeight:
            form.items.reduce(
              (
                sum,
                item
              ) =>
                sum +
                numberValue(
                  item.grossWeight
                ),
              0
            ),

          netWeight:
            form.items.reduce(
              (
                sum,
                item
              ) =>
                sum +
                numberValue(
                  item.netWeight
                ),
              0
            ),
        }),
        [form.items]
      );

    const stats =
      useMemo(
        () => ({
          total:
            challans.length,

          draft:
            challans.filter(
              (row) =>
                row.status ===
                "Draft"
            ).length,

          dispatched:
            challans.filter(
              (row) =>
                row.status ===
                "Dispatched"
            ).length,

          received:
            challans.filter(
              (row) =>
                row.status ===
                "Received"
            ).length,

          quantity:
            challans
              .filter(
                (row) =>
                  [
                    "Dispatched",
                    "Received",
                  ].includes(
                    row.status
                  )
              )
              .reduce(
                (
                  sum,
                  row
                ) =>
                  sum +
                  numberValue(
                    row.totalQuantity
                  ),
                0
              ),

          uninvoiced:
            challans.filter(
              (row) =>
                [
                  "Dispatched",
                  "Received",
                ].includes(
                  row.status
                ) &&
                row.invoiceStatus !==
                  "Invoiced"
            ).length,
        }),
        [challans]
      );

    const filteredChallans =
      useMemo(
        () => {
          const keyword =
            search
              .trim()
              .toLowerCase();

          return challans.filter(
            (challan) => {
              const searchable =
                [
                  challan.challanNo,
                  challan.sourceType,
                  challan.sourceNo,
                  challan.salesOrderNo,
                  challan.productionOutput?.readyNo,
                  ...(
                    challan.productionOutputs ||
                    []
                  ).map(
                    (output) =>
                      output.readyNo
                  ),
                  challan.productionJob?.jobNo,
                  ...(
                    challan.productionJobs ||
                    []
                  ).map(
                    (job) =>
                      job.jobNo
                  ),
                  challan.customerName,
                  challan.poNo,
                  challan.vehicleNo,

                  ...(
                    challan.items ||
                    []
                  ).flatMap(
                    (item) => [
                      item.itemCode,
                      item.itemName,
                      item.description,
                    ]
                  ),
                ]
                  .filter(Boolean)
                  .join(" ")
                  .toLowerCase();

              return (
                (!keyword ||
                  searchable.includes(
                    keyword
                  )) &&
                (
                  statusFilter ===
                    "All" ||
                  challan.status ===
                    statusFilter
                )
              );
            }
          );
        },
        [
          challans,
          search,
          statusFilter,
        ]
      );

    const openNewForm =
      async () => {
        try {
          setSaving(true);

          const data =
            await apiRequest(
              `${API_DELIVERY}/next-no`
            );

          setEditId(null);

          setForm(
            emptyForm(
              data.challanNo ||
                data.deliveryChallanNo ||
                ""
            )
          );

          setShowForm(true);
        } catch (error) {
          alert(
            error.message ||
              "Unable to prepare a delivery challan."
          );
        } finally {
          setSaving(false);
        }
      };

    const closeForm =
      () => {
        setShowForm(false);
        setEditId(null);
        setForm(
          emptyForm()
        );
      };

    const updateField = (
      field,
      value
    ) => {
      setForm(
        (current) => ({
          ...current,

          [field]:
            value,
        })
      );
    };

    const updateItem = (
      index,
      field,
      value
    ) => {
      setForm(
        (current) => {
          const items = [
            ...current.items,
          ];

          items[index] = {
            ...items[index],

            [field]:
              value,
          };

          return {
            ...current,
            items,
          };
        }
      );
    };

    const removeItem = (
      index
    ) => {
      setForm(
        (current) => {
          const removed =
            current.items[index];

          const items =
            current.items.filter(
              (
                _,
                itemIndex
              ) =>
                itemIndex !==
                index
            );

          if (
            current.sourceType !==
            "Production Output"
          ) {
            return {
              ...current,
              items,
            };
          }

          const selectedIds =
            (
              current.productionOutputs ||
              []
            ).filter(
              (id) =>
                id !==
                idOf(
                  removed?.productionOutput
                )
            );

          return rebuildProductionOutputForm(
            {
              ...current,
              items,
            },
            selectedIds
          );
        }
      );
    };

    const handleSalesOrderChange = (
      salesOrderId
    ) => {
      const order =
        salesOrders.find(
          (row) =>
            String(
              row._id
            ) ===
            String(
              salesOrderId
            )
        );

      if (!order) {
        setForm(
          (current) => ({
            ...emptyForm(
              current.challanNo
            ),

            challanDate:
              current.challanDate,

            dispatchDate:
              current.dispatchDate,
          })
        );

        return;
      }

      const items =
        (
          order.items || []
        ).map(
          (item) => ({
            salesOrderItemId:
              item.salesOrderItemId,

            item:
              idOf(
                item.item
              ),

            itemCode:
              item.itemCode ||
              "",

            itemName:
              item.itemName ||
              item.description ||
              "",

            description:
              item.description ||
              item.itemName ||
              "",

            size:
              item.size ||
              "",

            orderedQty:
              numberValue(
                item.orderedQty
              ),

            alreadyDeliveredQty:
              numberValue(
                item.alreadyDeliveredQty
              ),

            pendingQty:
              numberValue(
                item.pendingQty
              ),

            availableStock:
              numberValue(
                item.availableStock
              ),

            quantity:
              numberValue(
                item.quantity
              ) > 0
                ? String(
                    item.quantity
                  )
                : "",

            unit:
              item.unit ||
              "Pcs",

            cartons:
              item.cartons ||
              "",

            rolls:
              item.rolls ||
              "",

            grossWeight:
              item.grossWeight ||
              "",

            netWeight:
              item.netWeight ||
              "",

            unitPrice:
              numberValue(
                item.unitPrice
              ),

            remarks:
              item.remarks ||
              "",

            warehouseId:
              idOf(
                item.warehouseId
              ),

            warehouse:
              "Finished Goods Godown",
          })
        );

      setForm(
        (current) => ({
          ...current,

          sourceType:
            "Sales Order",

          sourceNo:
            order.sourceNo ||
            order.salesOrderNo ||
            "",

          salesOrder:
            order._id,

          salesOrderNo:
            order.salesOrderNo ||
            "",

          productionOutput:
            "",

          productionJob:
            "",

          jobNo:
            "",

          poNo:
            order.poNo ||
            "",

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

          deliveryAddress:
            order.customerAddress ||
            "",

          attentionTo:
            order.attentionTo ||
            "",

          items,
        })
      );
    };

    const handleSourceTypeChange =
      (
        sourceType
      ) => {
        setForm(
          (current) => ({
            ...emptyForm(
              current.challanNo
            ),

            sourceType,

            challanDate:
              current.challanDate,

            dispatchDate:
              current.dispatchDate,

            companyName:
              current.companyName,

            companyLogo:
              current.companyLogo,

            documentNo:
              current.documentNo,

            issueNo:
              current.issueNo,

            revisionNo:
              current.revisionNo,

            documentIssueDate:
              current.documentIssueDate,
          })
        );
      };

    const rebuildProductionOutputForm =
      (
        current,
        selectedIds
      ) => {
        const selectedOutputs =
          productionOutputs.filter(
            (output) =>
              selectedIds.includes(
                idOf(
                  output._id
                )
              )
          );

        const existingByOutput =
          new Map(
            (
              current.items ||
              []
            ).map(
              (item) => [
                idOf(
                  item.productionOutput
                ),
                item,
              ]
            )
          );

        const items =
          selectedOutputs.map(
            (output) =>
              outputToDeliveryItem(
                output,
                existingByOutput.get(
                  idOf(
                    output._id
                  )
                )
              )
          );

        const first =
          selectedOutputs[0];

        const productionJobs = [
          ...new Set(
            selectedOutputs
              .map(
                (output) =>
                  idOf(
                    output.productionJob
                  )
              )
              .filter(Boolean)
          ),
        ];

        return {
          ...current,

          productionOutputs:
            selectedIds,

          productionOutput:
            selectedIds[0] ||
            "",

          productionJobs,

          productionJob:
            productionJobs[0] ||
            "",

          jobNo:
            selectedOutputs
              .map(
                (output) =>
                  output.jobNo ||
                  output.productionJob?.jobNo
              )
              .filter(Boolean)
              .join(", "),

          sourceNo:
            selectedOutputs
              .map(
                (output) =>
                  output.sourceNo ||
                  output.readyNo
              )
              .filter(Boolean)
              .join(", "),

          salesOrder:
            first
              ? idOf(
                  first.salesOrder
                )
              : "",

          salesOrderNo:
            first?.salesOrderNo ||
            "",

          poNo:
            first?.poNo ||
            "",

          customerName:
            first?.customerName ||
            "",

          customerPhone:
            first?.customerPhone ||
            "",

          customerEmail:
            first?.customerEmail ||
            "",

          customerAddress:
            first?.customerAddress ||
            "",

          deliveryAddress:
            first?.customerAddress ||
            "",

          attentionTo:
            first?.attentionTo ||
            "",

          items,
        };
      };

    const toggleProductionOutput =
      (
        productionOutputId
      ) => {
        const output =
          productionOutputs.find(
            (row) =>
              idOf(
                row._id
              ) ===
              String(
                productionOutputId
              )
          );

        if (!output) {
          return;
        }

        setForm(
          (current) => {
            const selectedIds = [
              ...(
                current.productionOutputs ||
                []
              ),
            ];

            const exists =
              selectedIds.includes(
                String(
                  productionOutputId
                )
              );

            if (exists) {
              return rebuildProductionOutputForm(
                current,
                selectedIds.filter(
                  (id) =>
                    id !==
                    String(
                      productionOutputId
                    )
                )
              );
            }

            if (
              selectedIds.length
            ) {
              const first =
                productionOutputs.find(
                  (row) =>
                    idOf(
                      row._id
                    ) ===
                    selectedIds[0]
                );

              if (
                first &&
                outputCompatibilityKey(
                  first
                ) !==
                  outputCompatibilityKey(
                    output
                  )
              ) {
                alert(
                  "Only Production Outputs from the same Sales Order and Customer can be combined."
                );

                return current;
              }
            }

            return rebuildProductionOutputForm(
              current,
              [
                ...selectedIds,
                String(
                  productionOutputId
                ),
              ]
            );
          }
        );
      };

    const toggleAllCompatibleOutputs =
      () => {
        setForm(
          (current) => {
            const selectedIds =
              current.productionOutputs ||
              [];

            let candidates =
              compatibleProductionOutputs;

            if (
              !selectedIds.length
            ) {
              const first =
                productionOutputs[0];

              if (!first) {
                return current;
              }

              const key =
                outputCompatibilityKey(
                  first
                );

              candidates =
                productionOutputs.filter(
                  (output) =>
                    outputCompatibilityKey(
                      output
                    ) ===
                    key
                );
            }

            const candidateIds =
              candidates.map(
                (output) =>
                  idOf(
                    output._id
                  )
              );

            const allSelected =
              candidateIds.length > 0 &&
              candidateIds.every(
                (id) =>
                  selectedIds.includes(
                    id
                  )
              );

            return rebuildProductionOutputForm(
              current,
              allSelected
                ? []
                : candidateIds
            );
          }
        );
      };

    const openEdit = (
      challan
    ) => {
      setEditId(
        challan._id
      );

      setForm({
        challanNo:
          challan.challanNo ||
          "",

        sourceType:
          challan.sourceType ||
          (
            challan.productionOutput ||
            (
              challan.productionOutputs ||
              []
            ).length
              ? "Production Output"
              : "Sales Order"
          ),

        sourceNo:
          challan.sourceNo ||
          challan.salesOrderNo ||
          challan.productionOutput?.readyNo ||
          "",

        productionOutput:
          idOf(
            challan.productionOutput
          ),

        productionOutputs:
          [
            ...new Set(
              [
                ...(
                  challan.productionOutputs ||
                  []
                ).map(idOf),

                idOf(
                  challan.productionOutput
                ),

                ...(
                  challan.items ||
                  []
                ).map(
                  (item) =>
                    idOf(
                      item.productionOutput
                    )
                ),
              ].filter(Boolean)
            ),
          ],

        productionJob:
          idOf(
            challan.productionJob
          ),

        productionJobs:
          [
            ...new Set(
              [
                ...(
                  challan.productionJobs ||
                  []
                ).map(idOf),

                idOf(
                  challan.productionJob
                ),

                ...(
                  challan.items ||
                  []
                ).map(
                  (item) =>
                    idOf(
                      item.productionJob
                    )
                ),
              ].filter(Boolean)
            ),
          ],

        jobNo:
          challan.productionJob?.jobNo ||
          challan.productionOutput?.jobNo ||
          "",

        salesOrder:
          idOf(
            challan.salesOrder
          ),

        salesOrderNo:
          challan.salesOrderNo ||
          "",

        poNo:
          challan.poNo ||
          "",

        customerName:
          challan.customerName ||
          "",

        customerPhone:
          challan.customerPhone ||
          "",

        customerEmail:
          challan.customerEmail ||
          "",

        customerAddress:
          challan.customerAddress ||
          "",

        deliveryAddress:
          challan.deliveryAddress ||
          challan.customerAddress ||
          "",

        attentionTo:
          challan.attentionTo ||
          "",

        companyName:
          challan.companyName ||
          "URWA PACKAGES",

        companyLogo:
          challan.companyLogo ||
          "/logo.png",

        documentNo:
          challan.documentNo ||
          "UP-DC-01 / 01",

        issueNo:
          challan.issueNo ||
          "01",

        revisionNo:
          challan.revisionNo ||
          "00",

        documentIssueDate:
          String(
            challan.documentIssueDate ||
              todayDate()
          ).slice(
            0,
            10
          ),

        challanDate:
          String(
            challan.challanDate ||
              todayDate()
          ).slice(
            0,
            10
          ),

        dispatchDate:
          String(
            challan.dispatchDate ||
              todayDate()
          ).slice(
            0,
            10
          ),

        vehicleNo:
          challan.vehicleNo ||
          "",

        driverName:
          challan.driverName ||
          "",

        driverPhone:
          challan.driverPhone ||
          "",

        preparedBy:
          challan.preparedBy ||
          "",

        dispatchedBy:
          challan.dispatchedBy ||
          "",

        referenceNo:
          challan.referenceNo ||
          "",

        remarks:
          challan.remarks ||
          "",

        items:
          (
            challan.items ||
            []
          ).map(
            (item) => ({
              salesOrderItemId:
                idOf(
                  item.salesOrderItemId
                ),

              productionOutput:
                idOf(
                  item.productionOutput ||
                  challan.productionOutput
                ),

              productionOutputNo:
                item.productionOutputNo ||
                item.productionOutput?.readyNo ||
                "",

              productionJob:
                idOf(
                  item.productionJob ||
                  challan.productionJob
                ),

              productionJobNo:
                item.productionJobNo ||
                item.productionJob?.jobNo ||
                "",

              item:
                idOf(
                  item.item
                ),

              itemCode:
                item.itemCode ||
                item.item?.code ||
                "",

              itemName:
                item.itemName ||
                item.item?.name ||
                item.description ||
                "",

              description:
                item.description ||
                "",

              size:
                item.size ||
                "",

              textType:
                item.textType ||
                "",

              orderedQty:
                numberValue(
                  item.orderedQty
                ),

              alreadyDeliveredQty:
                numberValue(
                  item.alreadyDeliveredQty
                ),

              pendingQty:
                numberValue(
                  item.pendingQty
                ),

              availableStock:
                numberValue(
                  item.availableStock
                ),

              quantity:
                String(
                  item.quantity ??
                    ""
                ),

              unit:
                item.unit ||
                "Pcs",

              cartons:
                String(
                  item.cartons ??
                    ""
                ),

              rolls:
                String(
                  item.rolls ??
                    ""
                ),

              grossWeight:
                String(
                  item.grossWeight ??
                    ""
                ),

              netWeight:
                String(
                  item.netWeight ??
                    ""
                ),

              unitPrice:
                numberValue(
                  item.unitPrice
                ),

              remarks:
                item.remarks ||
                "",

              warehouseId:
                idOf(
                  item.warehouseId
                ),

              warehouse:
                "Finished Goods Godown",
            })
          ),
      });

      setShowForm(true);
    };

    const validateForm =
      () => {
        if (
          form.sourceType ===
            "Sales Order" &&
          !form.salesOrder
        ) {
          alert(
            "Please select a sales order."
          );

          return false;
        }

        if (
          form.sourceType ===
            "Production Output" &&
          !(
            form.productionOutputs ||
            []
          ).length
        ) {
          alert(
            "Please select at least one production output."
          );

          return false;
        }

        if (
          !form.challanDate
        ) {
          alert(
            "Challan date is required."
          );

          return false;
        }

        if (
          !form.customerName.trim()
        ) {
          alert(
            "Customer name is required."
          );

          return false;
        }

        const validItems =
          form.items.filter(
            (item) =>
              item.item &&
              numberValue(
                item.quantity
              ) > 0
          );

        if (
          !validItems.length
        ) {
          alert(
            "Add at least one finished good item with delivery quantity."
          );

          return false;
        }

        for (
          const item of
          validItems
        ) {
          if (
            numberValue(
              item.quantity
            ) >
            numberValue(
              item.pendingQty
            )
          ) {
            alert(
              `${item.itemName}: delivery quantity cannot exceed remaining source quantity.`
            );

            return false;
          }

          if (
            numberValue(
              item.grossWeight
            ) > 0 &&
            numberValue(
              item.netWeight
            ) >
              numberValue(
                item.grossWeight
              )
          ) {
            alert(
              `${item.itemName}: net weight cannot exceed gross weight.`
            );

            return false;
          }
        }

        return true;
      };

    const buildPayload =
      () => ({
        sourceType:
          form.sourceType,

        sourceNo:
          form.sourceNo,

        salesOrder:
          form.salesOrder ||
          null,

        productionOutput:
          form.productionOutput ||
          null,

        productionOutputs:
          form.productionOutputs ||
          [],

        productionJob:
          form.productionJob ||
          null,

        productionJobs:
          form.productionJobs ||
          [],

        challanDate:
          form.challanDate,

        dispatchDate:
          form.dispatchDate,

        poNo:
          form.poNo.trim(),

        referenceNo:
          form.referenceNo.trim(),

        companyName:
          form.companyName.trim(),

        companyLogo:
          form.companyLogo.trim(),

        documentNo:
          form.documentNo.trim(),

        issueNo:
          form.issueNo.trim(),

        revisionNo:
          form.revisionNo.trim(),

        documentIssueDate:
          form.documentIssueDate,

        customerName:
          form.customerName.trim(),

        customerPhone:
          form.customerPhone.trim(),

        customerEmail:
          form.customerEmail.trim(),

        customerAddress:
          form.customerAddress.trim(),

        deliveryAddress:
          form.deliveryAddress.trim(),

        attentionTo:
          form.attentionTo.trim(),

        vehicleNo:
          form.vehicleNo.trim(),

        driverName:
          form.driverName.trim(),

        driverPhone:
          form.driverPhone.trim(),

        preparedBy:
          form.preparedBy.trim(),

        dispatchedBy:
          form.dispatchedBy.trim(),

        remarks:
          form.remarks.trim(),

        items:
          form.items
            .filter(
              (item) =>
                item.item &&
                numberValue(
                  item.quantity
                ) > 0
            )
            .map(
              (item) => ({
                salesOrderItemId:
                  item.salesOrderItemId ||
                  null,

                productionOutput:
                  item.productionOutput ||
                  null,

                productionOutputNo:
                  item.productionOutputNo ||
                  "",

                productionJob:
                  item.productionJob ||
                  null,

                productionJobNo:
                  item.productionJobNo ||
                  "",

                item:
                  item.item,

                description:
                  item.description.trim(),

                size:
                  item.size.trim(),

                textType:
                  String(
                    item.textType ||
                    ""
                  ).trim(),

                quantity:
                  numberValue(
                    item.quantity
                  ),

                unit:
                  item.unit,

                cartons:
                  numberValue(
                    item.cartons
                  ),

                rolls:
                  numberValue(
                    item.rolls
                  ),

                grossWeight:
                  numberValue(
                    item.grossWeight
                  ),

                netWeight:
                  numberValue(
                    item.netWeight
                  ),

                unitPrice:
                  numberValue(
                    item.unitPrice
                  ),

                remarks:
                  item.remarks.trim(),
              })
            ),
      });

    const saveDraft =
      async () => {
        if (
          !validateForm()
        ) {
          return;
        }

        try {
          setSaving(true);

          await apiRequest(
            editId
              ? `${API_DELIVERY}/update/${editId}`
              : `${API_DELIVERY}/add`,
            {
              method:
                editId
                  ? "PUT"
                  : "POST",

              body:
                JSON.stringify(
                  buildPayload()
                ),
            }
          );

          await fetchData();

          closeForm();
        } catch (error) {
          alert(
            error.message ||
              "Unable to save the delivery challan draft."
          );
        } finally {
          setSaving(false);
        }
      };

    const dispatchChallan =
      async (
        challan
      ) => {
        if (
          !window.confirm(
            `Dispatch ${challan.challanNo} and post finished goods stock out?`
          )
        ) {
          return;
        }

        try {
          setActionId(
            challan._id
          );

          await apiRequest(
            `${API_DELIVERY}/dispatch/${challan._id}`,
            {
              method:
                "POST",

              body:
                JSON.stringify({
                  dispatchDate:
                    challan.dispatchDate ||
                    todayDate(),

                  dispatchedBy:
                    challan.dispatchedBy ||
                    "",

                  vehicleNo:
                    challan.vehicleNo ||
                    "",

                  driverName:
                    challan.driverName ||
                    "",

                  driverPhone:
                    challan.driverPhone ||
                    "",
                }),
            }
          );

          await fetchData();
        } catch (error) {
          alert(
            error.message ||
              "Unable to dispatch the delivery challan."
          );
        } finally {
          setActionId("");
        }
      };

    const receiveChallan =
      async (
        challan
      ) => {
        const receivedBy =
          window.prompt(
            "Received by:",
            ""
          );

        if (
          receivedBy === null
        ) {
          return;
        }

        try {
          setActionId(
            challan._id
          );

          await apiRequest(
            `${API_DELIVERY}/receive/${challan._id}`,
            {
              method:
                "POST",

              body:
                JSON.stringify({
                  receivedDate:
                    todayDate(),

                  receivedBy:
                    receivedBy.trim(),
                }),
            }
          );

          await fetchData();
        } catch (error) {
          alert(
            error.message ||
              "Unable to mark the challan as received."
          );
        } finally {
          setActionId("");
        }
      };

    const cancelChallan =
      async (
        challan
      ) => {
        const cancelReason =
          window.prompt(
            "Cancellation reason:",
            ""
          );

        if (
          cancelReason === null
        ) {
          return;
        }

        try {
          setActionId(
            challan._id
          );

          await apiRequest(
            `${API_DELIVERY}/cancel/${challan._id}`,
            {
              method:
                "POST",

              body:
                JSON.stringify({
                  cancelReason:
                    cancelReason.trim() ||
                    "Delivery challan cancelled",
                }),
            }
          );

          await fetchData();
        } catch (error) {
          alert(
            error.message ||
              "Unable to cancel the delivery challan."
          );
        } finally {
          setActionId("");
        }
      };

    const deleteDraft =
      async (
        challan
      ) => {
        if (
          !window.confirm(
            `Delete ${challan.challanNo}?`
          )
        ) {
          return;
        }

        try {
          setActionId(
            challan._id
          );

          await apiRequest(
            `${API_DELIVERY}/delete/${challan._id}`,
            {
              method:
                "DELETE",
            }
          );

          await fetchData();
        } catch (error) {
          alert(
            error.message ||
              "Unable to delete the delivery challan draft."
          );
        } finally {
          setActionId("");
        }
      };

    const printChallan =
      (
        challan
      ) => {
        const printWindow =
          window.open(
            "",
            "_blank",
            "width=900,height=1000"
          );

        if (!printWindow) {
          alert(
            "Allow pop-ups and try again."
          );

          return;
        }

        const companyName =
          String(
            challan.companyName ||
              "URWA PACKAGES"
          ).trim();

        const rawLogo =
          String(
            challan.companyLogo ||
              "/logo.png"
          ).trim();

        let logoUrl =
          rawLogo;

        try {
          if (
            !/^(data:|blob:|https?:\/\/)/i.test(
              rawLogo
            )
          ) {
            logoUrl =
              new URL(
                rawLogo.startsWith(
                  "/"
                )
                  ? rawLogo
                  : `/${rawLogo}`,
                window.location.origin
              ).href;
          }
        } catch {
          logoUrl =
            `${window.location.origin}/logo.png`;
        }

        const logoInitials =
          companyName
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(
              (word) =>
                word.charAt(0)
            )
            .join("")
            .toUpperCase() ||
          "UP";

        const printNumber = (
          value,
          suffix = ""
        ) =>
          numberValue(value) > 0
            ? `${formatQuantity(
                value
              )}${suffix}`
            : "";

        const actualItems =
          challan.items || [];

        const actualRows =
          actualItems
            .map(
              (item) => `
                <tr class="data-row">
                  <td class="particulars">${safeText(
                    item.description ||
                      item.itemName ||
                      ""
                  )}</td>

                  <td>${safeText(
                    item.size ||
                      ""
                  )}</td>

                  <td class="center">${printNumber(
                    item.cartons
                  )}</td>

                  <td class="center">${printNumber(
                    item.rolls
                  )}</td>

                  <td class="right">${printNumber(
                    item.grossWeight,
                    " kg"
                  )}</td>

                  <td class="right">${printNumber(
                    item.netWeight,
                    " kg"
                  )}</td>
                </tr>
              `
            )
            .join("");

        const minimumRows =
          15;

        const blankRows =
          Array.from({
            length:
              Math.max(
                minimumRows -
                  actualItems.length,
                0
              ),
          })
            .map(
              () => `
                <tr class="blank-row">
                  <td>&nbsp;</td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
              `
            )
            .join("");

        const rows =
          actualRows +
          blankRows;

        const totalCartons =
          challan.totalCartons ??
          actualItems.reduce(
            (
              sum,
              item
            ) =>
              sum +
              numberValue(
                item.cartons
              ),
            0
          );

        const totalRolls =
          challan.totalRolls ??
          actualItems.reduce(
            (
              sum,
              item
            ) =>
              sum +
              numberValue(
                item.rolls
              ),
            0
          );

        const totalGrossWeight =
          challan.totalGrossWeight ??
          actualItems.reduce(
            (
              sum,
              item
            ) =>
              sum +
              numberValue(
                item.grossWeight
              ),
            0
          );

        const totalNetWeight =
          challan.totalNetWeight ??
          actualItems.reduce(
            (
              sum,
              item
            ) =>
              sum +
              numberValue(
                item.netWeight
              ),
            0
          );

        printWindow.document.write(`
          <!doctype html>

          <html>
            <head>
              <meta charset="utf-8" />

              <title>${safeText(
                challan.challanNo ||
                  "Delivery Challan"
              )}</title>

              <style>
                @page {
                  size: A4 portrait;
                  margin: 10mm 12mm;
                }

                * {
                  box-sizing: border-box;
                }

                body {
                  margin: 0;
                  color: #000;
                  background: #fff;
                  font-family: Arial, Helvetica, sans-serif;
                  font-size: 11px;
                }

                .page {
                  width: 100%;
                  max-width: 190mm;
                  margin: 0 auto;
                }

                .document-header {
                  width: 86%;
                  margin: 0 auto 30px;
                  border-collapse: collapse;
                  table-layout: fixed;
                }

                .document-header td {
                  border: 1px solid #000;
                  padding: 0;
                  vertical-align: middle;
                }

                .logo-cell {
                  width: 18%;
                  height: 64px;
                  text-align: center;
                }

                .company-logo {
                  display: block;
                  max-width: 66px;
                  max-height: 58px;
                  margin: auto;
                  object-fit: contain;
                }

                .logo-fallback {
                  display: none;
                  width: 100%;
                  height: 62px;
                  align-items: center;
                  justify-content: center;
                  font-size: 30px;
                  font-weight: 900;
                }

                .title-cell {
                  width: 58%;
                  text-align: center;
                  padding: 5px 8px !important;
                }

                .company-name {
                  font-size: 15px;
                  font-weight: 800;
                  letter-spacing: 0.2px;
                  text-transform: uppercase;
                }

                .document-title {
                  margin-top: 14px;
                  font-size: 16px;
                  font-weight: 800;
                }

                .document-cell {
                  width: 24%;
                  padding: 5px 7px !important;
                  font-size: 9px;
                  font-weight: 700;
                  line-height: 1.2;
                }

                .top-info {
                  width: 86%;
                  margin: 0 auto 22px;
                  font-size: 11px;
                  font-weight: 700;
                }

                .info-row {
                  display: grid;
                  grid-template-columns: 1fr 1fr;
                  align-items: center;
                  min-height: 26px;
                }

                .info-row.single {
                  grid-template-columns: 1fr;
                }

                .right-info {
                  text-align: right;
                }

                .value-line {
                  display: inline-block;
                  min-width: 95px;
                  margin-left: 5px;
                  border-bottom: 1px solid #000;
                  padding: 0 3px 2px;
                  font-weight: 500;
                }

                .attention-block {
                  margin-top: 9px;
                  line-height: 1.8;
                }

                .items-table {
                  width: 88%;
                  margin: 0 auto;
                  border-collapse: collapse;
                  table-layout: fixed;
                  font-size: 9px;
                }

                .items-table th,
                .items-table td {
                  border: 1px solid #000;
                  height: 18px;
                  padding: 2px 4px;
                  vertical-align: middle;
                }

                .items-table th {
                  height: 20px;
                  font-size: 8px;
                  font-weight: 800;
                  text-align: center;
                }

                .items-table th:nth-child(1),
                .items-table td:nth-child(1) {
                  width: 31%;
                }

                .items-table th:nth-child(2),
                .items-table td:nth-child(2) {
                  width: 16%;
                }

                .items-table th:nth-child(3),
                .items-table td:nth-child(3) {
                  width: 14%;
                }

                .items-table th:nth-child(4),
                .items-table td:nth-child(4) {
                  width: 11%;
                }

                .items-table th:nth-child(5),
                .items-table td:nth-child(5) {
                  width: 14%;
                }

                .items-table th:nth-child(6),
                .items-table td:nth-child(6) {
                  width: 14%;
                }

                .particulars {
                  text-align: left;
                }

                .center {
                  text-align: center;
                }

                .right {
                  text-align: right;
                }

                .blank-row td {
                  height: 18px;
                }

                .total-row td {
                  height: 20px;
                  font-weight: 800;
                }

                .total-label {
                  text-align: center;
                }

                .remarks {
                  width: 88%;
                  min-height: 28px;
                  margin: 8px auto 0;
                  font-size: 9px;
                }

                .signature-area {
                  width: 86%;
                  margin: 14px auto 0;
                  font-size: 11px;
                  font-weight: 700;
                }

                .signature-row {
                  display: grid;
                  grid-template-columns: 90px 1fr 48px 100px;
                  gap: 0;
                  align-items: end;
                  min-height: 38px;
                }

                .signature-row.final {
                  grid-template-columns: 45px 1fr 86px 1fr;
                }

                .signature-line {
                  min-height: 18px;
                  border-bottom: 1px solid #000;
                  padding: 0 5px 2px;
                  font-weight: 500;
                }

                .signature-date {
                  text-align: center;
                }

                @media print {
                  body {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                  }
                }
              </style>
            </head>

            <body>
              <div class="page">
                <table class="document-header">
                  <tr>
                    <td class="logo-cell">
                      <img
                        class="company-logo"
                        src="${safeText(
                          logoUrl
                        )}"
                        alt="${safeText(
                          companyName
                        )}"
                        onerror="this.style.display='none';document.getElementById('logoFallback').style.display='flex';"
                      />

                      <div
                        id="logoFallback"
                        class="logo-fallback"
                      >
                        ${safeText(
                          logoInitials
                        )}
                      </div>
                    </td>

                    <td class="title-cell">
                      <div class="company-name">
                        ${safeText(
                          companyName
                        )}
                      </div>

                      <div class="document-title">
                        DELIVERY CHALLAN
                      </div>
                    </td>

                    <td class="document-cell">
                      <div>
                        ${safeText(
                          challan.documentNo ||
                            "UP-DC-01 / 01"
                        )}
                      </div>

                      <div>
                        Issue:
                        ${safeText(
                          challan.issueNo ||
                            "01"
                        )},
                        Rev:
                        ${safeText(
                          challan.revisionNo ||
                            "00"
                        )}
                      </div>

                      <div>
                        Doc. Issued:
                        ${safeText(
                          formatDate(
                            challan.documentIssueDate ||
                              challan.challanDate
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                </table>

                <div class="top-info">
                  <div class="info-row">
                    <div>
                      S.NO:
                      <span class="value-line">${safeText(
                        challan.challanNo ||
                          ""
                      )}</span>
                    </div>

                    <div></div>
                  </div>

                  <div class="info-row">
                    <div>
                      DATED:
                      <span class="value-line">${safeText(
                        formatDate(
                          challan.challanDate
                        )
                      )}</span>
                    </div>

                    <div class="right-info">
                      PO #
                      <span class="value-line">${safeText(
                        challan.poNo ||
                          ""
                      )}</span>
                    </div>
                  </div>

                  <div class="info-row">
                    <div>
                      SOURCE:
                      <span class="value-line">${safeText(
                        challan.sourceNo ||
                          challan.salesOrderNo ||
                          challan.productionOutput?.readyNo ||
                          ""
                      )}</span>
                    </div>

                    <div class="right-info">
                      ${safeText(
                        challan.sourceType ||
                          (
                            challan.productionOutput
                              ? "Production Output"
                              : "Sales Order"
                          )
                      )}
                      ${
                        challan.productionJob?.jobNo ||
                        challan.productionOutput?.jobNo
                          ? ` / JOB: ${safeText(
                              challan.productionJob?.jobNo ||
                                challan.productionOutput?.jobNo
                            )}`
                          : ""
                      }
                    </div>
                  </div>

                  <div class="attention-block">
                    <div>
                      ATTN:
                      <span class="value-line">${safeText(
                        challan.attentionTo ||
                          challan.customerName ||
                          ""
                      )}</span>
                    </div>

                    <div>
                      ${safeText(
                        challan.customerName ||
                          ""
                      )}
                    </div>
                  </div>
                </div>

                <table class="items-table">
                  <thead>
                    <tr>
                      <th>PARTICULARS</th>
                      <th>SIZE</th>
                      <th>Carton</th>
                      <th>Rolls</th>
                      <th>Gross Weight</th>
                      <th>Net Weight</th>
                    </tr>
                  </thead>

                  <tbody>
                    ${rows}

                    <tr class="total-row">
                      <td class="total-label">
                        TOTAL
                      </td>

                      <td></td>

                      <td class="center">
                        ${printNumber(
                          totalCartons,
                          " ctn"
                        )}
                      </td>

                      <td class="center">
                        ${printNumber(
                          totalRolls,
                          " roll"
                        )}
                      </td>

                      <td class="right">
                        ${printNumber(
                          totalGrossWeight,
                          " kg"
                        )}
                      </td>

                      <td class="right">
                        ${printNumber(
                          totalNetWeight,
                          " kg"
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div class="remarks">
                  ${
                    challan.remarks
                      ? `<b>Remarks:</b> ${safeText(
                          challan.remarks
                        )}`
                      : ""
                  }
                </div>

                <div class="signature-area">
                  <div class="signature-row">
                    <div>PREPARED BY:</div>

                    <div class="signature-line">
                      ${safeText(
                        challan.preparedBy ||
                          ""
                      )}
                    </div>

                    <div class="signature-date">
                      DATE:
                    </div>

                    <div class="signature-line">
                      ${safeText(
                        formatDate(
                          challan.challanDate
                        )
                      )}
                    </div>
                  </div>

                  <div class="signature-row">
                    <div>DISPATCH BY:</div>

                    <div class="signature-line">
                      ${safeText(
                        challan.dispatchedBy ||
                          ""
                      )}
                    </div>

                    <div class="signature-date">
                      DATE:
                    </div>

                    <div class="signature-line">
                      ${safeText(
                        challan.dispatchDate
                          ? formatDate(
                              challan.dispatchDate
                            )
                          : ""
                      )}
                    </div>
                  </div>

                  <div class="signature-row">
                    <div>RECEIVED BY:</div>

                    <div class="signature-line">
                      ${safeText(
                        challan.receivedBy ||
                          ""
                      )}
                    </div>

                    <div class="signature-date">
                      DATE:
                    </div>

                    <div class="signature-line">
                      ${safeText(
                        challan.receivedDate
                          ? formatDate(
                              challan.receivedDate
                            )
                          : ""
                      )}
                    </div>
                  </div>

                  <div class="signature-row final">
                    <div>NAME:</div>

                    <div class="signature-line">
                      ${safeText(
                        challan.receivedBy ||
                          ""
                      )}
                    </div>

                    <div>DESIGNATION:</div>

                    <div class="signature-line">
                      ${safeText(
                        challan.receiverDesignation ||
                          ""
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <script>
                const logo =
                  document.querySelector(
                    ".company-logo"
                  );

                const startPrint =
                  () =>
                    setTimeout(
                      () =>
                        window.print(),
                      250
                    );

                if (
                  logo &&
                  !logo.complete
                ) {
                  logo.onload =
                    startPrint;

                  logo.onerror =
                    startPrint;
                } else {
                  startPrint();
                }
              </script>
            </body>
          </html>
        `);

        printWindow.document.close();
      };

    if (
      showForm
    ) {
      return (
        <div className="w-full p-3 sm:p-5 md:p-6">
          <div className="flex items-center justify-between rounded-t-xl bg-[#1e40af] p-5 text-white">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={
                  closeForm
                }
                className="rounded-lg p-1 hover:bg-blue-700"
              >
                <ArrowLeft
                  size={20}
                />
              </button>

              <h1 className="text-lg font-bold">
                {editId
                  ? "Edit Delivery Challan"
                  : "New Delivery Challan"}
              </h1>
            </div>

            <button
              type="button"
              onClick={
                closeForm
              }
              className="rounded-lg p-2 hover:bg-blue-700"
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-7 rounded-b-xl border-x border-b bg-white p-5 md:p-7">
            <Section title="Print Header">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Field label="Company Name">
                  <input
                    value={
                      form.companyName
                    }
                    onChange={(
                      event
                    ) =>
                      updateField(
                        "companyName",
                        event.target.value
                      )
                    }
                    className={
                      inputClass
                    }
                  />
                </Field>

                <Field
                  label="Company Logo Path / URL"
                  wide
                >
                  <input
                    value={
                      form.companyLogo
                    }
                    onChange={(
                      event
                    ) =>
                      updateField(
                        "companyLogo",
                        event.target.value
                      )
                    }
                    placeholder="/logo.png"
                    className={
                      inputClass
                    }
                  />
                </Field>

                <Field label="Document Number">
                  <input
                    value={
                      form.documentNo
                    }
                    onChange={(
                      event
                    ) =>
                      updateField(
                        "documentNo",
                        event.target.value
                      )
                    }
                    className={
                      inputClass
                    }
                  />
                </Field>

                <Field label="Issue Number">
                  <input
                    value={
                      form.issueNo
                    }
                    onChange={(
                      event
                    ) =>
                      updateField(
                        "issueNo",
                        event.target.value
                      )
                    }
                    className={
                      inputClass
                    }
                  />
                </Field>

                <Field label="Revision Number">
                  <input
                    value={
                      form.revisionNo
                    }
                    onChange={(
                      event
                    ) =>
                      updateField(
                        "revisionNo",
                        event.target.value
                      )
                    }
                    className={
                      inputClass
                    }
                  />
                </Field>

                <Field label="Document Issue Date">
                  <input
                    type="date"
                    value={
                      form.documentIssueDate
                    }
                    onChange={(
                      event
                    ) =>
                      updateField(
                        "documentIssueDate",
                        event.target.value
                      )
                    }
                    className={
                      inputClass
                    }
                  />
                </Field>
              </div>
            </Section>

            <Section title="Source and Customer">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Field label="Challan Number">
                  <input
                    value={
                      form.challanNo
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
                      handleSourceTypeChange(
                        event.target.value
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
                    <option value="Sales Order">
                      Sales Order
                    </option>

                    <option value="Production Output">
                      Production Output
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
                        handleSalesOrderChange(
                          event.target.value
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
                      <option value="">
                        Select Sales Order
                      </option>

                      {salesOrders.map(
                        (order) => (
                          <option
                            key={
                              order._id
                            }
                            value={
                              order._id
                            }
                          >
                            {
                              order.salesOrderNo
                            }{" "}
                            —{" "}
                            {
                              order.customerName
                            }
                          </option>
                        )
                      )}
                    </select>
                  </Field>
                ) : (
                  <div className="md:col-span-2 xl:col-span-4">
                    <div className="mb-2 flex flex-col gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-bold text-blue-800">
                          Select Production Outputs
                        </p>

                        <p className="text-[11px] text-blue-700">
                          Multiple outputs can be selected only when they belong to the same Sales Order and Customer.
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-blue-800">
                          Selected:{" "}
                          {
                            (
                              form.productionOutputs ||
                              []
                            ).length
                          }
                        </span>

                        <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-blue-800">
                          <input
                            type="checkbox"
                            checked={
                              compatibleProductionOutputs.length >
                                0 &&
                              compatibleProductionOutputs.every(
                                (output) =>
                                  (
                                    form.productionOutputs ||
                                    []
                                  ).includes(
                                    idOf(
                                      output._id
                                    )
                                  )
                              )
                            }
                            onChange={
                              toggleAllCompatibleOutputs
                            }
                          />

                          Select All Same Order
                        </label>
                      </div>
                    </div>

                    <div className="max-h-80 overflow-auto rounded-xl border">
                      <table className="w-full min-w-[1250px] text-left text-xs">
                        <thead className="sticky top-0 bg-slate-800 text-white">
                          <tr>
                            <th className="p-3 text-center">
                              Select
                            </th>

                            <th className="p-3">
                              Output
                            </th>

                            <th className="p-3">
                              Job
                            </th>

                            <th className="p-3">
                              Sales Order
                            </th>

                            <th className="p-3">
                              Finished Good
                            </th>

                            <th className="p-3">
                              Description
                            </th>

                            <th className="p-3">
                              Size
                            </th>

                            <th className="p-3">
                              Text Type
                            </th>

                            <th className="p-3 text-right">
                              Ready
                            </th>

                            <th className="p-3 text-right">
                              Delivered
                            </th>

                            <th className="p-3 text-right">
                              Remaining
                            </th>

                            <th className="p-3">
                              Unit
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {productionOutputs.length ===
                          0 ? (
                            <tr>
                              <td
                                colSpan="12"
                                className="p-8 text-center text-slate-400"
                              >
                                No posted Production Output is available for delivery.
                              </td>
                            </tr>
                          ) : (
                            productionOutputs.map(
                              (output) => {
                                const item =
                                  primaryOutputItem(
                                    output
                                  );

                                const outputId =
                                  idOf(
                                    output._id
                                  );

                                const selected =
                                  (
                                    form.productionOutputs ||
                                    []
                                  ).includes(
                                    outputId
                                  );

                                const compatible =
                                  !selectedOutputGroupKey ||
                                  outputCompatibilityKey(
                                    output
                                  ) ===
                                    selectedOutputGroupKey;

                                return (
                                  <tr
                                    key={
                                      outputId
                                    }
                                    className={`border-t ${
                                      selected
                                        ? "bg-blue-50"
                                        : compatible
                                          ? "hover:bg-slate-50"
                                          : "bg-slate-100 opacity-60"
                                    }`}
                                  >
                                    <td className="p-3 text-center">
                                      <input
                                        type="checkbox"
                                        checked={
                                          selected
                                        }
                                        disabled={
                                          !compatible
                                        }
                                        onChange={() =>
                                          toggleProductionOutput(
                                            outputId
                                          )
                                        }
                                      />
                                    </td>

                                    <td className="p-3 font-bold text-blue-700">
                                      {output.readyNo ||
                                        output.sourceNo ||
                                        "-"}
                                    </td>

                                    <td className="p-3">
                                      {output.jobNo ||
                                        output.productionJob?.jobNo ||
                                        "-"}
                                    </td>

                                    <td className="p-3">
                                      {output.salesOrderNo ||
                                        "Internal"}
                                    </td>

                                    <td className="p-3">
                                      <div className="font-semibold">
                                        {item.itemName ||
                                          item.description ||
                                          "Finished Good"}
                                      </div>

                                      <div className="font-mono text-[10px] text-blue-600">
                                        {item.itemCode ||
                                          ""}
                                      </div>
                                    </td>

                                    <td className="p-3">
                                      {item.description ||
                                        "-"}
                                    </td>

                                    <td className="p-3">
                                      {item.size ||
                                        "-"}
                                    </td>

                                    <td className="p-3">
                                      {item.textType ||
                                        "-"}
                                    </td>

                                    <td className="p-3 text-right">
                                      {formatQuantity(
                                        item.orderedQty
                                      )}
                                    </td>

                                    <td className="p-3 text-right">
                                      {formatQuantity(
                                        item.alreadyDeliveredQty
                                      )}
                                    </td>

                                    <td className="p-3 text-right font-bold text-orange-700">
                                      {formatQuantity(
                                        item.pendingQty
                                      )}
                                    </td>

                                    <td className="p-3">
                                      {item.unit ||
                                        "Pcs"}
                                    </td>
                                  </tr>
                                );
                              }
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <Field
                  label="Challan Date"
                  required
                >
                  <input
                    type="date"
                    value={
                      form.challanDate
                    }
                    onChange={(
                      event
                    ) =>
                      updateField(
                        "challanDate",
                        event.target.value
                      )
                    }
                    className={
                      inputClass
                    }
                  />
                </Field>

                <Field label="Dispatch Date">
                  <input
                    type="date"
                    value={
                      form.dispatchDate
                    }
                    onChange={(
                      event
                    ) =>
                      updateField(
                        "dispatchDate",
                        event.target.value
                      )
                    }
                    className={
                      inputClass
                    }
                  />
                </Field>

                <Field
                  label="Customer"
                  required
                >
                  <input
                    value={
                      form.customerName
                    }
                    onChange={(
                      event
                    ) =>
                      updateField(
                        "customerName",
                        event.target.value
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

                <Field label="PO Number">
                  <input
                    value={
                      form.poNo
                    }
                    onChange={(
                      event
                    ) =>
                      updateField(
                        "poNo",
                        event.target.value
                      )
                    }
                    className={
                      inputClass
                    }
                  />
                </Field>

                <Field label="Attention To">
                  <input
                    value={
                      form.attentionTo
                    }
                    onChange={(
                      event
                    ) =>
                      updateField(
                        "attentionTo",
                        event.target.value
                      )
                    }
                    className={
                      inputClass
                    }
                  />
                </Field>

                <Field label="Reference Number">
                  <input
                    value={
                      form.referenceNo
                    }
                    onChange={(
                      event
                    ) =>
                      updateField(
                        "referenceNo",
                        event.target.value
                      )
                    }
                    className={
                      inputClass
                    }
                  />
                </Field>

                <Field
                  label="Delivery Address"
                  wide
                >
                  <input
                    value={
                      form.deliveryAddress
                    }
                    onChange={(
                      event
                    ) =>
                      updateField(
                        "deliveryAddress",
                        event.target.value
                      )
                    }
                    className={
                      inputClass
                    }
                  />
                </Field>

                <Field label="Customer Phone">
                  <input
                    value={
                      form.customerPhone
                    }
                    onChange={(
                      event
                    ) =>
                      updateField(
                        "customerPhone",
                        event.target.value
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

                <Field label="Warehouse">
                  <input
                    value="Finished Goods Warehouse"
                    readOnly
                    className={
                      inputClass
                    }
                  />
                </Field>
              </div>
            </Section>

            <Section title="Finished Goods">
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full min-w-[1280px] text-left text-xs">
                  <thead className="bg-slate-800 text-white">
                    <tr>
                      <th className="p-3">
                        Finished Good
                      </th>

                      <th className="p-3 text-right">
                        {form.sourceType ===
                        "Production Output"
                          ? "Output Qty"
                          : "Ordered"}
                      </th>

                      <th className="p-3 text-right">
                        {form.sourceType ===
                        "Production Output"
                          ? "Dispatched"
                          : "Delivered"}
                      </th>

                      <th className="p-3 text-right">
                        {form.sourceType ===
                        "Production Output"
                          ? "Remaining"
                          : "Pending"}
                      </th>

                      <th className="p-3 text-right">
                        Available
                      </th>

                      <th className="p-3 text-right">
                        Dispatch Qty
                      </th>

                      <th className="p-3">
                        Unit
                      </th>

                      <th className="p-3 text-right">
                        Cartons
                      </th>

                      <th className="p-3 text-right">
                        Rolls
                      </th>

                      <th className="p-3 text-right">
                        Gross Wt.
                      </th>

                      <th className="p-3 text-right">
                        Net Wt.
                      </th>

                      <th className="p-3 text-center">
                        Remove
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {form.items.length ===
                    0 ? (
                      <tr>
                        <td
                          colSpan="12"
                          className="p-8 text-center text-slate-400"
                        >
                          {form.sourceType ===
                          "Production Output"
                            ? "Select one or more production outputs."
                            : "Select a sales order."}
                        </td>
                      </tr>
                    ) : (
                      form.items.map(
                        (
                          item,
                          index
                        ) => (
                          <tr
                            key={
                              item.salesOrderItemId ||
                              item.productionOutput ||
                              `${item.item}-${index}`
                            }
                            className="border-t"
                          >
                            <td className="p-3">
                              <div className="font-semibold text-slate-900">
                                {
                                  item.itemName
                                }
                              </div>

                              <div className="font-mono text-[10px] text-blue-600">
                                {
                                  item.itemCode
                                }
                              </div>

                              {form.sourceType ===
                                "Production Output" && (
                                <div className="mt-1 text-[10px] text-slate-500">
                                  {item.productionOutputNo ||
                                    "-"}
                                  {" • "}
                                  {item.productionJobNo ||
                                    "-"}
                                </div>
                              )}

                              <div className="mt-1 text-[10px] text-slate-500">
                                {item.description ||
                                  "-"}
                                {item.size
                                  ? ` • ${item.size}`
                                  : ""}
                                {item.textType
                                  ? ` • ${item.textType}`
                                  : ""}
                              </div>
                            </td>

                            <td className="p-3 text-right">
                              {formatQuantity(
                                item.orderedQty
                              )}
                            </td>

                            <td className="p-3 text-right">
                              {formatQuantity(
                                item.alreadyDeliveredQty
                              )}
                            </td>

                            <td className="p-3 text-right font-bold text-orange-700">
                              {formatQuantity(
                                item.pendingQty
                              )}
                            </td>

                            <td
                              className={`p-3 text-right font-bold ${
                                numberValue(
                                  item.availableStock
                                ) > 0
                                  ? "text-emerald-700"
                                  : "text-red-600"
                              }`}
                            >
                              {formatQuantity(
                                item.availableStock
                              )}
                            </td>

                            <td className="p-3">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                max={numberValue(
                                  item.pendingQty
                                )}
                                value={
                                  item.quantity
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateItem(
                                    index,
                                    "quantity",
                                    event.target.value
                                  )
                                }
                                className={
                                  inputClass
                                }
                              />
                            </td>

                            <td className="p-3">
                              {
                                item.unit
                              }
                            </td>

                            <td className="p-3">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={
                                  item.cartons
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateItem(
                                    index,
                                    "cartons",
                                    event.target.value
                                  )
                                }
                                className={
                                  inputClass
                                }
                              />
                            </td>

                            <td className="p-3">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={
                                  item.rolls
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateItem(
                                    index,
                                    "rolls",
                                    event.target.value
                                  )
                                }
                                className={
                                  inputClass
                                }
                              />
                            </td>

                            <td className="p-3">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={
                                  item.grossWeight
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateItem(
                                    index,
                                    "grossWeight",
                                    event.target.value
                                  )
                                }
                                className={
                                  inputClass
                                }
                              />
                            </td>

                            <td className="p-3">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={
                                  item.netWeight
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateItem(
                                    index,
                                    "netWeight",
                                    event.target.value
                                  )
                                }
                                className={
                                  inputClass
                                }
                              />
                            </td>

                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() =>
                                  removeItem(
                                    index
                                  )
                                }
                                className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                              >
                                <Trash2
                                  size={15}
                                />
                              </button>
                            </td>
                          </tr>
                        )
                      )
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
                <SummaryBox
                  label="Cartons"
                  value={formatQuantity(
                    totals.cartons
                  )}
                />

                <SummaryBox
                  label="Rolls"
                  value={formatQuantity(
                    totals.rolls
                  )}
                />

                <SummaryBox
                  label="Dispatch Quantity"
                  value={formatQuantity(
                    totals.quantity
                  )}
                />

                <SummaryBox
                  label="Gross Weight"
                  value={formatQuantity(
                    totals.grossWeight
                  )}
                />

                <SummaryBox
                  label="Net Weight"
                  value={formatQuantity(
                    totals.netWeight
                  )}
                />
              </div>
            </Section>

            <Section title="Dispatch Details">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Field label="Vehicle Number">
                  <input
                    value={
                      form.vehicleNo
                    }
                    onChange={(
                      event
                    ) =>
                      updateField(
                        "vehicleNo",
                        event.target.value
                      )
                    }
                    className={
                      inputClass
                    }
                  />
                </Field>

                <Field label="Driver Name">
                  <input
                    value={
                      form.driverName
                    }
                    onChange={(
                      event
                    ) =>
                      updateField(
                        "driverName",
                        event.target.value
                      )
                    }
                    className={
                      inputClass
                    }
                  />
                </Field>

                <Field label="Driver Phone">
                  <input
                    value={
                      form.driverPhone
                    }
                    onChange={(
                      event
                    ) =>
                      updateField(
                        "driverPhone",
                        event.target.value
                      )
                    }
                    className={
                      inputClass
                    }
                  />
                </Field>

                <Field label="Prepared By">
                  <input
                    value={
                      form.preparedBy
                    }
                    onChange={(
                      event
                    ) =>
                      updateField(
                        "preparedBy",
                        event.target.value
                      )
                    }
                    className={
                      inputClass
                    }
                  />
                </Field>

                <Field label="Dispatched By">
                  <input
                    value={
                      form.dispatchedBy
                    }
                    onChange={(
                      event
                    ) =>
                      updateField(
                        "dispatchedBy",
                        event.target.value
                      )
                    }
                    className={
                      inputClass
                    }
                  />
                </Field>

                <div className="md:col-span-2 xl:col-span-3">
                  <Field label="Remarks">
                    <textarea
                      rows="3"
                      value={
                        form.remarks
                      }
                      onChange={(
                        event
                      ) =>
                        updateField(
                          "remarks",
                          event.target.value
                        )
                      }
                      className={`${inputClass} min-h-[90px]`}
                    />
                  </Field>
                </div>
              </div>
            </Section>

            <div className="flex justify-end gap-3 border-t pt-5">
              <button
                type="button"
                onClick={
                  closeForm
                }
                className="rounded-lg border px-6 py-2.5 text-sm font-semibold text-slate-600"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  saveDraft
                }
                disabled={
                  saving
                }
                className="flex items-center gap-2 rounded-lg bg-blue-700 px-7 py-2.5 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-60"
              >
                {saving ? (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <FileText
                    size={17}
                  />
                )}

                {editId
                  ? "Update Draft"
                  : "Save Draft"}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full space-y-5 p-3 sm:p-5 md:p-6">
        <div className="flex flex-col gap-4 rounded-xl bg-[#1e40af] p-5 text-white shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                window.history.back()
              }
              className="rounded-lg p-1 hover:bg-blue-700"
            >
              <ArrowLeft
                size={20}
              />
            </button>

            <h1 className="text-xl font-bold">
              Delivery Challans
            </h1>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={
                fetchData
              }
              disabled={
                loading
              }
              className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20 disabled:opacity-60"
            >
              <RefreshCcw
                size={16}
                className={
                  loading
                    ? "animate-spin"
                    : ""
                }
              />

              Refresh
            </button>

            <button
              type="button"
              onClick={
                openNewForm
              }
              className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-bold text-blue-700"
            >
              <Plus size={16} />

              New Challan
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          <StatCard
            label="Total"
            value={
              stats.total
            }
            icon={
              FileText
            }
          />

          <StatCard
            label="Draft"
            value={
              stats.draft
            }
            icon={
              Package
            }
          />

          <StatCard
            label="Dispatched"
            value={
              stats.dispatched
            }
            icon={
              Truck
            }
          />

          <StatCard
            label="Received"
            value={
              stats.received
            }
            icon={
              CheckCircle2
            }
          />

          <StatCard
            label="Dispatched Quantity"
            value={formatQuantity(
              stats.quantity
            )}
            icon={
              Send
            }
          />

          <StatCard
            label="Pending Invoice"
            value={
              stats.uninvoiced
            }
            icon={
              FileText
            }
          />
        </div>

        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center md:justify-between">
            <h2 className="font-bold text-slate-800">
              Delivery Challan Register
            </h2>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={
                    search
                  }
                  onChange={(
                    event
                  ) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  className="w-full rounded-lg border py-2 pl-9 pr-3 text-xs sm:w-72"
                  placeholder="Search challan, order, customer, product..."
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
                    event.target.value
                  )
                }
                className="rounded-lg border px-3 py-2 text-xs"
              >
                <option value="All">
                  All Statuses
                </option>

                <option value="Draft">
                  Draft
                </option>

                <option value="Dispatched">
                  Dispatched
                </option>

                <option value="Received">
                  Received
                </option>

                <option value="Cancelled">
                  Cancelled
                </option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1350px] text-left text-xs">
              <thead className="bg-slate-800 uppercase text-white">
                <tr>
                  <th className="p-4">
                    Challan
                  </th>

                  <th className="p-4">
                    Source
                  </th>

                  <th className="p-4">
                    Customer
                  </th>

                  <th className="p-4">
                    Finished Goods
                  </th>

                  <th className="p-4 text-right">
                    Quantity
                  </th>

                  <th className="p-4">
                    Warehouse
                  </th>

                  <th className="p-4">
                    Dispatch
                  </th>

                  <th className="p-4 text-center">
                    Invoice
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
                      colSpan="10"
                      className="p-10 text-center"
                    >
                      <Loader2 className="mx-auto animate-spin text-blue-600" />
                    </td>
                  </tr>
                ) : filteredChallans.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan="10"
                      className="p-10 text-center text-slate-400"
                    >
                      No delivery challans found.
                    </td>
                  </tr>
                ) : (
                  filteredChallans.map(
                    (challan) => {
                      const busy =
                        actionId ===
                        challan._id;

                      return (
                        <tr
                          key={
                            challan._id
                          }
                          className="border-t hover:bg-slate-50"
                        >
                          <td className="p-4">
                            <div className="font-bold text-blue-700">
                              {
                                challan.challanNo
                              }
                            </div>

                            <div className="mt-1 text-[10px] text-slate-500">
                              {formatDate(
                                challan.challanDate
                              )}
                            </div>
                          </td>

                          <td className="p-4">
                            <div className="font-semibold">
                              {
                                challan.sourceNo ||
                                challan.salesOrderNo ||
                                (
                                  challan.productionOutputs ||
                                  []
                                )
                                  .map(
                                    (output) =>
                                      output.readyNo
                                  )
                                  .filter(Boolean)
                                  .join(", ") ||
                                challan.productionOutput?.readyNo ||
                                "-"
                              }
                            </div>

                            <div className="text-[10px] text-slate-500">
                              {challan.sourceType ||
                                (
                                  challan.productionOutput
                                    ? "Production Output"
                                    : "Sales Order"
                                )}
                              {" • "}
                              PO:{" "}
                              {challan.poNo ||
                                "-"}
                            </div>
                          </td>

                          <td className="p-4">
                            <div className="font-semibold">
                              {
                                challan.customerName
                              }
                            </div>

                            <div className="text-[10px] text-slate-500">
                              {challan.customerPhone ||
                                "-"}
                            </div>
                          </td>

                          <td className="p-4">
                            {(
                              challan.items ||
                              []
                            )
                              .slice(
                                0,
                                2
                              )
                              .map(
                                (item) => (
                                  <div
                                    key={
                                      item._id
                                    }
                                    className="mb-1"
                                  >
                                    <span className="font-semibold">
                                      {item.itemName ||
                                        item.description}
                                    </span>

                                    <span className="ml-1 font-mono text-[10px] text-blue-600">
                                      {
                                        item.itemCode
                                      }
                                    </span>
                                  </div>
                                )
                              )}

                            {(
                              challan.items ||
                              []
                            ).length >
                              2 && (
                              <div className="text-[10px] text-slate-500">
                                +
                                {challan.items.length -
                                  2}{" "}
                                more
                              </div>
                            )}
                          </td>

                          <td className="p-4 text-right font-bold">
                            {formatQuantity(
                              challan.totalQuantity
                            )}
                          </td>

                          <td className="p-4">
                            Finished Goods Warehouse
                          </td>

                          <td className="p-4">
                            <div>
                              {formatDate(
                                challan.dispatchDate
                              )}
                            </div>

                            <div className="text-[10px] text-slate-500">
                              {challan.vehicleNo ||
                                "-"}
                            </div>
                          </td>

                          <td className="p-4 text-center">
                            <span
                              className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                                challan.invoiceStatus ===
                                "Invoiced"
                                  ? "bg-purple-100 text-purple-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {challan.invoiceStatus ||
                                "Not Invoiced"}
                            </span>
                          </td>

                          <td className="p-4 text-center">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-bold ${statusClass(
                                challan.status
                              )}`}
                            >
                              {
                                challan.status
                              }
                            </span>
                          </td>

                          <td className="p-4">
                            <div className="flex justify-center gap-1.5">
                              <ActionButton
                                title="Print"
                                onClick={() =>
                                  printChallan(
                                    challan
                                  )
                                }
                                color="slate"
                              >
                                <Printer
                                  size={15}
                                />
                              </ActionButton>

                              {challan.status ===
                                "Draft" && (
                                <>
                                  <ActionButton
                                    title="Edit"
                                    onClick={() =>
                                      openEdit(
                                        challan
                                      )
                                    }
                                    disabled={
                                      busy
                                    }
                                    color="blue"
                                  >
                                    <Edit3
                                      size={15}
                                    />
                                  </ActionButton>

                                  <ActionButton
                                    title="Dispatch"
                                    onClick={() =>
                                      dispatchChallan(
                                        challan
                                      )
                                    }
                                    disabled={
                                      busy
                                    }
                                    color="emerald"
                                  >
                                    <Truck
                                      size={15}
                                    />
                                  </ActionButton>

                                  <ActionButton
                                    title="Delete"
                                    onClick={() =>
                                      deleteDraft(
                                        challan
                                      )
                                    }
                                    disabled={
                                      busy
                                    }
                                    color="red"
                                  >
                                    <Trash2
                                      size={15}
                                    />
                                  </ActionButton>
                                </>
                              )}

                              {challan.status ===
                                "Dispatched" && (
                                <ActionButton
                                  title="Mark Received"
                                  onClick={() =>
                                    receiveChallan(
                                      challan
                                    )
                                  }
                                  disabled={
                                    busy
                                  }
                                  color="emerald"
                                >
                                  <CheckCircle2
                                    size={15}
                                  />
                                </ActionButton>
                              )}

                              {[
                                "Draft",
                                "Dispatched",
                                "Received",
                              ].includes(
                                challan.status
                              ) &&
                                challan.invoiceStatus !==
                                  "Invoiced" && (
                                  <ActionButton
                                    title="Cancel"
                                    onClick={() =>
                                      cancelChallan(
                                        challan
                                      )
                                    }
                                    disabled={
                                      busy
                                    }
                                    color="orange"
                                  >
                                    <XCircle
                                      size={15}
                                    />
                                  </ActionButton>
                                )}

                              {busy && (
                                <Loader2
                                  size={15}
                                  className="animate-spin text-blue-600"
                                />
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
        </div>
      </div>
    );
  };

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

const SummaryBox = ({
  label,
  value,
}) => (
  <div className="rounded-xl border bg-slate-50 p-4">
    <p className="text-xs text-slate-500">
      {label}
    </p>

    <h3 className="mt-1 text-lg font-bold text-slate-900">
      {value}
    </h3>
  </div>
);

const StatCard = ({
  label,
  value,
  icon: Icon,
}) => (
  <div className="rounded-xl border bg-white p-4 shadow-sm">
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-xs text-slate-500">
          {label}
        </p>

        <h3 className="mt-1 text-xl font-bold text-slate-900">
          {value}
        </h3>
      </div>

      <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
        <Icon size={18} />
      </div>
    </div>
  </div>
);

const ActionButton = ({
  title,
  onClick,
  disabled,
  color,
  children,
}) => {
  const colors = {
    slate:
      "text-slate-600 hover:bg-slate-100",

    blue:
      "text-blue-600 hover:bg-blue-50",

    emerald:
      "text-emerald-600 hover:bg-emerald-50",

    orange:
      "text-orange-600 hover:bg-orange-50",

    red:
      "text-red-600 hover:bg-red-50",
  };

  return (
    <button
      type="button"
      title={
        title
      }
      onClick={
        onClick
      }
      disabled={
        disabled
      }
      className={`rounded-lg p-2 disabled:cursor-not-allowed disabled:opacity-40 ${colors[color]}`}
    >
      {children}
    </button>
  );
};

export default DeliveryChallans;