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
  salesOrder: "",
  salesOrderNo: "",
  poNo: "",
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  customerAddress: "",
  deliveryAddress: "",
  attentionTo: "",
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
          ] =
            await Promise.all([
              apiRequest(
                `${API_DELIVERY}/all`
              ),

              apiRequest(
                `${API_DELIVERY}/eligible-sales-orders`
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
                  challan.salesOrderNo,
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
        (current) => ({
          ...current,

          items:
            current.items.filter(
              (
                _,
                itemIndex
              ) =>
                itemIndex !==
                index
            ),
        })
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

          salesOrder:
            order._id,

          salesOrderNo:
            order.salesOrderNo ||
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
          !form.salesOrder
        ) {
          alert(
            "Please select a sales order."
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
              `${item.itemName}: delivery quantity cannot exceed pending quantity.`
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
        salesOrder:
          form.salesOrder,

        challanDate:
          form.challanDate,

        dispatchDate:
          form.dispatchDate,

        poNo:
          form.poNo.trim(),

        referenceNo:
          form.referenceNo.trim(),

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
                  item.salesOrderItemId,

                item:
                  item.item,

                description:
                  item.description.trim(),

                size:
                  item.size.trim(),

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
            "width=1100,height=850"
          );

        if (!printWindow) {
          alert(
            "Allow pop-ups and try again."
          );

          return;
        }

        const rows =
          (
            challan.items || []
          )
            .map(
              (
                item,
                index
              ) => `
                <tr>
                  <td>${index + 1}</td>

                  <td>
                    <b>${safeText(
                      item.itemName ||
                        item.description
                    )}</b><br />

                    <span>${safeText(
                      item.itemCode ||
                        ""
                    )}</span>
                  </td>

                  <td>${safeText(
                    item.size ||
                      ""
                  )}</td>

                  <td class="number">${formatQuantity(
                    item.cartons
                  )}</td>

                  <td class="number">${formatQuantity(
                    item.quantity
                  )}</td>

                  <td>${safeText(
                    item.unit ||
                      ""
                  )}</td>

                  <td class="number">${formatQuantity(
                    item.grossWeight
                  )}</td>

                  <td class="number">${formatQuantity(
                    item.netWeight
                  )}</td>
                </tr>
              `
            )
            .join("");

        printWindow.document.write(`
          <!doctype html>

          <html>
            <head>
              <meta charset="utf-8" />

              <title>${safeText(
                challan.challanNo
              )}</title>

              <style>
                @page {
                  size: A4 portrait;
                  margin: 10mm;
                }

                * {
                  box-sizing: border-box;
                }

                body {
                  font-family: Arial, sans-serif;
                  color: #111827;
                  margin: 0;
                  font-size: 11px;
                }

                h1 {
                  text-align: center;
                  margin: 0 0 4px;
                  font-size: 22px;
                }

                h2 {
                  text-align: center;
                  margin: 0 0 20px;
                  font-size: 16px;
                }

                .grid {
                  display: grid;
                  grid-template-columns: 1fr 1fr;
                  border: 1px solid #111827;
                }

                .cell {
                  padding: 8px;
                  border-bottom: 1px solid #111827;
                }

                .cell:nth-child(odd) {
                  border-right: 1px solid #111827;
                }

                table {
                  width: 100%;
                  border-collapse: collapse;
                  margin-top: 16px;
                }

                th,
                td {
                  border: 1px solid #111827;
                  padding: 7px;
                  vertical-align: top;
                }

                th {
                  background: #e5e7eb;
                  text-transform: uppercase;
                  font-size: 10px;
                }

                .number {
                  text-align: right;
                }

                .signatures {
                  display: grid;
                  grid-template-columns: repeat(3, 1fr);
                  gap: 30px;
                  margin-top: 70px;
                }

                .signature {
                  border-top: 1px solid #111827;
                  text-align: center;
                  padding-top: 6px;
                }
              </style>
            </head>

            <body>
              <h1>Delivery Challan</h1>

              <h2>${safeText(
                challan.challanNo
              )}</h2>

              <div class="grid">
                <div class="cell">
                  <b>Sales Order:</b>
                  ${safeText(
                    challan.salesOrderNo
                  )}
                </div>

                <div class="cell">
                  <b>Challan Date:</b>
                  ${safeText(
                    formatDate(
                      challan.challanDate
                    )
                  )}
                </div>

                <div class="cell">
                  <b>Customer:</b>
                  ${safeText(
                    challan.customerName
                  )}
                </div>

                <div class="cell">
                  <b>PO No:</b>
                  ${safeText(
                    challan.poNo ||
                      "-"
                  )}
                </div>

                <div class="cell">
                  <b>Delivery Address:</b>
                  ${safeText(
                    challan.deliveryAddress ||
                      challan.customerAddress ||
                      "-"
                  )}
                </div>

                <div class="cell">
                  <b>Contact:</b>
                  ${safeText(
                    challan.customerPhone ||
                      "-"
                  )}
                </div>

                <div class="cell">
                  <b>Vehicle:</b>
                  ${safeText(
                    challan.vehicleNo ||
                      "-"
                  )}
                </div>

                <div class="cell">
                  <b>Driver:</b>
                  ${safeText(
                    challan.driverName ||
                      "-"
                  )}
                </div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Finished Good</th>
                    <th>Size</th>
                    <th>Cartons</th>
                    <th>Quantity</th>
                    <th>Unit</th>
                    <th>Gross Weight</th>
                    <th>Net Weight</th>
                  </tr>
                </thead>

                <tbody>
                  ${rows}
                </tbody>
              </table>

              <p>
                <b>Remarks:</b>
                ${safeText(
                  challan.remarks ||
                    "-"
                )}
              </p>

              <div class="signatures">
                <div class="signature">
                  Prepared By
                </div>

                <div class="signature">
                  Dispatched By
                </div>

                <div class="signature">
                  Received By
                </div>
              </div>

              <script>
                window.print();
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
            <Section title="Sales Order">
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

                <Field label="Customer">
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
                    readOnly
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
                <table className="w-full min-w-[1180px] text-left text-xs">
                  <thead className="bg-slate-800 text-white">
                    <tr>
                      <th className="p-3">
                        Finished Good
                      </th>

                      <th className="p-3 text-right">
                        Ordered
                      </th>

                      <th className="p-3 text-right">
                        Delivered
                      </th>

                      <th className="p-3 text-right">
                        Pending
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
                          colSpan="11"
                          className="p-8 text-center text-slate-400"
                        >
                          Select a sales order.
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
                              item.salesOrderItemId
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

              <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <SummaryBox
                  label="Cartons"
                  value={formatQuantity(
                    totals.cartons
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
                    Sales Order
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
                                challan.salesOrderNo
                              }
                            </div>

                            <div className="text-[10px] text-slate-500">
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