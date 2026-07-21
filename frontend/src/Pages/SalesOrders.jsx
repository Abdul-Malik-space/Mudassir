import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Edit2,
  FileText,
  Loader2,
  Plus,
  Printer,
  RefreshCcw,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";

import {
  API_BASE_URL,
} from "../config/api";

const API_SALES =
  `${API_BASE_URL}/sales-orders`;

const FINISHED_GOODS_WAREHOUSE =
  "Finished Goods Warehouse";

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

const money = (
  value
) =>
  `Rs. ${numberValue(
    value
  ).toLocaleString(
    undefined,
    {
      maximumFractionDigits:
        2,
    }
  )}`;

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

const escapeHtml = (
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

const emptyItem = () => ({
  item: "",
  itemCode: "",
  itemName: "",
  warehouse:
    FINISHED_GOODS_WAREHOUSE,
  availableStock: 0,
  description: "",
  size: "",
  textType: "",
  cartons: "",
  quantity: "",
  deliveredQty: 0,
  pendingQty: 0,
  unit: "Pcs",
  unitPrice: "",
  remarks: "",
});

const emptyForm = (
  salesOrderNo = ""
) => ({
  salesOrderNo,
  customer: "",
  orderDate:
    todayDate(),
  deliveryDate: "",
  poNo: "",
  referenceNo: "",
  taxType:
    "without-tax",
  advance: "",
  status: "Draft",
  remarks: "",
  items: [
    emptyItem(),
  ],
});

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";

const statusClass = (
  status
) => {
  const classes = {
    Draft:
      "bg-slate-100 text-slate-700",

    Confirmed:
      "bg-blue-100 text-blue-700",

    "In Production":
      "bg-amber-100 text-amber-700",

    Ready:
      "bg-emerald-100 text-emerald-700",

    "Partially Delivered":
      "bg-orange-100 text-orange-700",

    Delivered:
      "bg-teal-100 text-teal-700",

    Invoiced:
      "bg-purple-100 text-purple-700",

    Cancelled:
      "bg-red-100 text-red-700",
  };

  return (
    classes[status] ||
    classes.Draft
  );
};

const SalesOrders =
  () => {
    const [
      customers,
      setCustomers,
    ] = useState([]);

    const [
      finishedGoods,
      setFinishedGoods,
    ] = useState([]);

    const [
      orders,
      setOrders,
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
      searchTerm,
      setSearchTerm,
    ] = useState("");

    const [
      statusFilter,
      setStatusFilter,
    ] = useState("All");

    const fetchCustomers =
      async () => {
        const data =
          await apiRequest(
            `${API_BASE_URL}/customers/all`
          );

        setCustomers(
          normalizeArray(
            data,
            [
              "customers",
            ]
          )
        );
      };

    const fetchFinishedGoods =
      async () => {
        const data =
          await apiRequest(
            `${API_SALES}/finished-goods`
          );

        setFinishedGoods(
          normalizeArray(
            data,
            [
              "items",
              "finishedGoods",
            ]
          )
        );
      };

    const fetchOrders =
      async () => {
        const data =
          await apiRequest(
            `${API_SALES}/all`
          );

        setOrders(
          normalizeArray(
            data,
            [
              "orders",
              "salesOrders",
            ]
          )
        );
      };

    const fetchData =
      async () => {
        try {
          setLoading(
            true
          );

          await Promise.all([
            fetchCustomers(),
            fetchFinishedGoods(),
            fetchOrders(),
          ]);
        } catch (error) {
          console.error(
            "Sales Order Load Error:",
            error
          );

          alert(
            error.message ||
              "Unable to load sales orders."
          );
        } finally {
          setLoading(
            false
          );
        }
      };

    useEffect(
      () => {
        fetchData();
      },
      []
    );

    const finishedGoodMap =
      useMemo(
        () =>
          new Map(
            finishedGoods.map(
              (item) => [
                String(
                  item._id
                ),
                item,
              ]
            )
          ),
        [
          finishedGoods,
        ]
      );

    const totals =
      useMemo(
        () => {
          const subtotal =
            form.items.reduce(
              (
                sum,
                item
              ) =>
                sum +
                numberValue(
                  item.quantity
                ) *
                  numberValue(
                    item.unitPrice
                  ),
              0
            );

          const salesTax =
            form.taxType ===
            "with-tax"
              ? subtotal *
                0.18
              : 0;

          const grandTotal =
            subtotal +
            salesTax;

          const advance =
            numberValue(
              form.advance
            );

          return {
            subtotal,
            salesTax,
            grandTotal,
            advance,

            balance:
              grandTotal -
              advance,
          };
        },
        [
          form.items,
          form.taxType,
          form.advance,
        ]
      );

    const stats =
      useMemo(
        () => ({
          total:
            orders.length,

          confirmed:
            orders.filter(
              (order) =>
                order.status ===
                "Confirmed"
            ).length,

          pendingDelivery:
            orders.filter(
              (order) =>
                [
                  "Confirmed",
                  "In Production",
                  "Ready",
                  "Partially Delivered",
                ].includes(
                  order.status
                )
            ).length,

          totalValue:
            orders.reduce(
              (
                sum,
                order
              ) =>
                sum +
                numberValue(
                  order.grandTotal
                ),
              0
            ),

          balance:
            orders.reduce(
              (
                sum,
                order
              ) =>
                sum +
                numberValue(
                  order.balance
                ),
              0
            ),
        }),
        [
          orders,
        ]
      );

    const filteredOrders =
      useMemo(
        () => {
          const keyword =
            searchTerm
              .trim()
              .toLowerCase();

          return orders.filter(
            (order) => {
              const searchable =
                [
                  order.salesOrderNo,
                  order.customerName,
                  order.customerPhone,
                  order.poNo,
                  order.referenceNo,

                  ...(
                    order.items ||
                    []
                  ).flatMap(
                    (item) => [
                      item.itemCode,
                      item.itemName,
                      item.description,
                    ]
                  ),
                ]
                  .filter(
                    Boolean
                  )
                  .join(" ")
                  .toLowerCase();

              return (
                (!keyword ||
                  searchable.includes(
                    keyword
                  )) &&

                (statusFilter ===
                  "All" ||
                  order.status ===
                    statusFilter)
              );
            }
          );
        },
        [
          orders,
          searchTerm,
          statusFilter,
        ]
      );

    const openNewForm =
      async () => {
        try {
          setSaving(
            true
          );

          await Promise.all([
            fetchCustomers(),
            fetchFinishedGoods(),
          ]);

          const data =
            await apiRequest(
              `${API_SALES}/next-no`
            );

          setEditId(
            null
          );

          setForm(
            emptyForm(
              data.salesOrderNo ||
                ""
            )
          );

          setShowForm(
            true
          );
        } catch (error) {
          alert(
            error.message ||
              "Unable to prepare a new sales order."
          );
        } finally {
          setSaving(
            false
          );
        }
      };

    const closeForm =
      () => {
        setShowForm(
          false
        );

        setEditId(
          null
        );

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

    const selectFinishedGood = (
      index,
      itemId
    ) => {
      const selected =
        finishedGoodMap.get(
          String(
            itemId
          )
        );

      setForm(
        (current) => {
          const items = [
            ...current.items,
          ];

          if (!selected) {
            items[index] =
              emptyItem();

            return {
              ...current,
              items,
            };
          }

          items[index] = {
            ...items[index],

            item:
              selected._id,

            itemCode:
              selected.code ||
              "",

            itemName:
              selected.name ||
              "",

            warehouse:
              FINISHED_GOODS_WAREHOUSE,

            availableStock:
              numberValue(
                selected.availableStock
              ),

            description:
              selected.name ||
              "",

            unit:
              selected.unit ||
              "Pcs",

            unitPrice:
              numberValue(
                selected.salePrice
              ) > 0
                ? String(
                    selected.salePrice
                  )
                : String(
                    selected.purchasePrice ||
                      0
                  ),
          };

          return {
            ...current,
            items,
          };
        }
      );
    };

    const addItemRow =
      () => {
        setForm(
          (current) => ({
            ...current,

            items: [
              ...current.items,
              emptyItem(),
            ],
          })
        );
      };

    const removeItemRow = (
      index
    ) => {
      setForm(
        (current) => ({
          ...current,

          items:
            current.items.length ===
            1
              ? [
                  emptyItem(),
                ]
              : current.items.filter(
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

    const validateForm =
      () => {
        if (
          !form.customer
        ) {
          alert(
            "Please select a customer."
          );

          return false;
        }

        if (
          !form.orderDate
        ) {
          alert(
            "Order date is required."
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
          validItems.length ===
          0
        ) {
          alert(
            "Add at least one Finished Good item."
          );

          return false;
        }

        const itemIds =
          validItems.map(
            (item) =>
              String(
                item.item
              )
          );

        if (
          new Set(
            itemIds
          ).size !==
          itemIds.length
        ) {
          alert(
            "The same Finished Good cannot be added more than once."
          );

          return false;
        }

        if (
          validItems.some(
            (item) =>
              numberValue(
                item.unitPrice
              ) < 0
          )
        ) {
          alert(
            "Unit price cannot be negative."
          );

          return false;
        }

        if (
          numberValue(
            form.advance
          ) >
          totals.grandTotal
        ) {
          alert(
            "Advance cannot exceed grand total."
          );

          return false;
        }

        return true;
      };

    const buildPayload =
      () => ({
        customer:
          form.customer,

        orderDate:
          form.orderDate,

        deliveryDate:
          form.deliveryDate,

        poNo:
          form.poNo.trim(),

        referenceNo:
          form.referenceNo.trim(),

        taxType:
          form.taxType,

        advance:
          numberValue(
            form.advance
          ),

        status:
          form.status,

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
                _id:
                  item._id ||
                  undefined,

                item:
                  item.item,

                description:
                  item.description.trim(),

                size:
                  item.size.trim(),

                textType:
                  item.textType,

                cartons:
                  numberValue(
                    item.cartons
                  ),

                quantity:
                  numberValue(
                    item.quantity
                  ),

                unit:
                  item.unit,

                unitPrice:
                  numberValue(
                    item.unitPrice
                  ),

                remarks:
                  item.remarks.trim(),
              })
            ),
      });

    const saveOrder =
      async () => {
        if (
          !validateForm()
        ) {
          return;
        }

        try {
          setSaving(
            true
          );

          await apiRequest(
            editId
              ? `${API_SALES}/update/${editId}`
              : `${API_SALES}/add`,

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
          console.error(
            "Sales Order Save Error:",
            error
          );

          alert(
            error.message ||
              "Unable to save sales order."
          );
        } finally {
          setSaving(
            false
          );
        }
      };

    const openEdit =
      async (
        order
      ) => {
        try {
          setSaving(
            true
          );

          await fetchFinishedGoods();

          setEditId(
            order._id
          );

          setForm({
            salesOrderNo:
              order.salesOrderNo ||
              "",

            customer:
              idOf(
                order.customer
              ),

            orderDate:
              order.orderDate ||
              todayDate(),

            deliveryDate:
              order.deliveryDate ||
              "",

            poNo:
              order.poNo ||
              "",

            referenceNo:
              order.referenceNo ||
              "",

            taxType:
              order.taxType ||
              "without-tax",

            advance:
              String(
                order.advance ??
                  ""
              ),

            status:
              [
                "Draft",
                "Confirmed",
              ].includes(
                order.status
              )
                ? order.status
                : "Confirmed",

            remarks:
              order.remarks ||
              "",

            items:
              order.items?.length
                ? order.items.map(
                    (item) => ({
                      _id:
                        item._id,

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

                      warehouse:
                        FINISHED_GOODS_WAREHOUSE,

                      availableStock:
                        numberValue(
                          finishedGoodMap.get(
                            idOf(
                              item.item
                            )
                          )
                            ?.availableStock ??
                            item.availableStock
                        ),

                      description:
                        item.description ||
                        item.itemName ||
                        "",

                      size:
                        item.size ||
                        "",

                      textType:
                        item.textType ||
                        "",

                      cartons:
                        String(
                          item.cartons ??
                            ""
                        ),

                      quantity:
                        String(
                          item.quantity ??
                            ""
                        ),

                      deliveredQty:
                        numberValue(
                          item.deliveredQty
                        ),

                      pendingQty:
                        numberValue(
                          item.pendingQty
                        ),

                      unit:
                        item.unit ||
                        "Pcs",

                      unitPrice:
                        String(
                          item.unitPrice ??
                            ""
                        ),

                      remarks:
                        item.remarks ||
                        "",
                    })
                  )
                : [
                    emptyItem(),
                  ],
          });

          setShowForm(
            true
          );
        } catch (error) {
          alert(
            error.message ||
              "Unable to open sales order."
          );
        } finally {
          setSaving(
            false
          );
        }
      };

    const confirmOrder =
      async (
        order
      ) => {
        if (
          !window.confirm(
            `Confirm ${order.salesOrderNo}?`
          )
        ) {
          return;
        }

        try {
          setActionId(
            order._id
          );

          await apiRequest(
            `${API_SALES}/status/${order._id}`,

            {
              method:
                "PATCH",

              body:
                JSON.stringify({
                  status:
                    "Confirmed",
                }),
            }
          );

          await fetchData();
        } catch (error) {
          alert(
            error.message ||
              "Unable to confirm sales order."
          );
        } finally {
          setActionId(
            ""
          );
        }
      };

    const deleteOrder =
      async (
        order
      ) => {
        if (
          !window.confirm(
            `Delete ${order.salesOrderNo}?`
          )
        ) {
          return;
        }

        try {
          setActionId(
            order._id
          );

          await apiRequest(
            `${API_SALES}/delete/${order._id}`,

            {
              method:
                "DELETE",
            }
          );

          await fetchData();
        } catch (error) {
          alert(
            error.message ||
              "Unable to delete sales order."
          );
        } finally {
          setActionId(
            ""
          );
        }
      };

    const printOrder =
      (
        order
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
            order.items ||
            []
          )
            .map(
              (
                item,
                index
              ) => `
                <tr>
                  <td>${index + 1}</td>

                  <td>
                    <b>${escapeHtml(
                      item.itemName ||
                        item.description
                    )}</b><br/>

                    <small>${escapeHtml(
                      item.itemCode ||
                        ""
                    )}</small>
                  </td>

                  <td>${escapeHtml(
                    item.size ||
                      ""
                  )}</td>

                  <td>${escapeHtml(
                    FINISHED_GOODS_WAREHOUSE
                  )}</td>

                  <td class="number">${formatQuantity(
                    item.cartons
                  )}</td>

                  <td class="number">${formatQuantity(
                    item.quantity
                  )}</td>

                  <td>${escapeHtml(
                    item.unit ||
                      ""
                  )}</td>

                  <td class="number">${money(
                    item.unitPrice
                  )}</td>

                  <td class="number">${money(
                    item.amount
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

              <title>${escapeHtml(
                order.salesOrderNo
              )}</title>

              <style>
                @page {
                  size: A4 landscape;
                  margin: 9mm;
                }

                * {
                  box-sizing: border-box;
                }

                body {
                  margin: 0;
                  font-family: Arial, sans-serif;
                  color: #111827;
                  font-size: 12px;
                }

                .header {
                  display: flex;
                  justify-content: space-between;
                  border-bottom: 2px solid #111827;
                  padding-bottom: 12px;
                }

                h1 {
                  margin: 0;
                  font-size: 28px;
                }

                h2 {
                  margin: 18px 0;
                  text-align: center;
                  text-decoration: underline;
                }

                .box {
                  border: 1px solid #111827;
                  padding: 10px;
                  line-height: 1.7;
                }

                table {
                  width: 100%;
                  border-collapse: collapse;
                  margin-top: 14px;
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
                }

                .number {
                  text-align: right;
                }

                .totals {
                  width: 360px;
                  margin-left: auto;
                  margin-top: 15px;
                }

                .totals div {
                  display: flex;
                  justify-content: space-between;
                  border-bottom: 1px solid #9ca3af;
                  padding: 7px 0;
                }

                .signatures {
                  display: flex;
                  justify-content: space-between;
                  margin-top: 55px;
                }
              </style>
            </head>

            <body>
              <div class="header">
                <div>
                  <h1>Muddasir Packages</h1>
                  <b>Sales Order</b>
                </div>

                <div>
                  <b>Sales Order:</b>
                  ${escapeHtml(
                    order.salesOrderNo
                  )}<br/>

                  <b>Order Date:</b>
                  ${escapeHtml(
                    order.orderDate
                  )}<br/>

                  <b>Delivery Date:</b>
                  ${escapeHtml(
                    order.deliveryDate ||
                      "-"
                  )}<br/>

                  <b>Status:</b>
                  ${escapeHtml(
                    order.status
                  )}
                </div>
              </div>

              <h2>SALES ORDER</h2>

              <div class="box">
                <b>Customer:</b>
                ${escapeHtml(
                  order.customerName
                )}<br/>

                <b>Phone:</b>
                ${escapeHtml(
                  order.customerPhone ||
                    "-"
                )}<br/>

                <b>Email:</b>
                ${escapeHtml(
                  order.customerEmail ||
                    "-"
                )}<br/>

                <b>Address:</b>
                ${escapeHtml(
                  order.customerAddress ||
                    "-"
                )}<br/>

                <b>PO No:</b>
                ${escapeHtml(
                  order.poNo ||
                    "-"
                )}
              </div>

              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Finished Good</th>
                    <th>Size</th>
                    <th>Warehouse</th>
                    <th>Cartons</th>
                    <th>Quantity</th>
                    <th>Unit</th>
                    <th>Unit Price</th>
                    <th>Amount</th>
                  </tr>
                </thead>

                <tbody>
                  ${rows}
                </tbody>
              </table>

              <div class="totals">
                <div>
                  <span>Subtotal</span>
                  <b>${money(
                    order.subtotal
                  )}</b>
                </div>

                <div>
                  <span>Sales Tax ${numberValue(
                    order.taxRate
                  )}%</span>
                  <b>${money(
                    order.salesTax
                  )}</b>
                </div>

                <div>
                  <span>Grand Total</span>
                  <b>${money(
                    order.grandTotal
                  )}</b>
                </div>

                <div>
                  <span>Advance</span>
                  <b>${money(
                    order.advance
                  )}</b>
                </div>

                <div>
                  <span>Balance</span>
                  <b>${money(
                    order.balance
                  )}</b>
                </div>
              </div>

              <p>
                <b>Remarks:</b>
                ${escapeHtml(
                  order.remarks ||
                    "-"
                )}
              </p>

              <div class="signatures">
                <span>Prepared By: __________________</span>
                <span>Approved By: __________________</span>
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
        <div className="w-full space-y-5 p-3 sm:p-5">
          <div className="rounded-xl border bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <button
                  type="button"
                  onClick={
                    closeForm
                  }
                  className="mb-3 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
                >
                  <ArrowLeft
                    size={
                      17
                    }
                  />

                  Back to Sales Orders
                </button>

                <h1 className="text-2xl font-bold text-slate-900">
                  {editId
                    ? "Edit Sales Order"
                    : "New Sales Order"}
                </h1>
              </div>

              <button
                type="button"
                onClick={
                  closeForm
                }
                className="inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2"
              >
                <X
                  size={
                    18
                  }
                />

                Cancel
              </button>
            </div>

            <div className="space-y-6 p-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Field
                  label="Sales Order Number"
                  required
                >
                  <input
                    value={
                      form.salesOrderNo
                    }
                    readOnly
                    className={`${inputClass} font-mono`}
                  />
                </Field>

                <Field
                  label="Customer"
                  required
                >
                  <select
                    value={
                      form.customer
                    }
                    onChange={(
                      event
                    ) =>
                      updateField(
                        "customer",
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
                      Select Customer
                    </option>

                    {customers.map(
                      (
                        customer
                      ) => (
                        <option
                          key={
                            customer._id
                          }
                          value={
                            customer._id
                          }
                        >
                          {customer.customerName ||
                            customer.name}
                        </option>
                      )
                    )}
                  </select>
                </Field>

                <Field
                  label="Order Date"
                  required
                >
                  <input
                    type="date"
                    value={
                      form.orderDate
                    }
                    onChange={(
                      event
                    ) =>
                      updateField(
                        "orderDate",
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

                <Field label="Delivery Date">
                  <input
                    type="date"
                    value={
                      form.deliveryDate
                    }
                    onChange={(
                      event
                    ) =>
                      updateField(
                        "deliveryDate",
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

                <Field label="Customer PO Number">
                  <input
                    value={
                      form.poNo
                    }
                    onChange={(
                      event
                    ) =>
                      updateField(
                        "poNo",
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

                <Field
                  label="Tax Type"
                  required
                >
                  <select
                    value={
                      form.taxType
                    }
                    onChange={(
                      event
                    ) =>
                      updateField(
                        "taxType",
                        event
                          .target
                          .value
                      )
                    }
                    className={
                      inputClass
                    }
                  >
                    <option value="without-tax">
                      Without Tax
                    </option>

                    <option value="with-tax">
                      Sales Tax 18%
                    </option>
                  </select>
                </Field>

                <Field label="Advance">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={
                      form.advance
                    }
                    onChange={(
                      event
                    ) =>
                      updateField(
                        "advance",
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

                <Field
                  label="Initial Status"
                  required
                >
                  <select
                    value={
                      form.status
                    }
                    onChange={(
                      event
                    ) =>
                      updateField(
                        "status",
                        event
                          .target
                          .value
                      )
                    }
                    className={
                      inputClass
                    }
                  >
                    <option value="Draft">
                      Draft
                    </option>

                    <option value="Confirmed">
                      Confirmed
                    </option>
                  </select>
                </Field>
              </div>

              <div className="overflow-hidden rounded-xl border">
                <div className="flex flex-col gap-3 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="font-bold text-slate-900">
                    Finished Goods
                  </h3>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={
                        fetchFinishedGoods
                      }
                      className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm"
                    >
                      <RefreshCcw
                        size={
                          15
                        }
                      />

                      Refresh
                    </button>

                    <button
                      type="button"
                      onClick={
                        addItemRow
                      }
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white"
                    >
                      <Plus
                        size={
                          15
                        }
                      />

                      Add Item
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1300px] text-left text-xs">
                    <thead className="bg-slate-800 text-white">
                      <tr>
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
                          Text
                        </th>

                        <th className="p-3">
                          Warehouse
                        </th>

                        <th className="p-3 text-right">
                          Current Stock
                        </th>

                        <th className="p-3 text-right">
                          Cartons
                        </th>

                        <th className="p-3 text-right">
                          Order Qty
                        </th>

                        <th className="p-3">
                          Unit
                        </th>

                        <th className="p-3 text-right">
                          Unit Price
                        </th>

                        <th className="p-3 text-right">
                          Amount
                        </th>

                        <th className="p-3 text-center">
                          Remove
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {form.items.map(
                        (
                          item,
                          index
                        ) => {
                          const productionRequired =
                            numberValue(
                              item.quantity
                            ) >
                            numberValue(
                              item.availableStock
                            );

                          return (
                            <tr
                              key={
                                index
                              }
                              className="border-t"
                            >
                              <td className="min-w-[270px] p-3">
                                <select
                                  value={
                                    item.item
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    selectFinishedGood(
                                      index,
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
                                    (
                                      finishedGood
                                    ) => {
                                      const selectedElsewhere =
                                        form.items.some(
                                          (
                                            row,
                                            rowIndex
                                          ) =>
                                            rowIndex !==
                                              index &&
                                            String(
                                              row.item
                                            ) ===
                                              String(
                                                finishedGood._id
                                              )
                                        );

                                      return (
                                        <option
                                          key={
                                            finishedGood._id
                                          }
                                          value={
                                            finishedGood._id
                                          }
                                          disabled={
                                            selectedElsewhere
                                          }
                                        >
                                          {
                                            finishedGood.code
                                          }{" "}
                                          —{" "}
                                          {
                                            finishedGood.name
                                          }{" "}
                                          | Stock:{" "}
                                          {formatQuantity(
                                            finishedGood.availableStock
                                          )}{" "}
                                          {
                                            finishedGood.unit
                                          }
                                        </option>
                                      );
                                    }
                                  )}
                                </select>
                              </td>

                              <td className="min-w-[210px] p-3">
                                <input
                                  value={
                                    item.description
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateItem(
                                      index,
                                      "description",
                                      event
                                        .target
                                        .value
                                    )
                                  }
                                  className={
                                    inputClass
                                  }
                                />
                              </td>

                              <td className="min-w-[130px] p-3">
                                <input
                                  value={
                                    item.size
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateItem(
                                      index,
                                      "size",
                                      event
                                        .target
                                        .value
                                    )
                                  }
                                  className={
                                    inputClass
                                  }
                                />
                              </td>

                              <td className="min-w-[125px] p-3">
                                <select
                                  value={
                                    item.textType
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateItem(
                                      index,
                                      "textType",
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
                                    Not Specified
                                  </option>

                                  <option value="with-text">
                                    With Text
                                  </option>

                                  <option value="without-text">
                                    Without Text
                                  </option>
                                </select>
                              </td>

                              <td className="min-w-[175px] p-3">
                                <input
                                  value={
                                    FINISHED_GOODS_WAREHOUSE
                                  }
                                  readOnly
                                  className={
                                    inputClass
                                  }
                                />
                              </td>

                              <td
                                className={`p-3 text-right font-bold ${
                                  productionRequired
                                    ? "text-amber-700"
                                    : "text-emerald-700"
                                }`}
                              >
                                <div className="flex items-center justify-end gap-1">
                                  {productionRequired && (
                                    <AlertTriangle
                                      size={
                                        14
                                      }
                                    />
                                  )}

                                  {formatQuantity(
                                    item.availableStock
                                  )}
                                </div>

                                {productionRequired && (
                                  <div className="mt-1 text-[10px] font-normal">
                                    Production required
                                  </div>
                                )}
                              </td>

                              <td className="min-w-[90px] p-3">
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
                                      event
                                        .target
                                        .value
                                    )
                                  }
                                  className={
                                    inputClass
                                  }
                                />
                              </td>

                              <td className="min-w-[110px] p-3">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={
                                    item.quantity
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateItem(
                                      index,
                                      "quantity",
                                      event
                                        .target
                                        .value
                                    )
                                  }
                                  className={
                                    inputClass
                                  }
                                />
                              </td>

                              <td className="min-w-[90px] p-3">
                                <input
                                  value={
                                    item.unit
                                  }
                                  readOnly
                                  className={
                                    inputClass
                                  }
                                />
                              </td>

                              <td className="min-w-[125px] p-3">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={
                                    item.unitPrice
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateItem(
                                      index,
                                      "unitPrice",
                                      event
                                        .target
                                        .value
                                    )
                                  }
                                  className={
                                    inputClass
                                  }
                                />
                              </td>

                              <td className="p-3 text-right font-bold">
                                {money(
                                  numberValue(
                                    item.quantity
                                  ) *
                                    numberValue(
                                      item.unitPrice
                                    )
                                )}
                              </td>

                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeItemRow(
                                      index
                                    )
                                  }
                                  className="rounded-lg bg-red-50 p-2 text-red-600 hover:bg-red-100"
                                >
                                  <Trash2
                                    size={
                                      15
                                    }
                                  />
                                </button>
                              </td>
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <Field label="Remarks">
                  <textarea
                    rows="5"
                    value={
                      form.remarks
                    }
                    onChange={(
                      event
                    ) =>
                      updateField(
                        "remarks",
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

                <div className="space-y-3 rounded-xl bg-slate-50 p-5">
                  <TotalRow
                    label="Subtotal"
                    value={money(
                      totals.subtotal
                    )}
                  />

                  <TotalRow
                    label={`Sales Tax ${
                      form.taxType ===
                      "with-tax"
                        ? "18%"
                        : "0%"
                    }`}
                    value={money(
                      totals.salesTax
                    )}
                  />

                  <TotalRow
                    label="Grand Total"
                    value={money(
                      totals.grandTotal
                    )}
                    strong
                  />

                  <TotalRow
                    label="Advance"
                    value={money(
                      totals.advance
                    )}
                  />

                  <TotalRow
                    label="Balance"
                    value={money(
                      totals.balance
                    )}
                    danger
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t pt-5">
                <button
                  type="button"
                  onClick={
                    closeForm
                  }
                  className="rounded-lg border px-6 py-2.5 text-sm font-semibold"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    saveOrder
                  }
                  disabled={
                    saving
                  }
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-6 py-2.5 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2
                      size={
                        17
                      }
                      className="animate-spin"
                    />
                  ) : (
                    <Save
                      size={
                        17
                      }
                    />
                  )}

                  {editId
                    ? "Update Sales Order"
                    : "Save Sales Order"}
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full space-y-5 p-3 sm:p-5">
        <div className="flex flex-col gap-4 rounded-xl bg-[#1e40af] p-5 text-white shadow-sm md:flex-row md:items-center md:justify-between">
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <FileText
              size={
                23
              }
            />

            Sales Orders
          </h1>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={
                fetchData
              }
              disabled={
                loading
              }
              className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20"
            >
              <RefreshCcw
                size={
                  16
                }
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
              disabled={
                saving
              }
              className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-bold text-blue-700"
            >
              <Plus
                size={
                  16
                }
              />

              New Sales Order
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatCard
            label="Total Orders"
            value={
              stats.total
            }
          />

          <StatCard
            label="Confirmed"
            value={
              stats.confirmed
            }
          />

          <StatCard
            label="Pending Delivery"
            value={
              stats.pendingDelivery
            }
          />

          <StatCard
            label="Total Value"
            value={money(
              stats.totalValue
            )}
          />

          <StatCard
            label="Balance"
            value={money(
              stats.balance
            )}
            danger
          />
        </div>

        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="font-bold text-slate-900">
              Sales Order Register
            </h2>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search
                  size={
                    15
                  }
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={
                    searchTerm
                  }
                  onChange={(
                    event
                  ) =>
                    setSearchTerm(
                      event
                        .target
                        .value
                    )
                  }
                  placeholder="Search order, customer, product..."
                  className="w-full rounded-lg border py-2 pl-9 pr-3 text-xs sm:w-72"
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
                className="rounded-lg border px-3 py-2 text-xs"
              >
                <option value="All">
                  All Statuses
                </option>

                <option value="Draft">
                  Draft
                </option>

                <option value="Confirmed">
                  Confirmed
                </option>

                <option value="In Production">
                  In Production
                </option>

                <option value="Ready">
                  Ready
                </option>

                <option value="Partially Delivered">
                  Partially Delivered
                </option>

                <option value="Delivered">
                  Delivered
                </option>

                <option value="Invoiced">
                  Invoiced
                </option>

                <option value="Cancelled">
                  Cancelled
                </option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1250px] text-left text-xs">
              <thead className="bg-slate-800 uppercase text-white">
                <tr>
                  <th className="p-4">
                    Order
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

                  <th className="p-4 text-right">
                    Grand Total
                  </th>

                  <th className="p-4 text-right">
                    Balance
                  </th>

                  <th className="p-4">
                    Delivery Date
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
                      colSpan="9"
                      className="p-10 text-center"
                    >
                      <Loader2 className="mx-auto animate-spin text-blue-600" />
                    </td>
                  </tr>
                ) : filteredOrders.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan="9"
                      className="p-10 text-center text-slate-400"
                    >
                      No sales orders found.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map(
                    (order) => {
                      const busy =
                        actionId ===
                        order._id;

                      return (
                        <tr
                          key={
                            order._id
                          }
                          className="border-t hover:bg-slate-50"
                        >
                          <td className="p-4">
                            <div className="font-bold text-blue-700">
                              {
                                order.salesOrderNo
                              }
                            </div>

                            <div className="text-[10px] text-slate-500">
                              {
                                order.orderDate
                              }
                            </div>
                          </td>

                          <td className="p-4">
                            <div className="font-semibold">
                              {
                                order.customerName
                              }
                            </div>

                            <div className="text-[10px] text-slate-500">
                              {order.customerPhone ||
                                "-"}
                            </div>
                          </td>

                          <td className="p-4">
                            {(
                              order.items ||
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
                              order.items ||
                              []
                            ).length >
                              2 && (
                              <div className="text-[10px] text-slate-500">
                                +
                                {order.items.length -
                                  2}{" "}
                                more
                              </div>
                            )}
                          </td>

                          <td className="p-4 text-right font-bold">
                            {formatQuantity(
                              order.totalQuantity
                            )}
                          </td>

                          <td className="p-4 text-right font-bold">
                            {money(
                              order.grandTotal
                            )}
                          </td>

                          <td className="p-4 text-right font-bold text-red-600">
                            {money(
                              order.balance
                            )}
                          </td>

                          <td className="p-4">
                            {order.deliveryDate ||
                              "-"}
                          </td>

                          <td className="p-4 text-center">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold ${statusClass(
                                order.status
                              )}`}
                            >
                              {
                                order.status
                              }
                            </span>
                          </td>

                          <td className="p-4">
                            <div className="flex justify-center gap-1.5">
                              <ActionButton
                                title="Print"
                                onClick={() =>
                                  printOrder(
                                    order
                                  )
                                }
                                color="slate"
                              >
                                <Printer
                                  size={
                                    15
                                  }
                                />
                              </ActionButton>

                              {[
                                "Draft",
                                "Confirmed",
                              ].includes(
                                order.status
                              ) && (
                                <ActionButton
                                  title="Edit"
                                  onClick={() =>
                                    openEdit(
                                      order
                                    )
                                  }
                                  disabled={
                                    busy
                                  }
                                  color="blue"
                                >
                                  <Edit2
                                    size={
                                      15
                                    }
                                  />
                                </ActionButton>
                              )}

                              {order.status ===
                                "Draft" && (
                                <ActionButton
                                  title="Confirm"
                                  onClick={() =>
                                    confirmOrder(
                                      order
                                    )
                                  }
                                  disabled={
                                    busy
                                  }
                                  color="emerald"
                                >
                                  <CheckCircle2
                                    size={
                                      15
                                    }
                                  />
                                </ActionButton>
                              )}

                              {order.status ===
                                "Draft" && (
                                <ActionButton
                                  title="Delete"
                                  onClick={() =>
                                    deleteOrder(
                                      order
                                    )
                                  }
                                  disabled={
                                    busy
                                  }
                                  color="red"
                                >
                                  <Trash2
                                    size={
                                      15
                                    }
                                  />
                                </ActionButton>
                              )}

                              {busy && (
                                <Loader2
                                  size={
                                    15
                                  }
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

const Field = ({
  label,
  required = false,
  children,
}) => (
  <div>
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

const TotalRow = ({
  label,
  value,
  strong = false,
  danger = false,
}) => (
  <div
    className={`flex items-center justify-between gap-4 ${
      strong
        ? "border-t pt-3 text-lg"
        : ""
    } ${
      danger
        ? "text-red-600"
        : ""
    }`}
  >
    <span>
      {label}
    </span>

    <b>
      {value}
    </b>
  </div>
);

const StatCard = ({
  label,
  value,
  danger = false,
}) => (
  <div className="rounded-xl border bg-white p-4 shadow-sm">
    <p className="text-xs text-slate-500">
      {label}
    </p>

    <h3
      className={`mt-1 text-xl font-bold ${
        danger
          ? "text-red-600"
          : "text-slate-900"
      }`}
    >
      {value}
    </h3>
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

export default SalesOrders;