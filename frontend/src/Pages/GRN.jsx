import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  CheckCircle2,
  Edit2,
  Loader2,
  PackageCheck,
  Plus,
  Printer,
  RefreshCcw,
  Save,
  Search,
  Trash2,
  Warehouse,
  X,
  XCircle,
} from "lucide-react";

import {
  API_BASE_URL,
} from "../config/api";

const API_GRN =
  `${API_BASE_URL}/grns`;

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

const quantity = (
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

  return typeof value ===
    "object"
    ? String(
        value._id ||
          value.id ||
          ""
      )
    : String(value);
};

const normalizeArray = (
  data,
  keys = []
) => {
  if (
    Array.isArray(
      data
    )
  ) {
    return data;
  }

  for (
    const key of
    keys
  ) {
    if (
      Array.isArray(
        data?.[key]
      )
    ) {
      return data[
        key
      ];
    }
  }

  return Array.isArray(
    data?.data
  )
    ? data.data
    : [];
};

const escapeHtml = (
  value
) =>
  String(
    value ?? ""
  )
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

    if (
      !response.ok ||
      data?.success ===
        false
    ) {
      throw new Error(
        data.message ||
          data.error ||
          "Request failed"
      );
    }

    return data;
  };

const emptyForm = (
  grnNo = ""
) => ({
  grnNo,

  purchaseOrder: "",

  purchaseOrderNo: "",

  purchaseOrderStatus: "",

  purchaseOrderDate: "",

  expectedDate: "",

  referenceNo: "",

  taxType: "without-tax",

  taxRate: 0,

  vendor: "",

  vendorName: "",

  vendorPhone: "",

  vendorEmail: "",

  vendorAddress: "",

  receivedDate:
    todayDate(),

  challanNo: "",

  invoiceNo: "",

  vehicleNo: "",

  receivedBy: "",

  checkedBy: "",

  inspectionStatus:
    "Pending",

  status: "Draft",

  remarks: "",

  items: [],
});

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500";

const statusClass = (
  status
) =>
  ({
    Draft:
      "bg-slate-100 text-slate-700",

    Received:
      "bg-blue-100 text-blue-700",

    "Partially Received":
      "bg-orange-100 text-orange-700",

    Completed:
      "bg-emerald-100 text-emerald-700",

    Posted:
      "bg-purple-100 text-purple-700",

    Cancelled:
      "bg-red-100 text-red-700",
  }[status] ||
    "bg-slate-100 text-slate-700");

const GRN = () => {
  const [
    purchaseOrders,
    setPurchaseOrders,
  ] = useState([]);

  const [
    grns,
    setGrns,
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

  const [
    typeFilter,
    setTypeFilter,
  ] = useState("All");

  const fetchPurchaseOrders =
    async () => {
      const data =
        await apiRequest(
          `${API_GRN}/eligible-purchase-orders`
        );

      setPurchaseOrders(
        normalizeArray(
          data,
          [
            "purchaseOrders",
            "orders",
          ]
        )
      );
    };

  const fetchGrns =
    async () => {
      const data =
        await apiRequest(
          `${API_GRN}/all`
        );

      setGrns(
        normalizeArray(
          data,
          [
            "grns",
          ]
        )
      );
    };

  const refresh =
    async () => {
      try {
        setLoading(
          true
        );

        await Promise.all([
          fetchPurchaseOrders(),
          fetchGrns(),
        ]);
      } catch (error) {
        console.error(
          "GRN load error:",
          error
        );

        alert(
          error.message ||
            "Unable to load GRN data"
        );
      } finally {
        setLoading(
          false
        );
      }
    };

  useEffect(
    () => {
      refresh();

      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    []
  );

  const totals =
    useMemo(
      () =>
        form.items.reduce(
          (
            sum,
            item
          ) => {
            sum.cartons +=
              numberValue(
                item.cartons
              );

            sum.ordered +=
              numberValue(
                item.orderedQty
              );

            sum.previous +=
              numberValue(
                item.previousReceivedQty
              );

            sum.received +=
              numberValue(
                item.receivedQty
              );

            sum.accepted +=
              numberValue(
                item.acceptedQty
              );

            sum.rejected +=
              numberValue(
                item.rejectedQty
              );

            sum.pending +=
              numberValue(
                item.pendingQty
              );

            return sum;
          },
          {
            cartons: 0,
            ordered: 0,
            previous: 0,
            received: 0,
            accepted: 0,
            rejected: 0,
            pending: 0,
          }
        ),
      [
        form.items,
      ]
    );

  const warehouseSummary =
    useMemo(
      () => {
        const activeRows =
          form.items.filter(
            (item) =>
              numberValue(
                item.receivedQty
              ) > 0
          );

        const rows =
          activeRows.length
            ? activeRows
            : form.items;

        const names = [
          ...new Set(
            rows
              .map(
                (item) =>
                  item.warehouse
              )
              .filter(
                Boolean
              )
          ),
        ];

        if (
          !names.length
        ) {
          return "Auto by Item Type";
        }

        return names.length ===
          1
          ? names[0]
          : "Multiple Warehouses";
      },
      [
        form.items,
      ]
    );

  const filteredGrns =
    useMemo(
      () => {
        const keyword =
          search
            .trim()
            .toLowerCase();

        return grns.filter(
          (grn) => {
            const text =
              [
                grn.grnNo,
                grn.purchaseOrderNo,
                grn.vendorName,
                grn.receiptType,
                grn.warehouse,

                ...(
                  grn.items ||
                  []
                ).flatMap(
                  (item) => [
                    item.itemCode,
                    item.itemName,
                    item.itemType,
                    item.description,
                  ]
                ),
              ]
                .filter(
                  Boolean
                )
                .join(
                  " "
                )
                .toLowerCase();

            return (
              (!keyword ||
                text.includes(
                  keyword
                )) &&

              (statusFilter ===
                "All" ||
                grn.status ===
                  statusFilter) &&

              (typeFilter ===
                "All" ||
                grn.receiptType ===
                  typeFilter)
            );
          }
        );
      },
      [
        grns,
        search,
        statusFilter,
        typeFilter,
      ]
    );

  const openNew =
    async () => {
      try {
        setSaving(
          true
        );

        const [
          numberData,
        ] =
          await Promise.all([
            apiRequest(
              `${API_GRN}/next-no`
            ),

            fetchPurchaseOrders(),
          ]);

        setEditId(
          null
        );

        setForm(
          emptyForm(
            numberData.grnNo ||
              ""
          )
        );

        setShowForm(
          true
        );
      } catch (error) {
        alert(
          error.message ||
            "Unable to open a new GRN"
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

  const selectPurchaseOrder = (
    purchaseOrderId
  ) => {
    const order =
      purchaseOrders.find(
        (row) =>
          String(
            row._id
          ) ===
          String(
            purchaseOrderId
          )
      );

    if (!order) {
      setForm(
        (current) => ({
          ...emptyForm(
            current.grnNo
          ),

          receivedDate:
            current.receivedDate,
        })
      );

      return;
    }

    setForm(
      (current) => ({
        ...current,

        purchaseOrder:
          order._id,

        purchaseOrderNo:
          order.purchaseOrderNo ||
          order.orderNo ||
          "",

        purchaseOrderStatus:
          order.status ||
          "",

        purchaseOrderDate:
          order.purchaseOrderDate ||
          order.orderDate ||
          "",

        expectedDate:
          order.expectedDate ||
          order.deliveryDate ||
          "",

        referenceNo:
          order.referenceNo ||
          "",

        taxType:
          order.taxType ===
          "with-tax"
            ? "with-tax"
            : "without-tax",

        taxRate:
          numberValue(
            order.taxRate
          ),

        vendor:
          idOf(
            order.vendor
          ),

        vendorName:
          order.vendorName ||
          order.vendor?.vendorName ||
          order.vendor?.name ||
          "",

        vendorPhone:
          order.vendorPhone ||
          order.vendor?.phoneNumber ||
          order.vendor?.phone ||
          "",

        vendorEmail:
          order.vendorEmail ||
          order.vendor?.email ||
          "",

        vendorAddress:
          order.vendorAddress ||
          order.vendor?.address ||
          "",

        items:
          (
            order.items ||
            []
          ).map(
            (item) => ({
              purchaseOrderItemId:
                idOf(
                  item.purchaseOrderItemId
                ),

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

              itemType:
                item.itemType ||
                "",

              warehouseId:
                idOf(
                  item.warehouseId
                ),

              warehouse:
                item.warehouse ||
                "",

              description:
                item.description ||
                item.itemName ||
                "",

              size:
                item.size ||
                "",

              cartons:
                numberValue(
                  item.cartons
                ),

              orderedQty:
                numberValue(
                  item.orderedQty
                ),

              previousReceivedQty:
                numberValue(
                  item.previousReceivedQty
                ),

              pendingBeforeQty:
                numberValue(
                  item.pendingQty
                ),

              receivedQty:
                "",

              rejectedQty:
                "",

              acceptedQty:
                0,

              pendingQty:
                numberValue(
                  item.pendingQty
                ),

              unit:
                item.unit ||
                "Pcs",

              remarks:
                item.remarks ||
                "",
            })
          ),
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

        const row = {
          ...items[
            index
          ],

          [field]:
            value,
        };

        const receivedQty =
          numberValue(
            row.receivedQty
          );

        const rejectedQty =
          numberValue(
            row.rejectedQty
          );

        const acceptedQty =
          Math.max(
            receivedQty -
              rejectedQty,
            0
          );

        const pendingBefore =
          Math.max(
            numberValue(
              row.orderedQty
            ) -
              numberValue(
                row.previousReceivedQty
              ),
            0
          );

        row.acceptedQty =
          acceptedQty;

        row.pendingBeforeQty =
          pendingBefore;

        row.pendingQty =
          Math.max(
            pendingBefore -
              acceptedQty,
            0
          );

        items[index] =
          row;

        return {
          ...current,
          items,
        };
      }
    );
  };

  const receiveAllPending =
    () => {
      setForm(
        (current) => ({
          ...current,

          items:
            current.items.map(
              (item) => {
                const pendingBefore =
                  Math.max(
                    numberValue(
                      item.orderedQty
                    ) -
                      numberValue(
                        item.previousReceivedQty
                      ),
                    0
                  );

                return {
                  ...item,

                  pendingBeforeQty:
                    pendingBefore,

                  receivedQty:
                    pendingBefore
                      ? String(
                          pendingBefore
                        )
                      : "",

                  rejectedQty: "",

                  acceptedQty:
                    pendingBefore,

                  pendingQty: 0,
                };
              }
            ),
        })
      );
    };

  const clearReceivedQuantities =
    () => {
      setForm(
        (current) => ({
          ...current,

          items:
            current.items.map(
              (item) => {
                const pendingBefore =
                  Math.max(
                    numberValue(
                      item.orderedQty
                    ) -
                      numberValue(
                        item.previousReceivedQty
                      ),
                    0
                  );

                return {
                  ...item,

                  pendingBeforeQty:
                    pendingBefore,

                  receivedQty: "",

                  rejectedQty: "",

                  acceptedQty: 0,

                  pendingQty:
                    pendingBefore,
                };
              }
            ),
        })
      );
    };

  const validate =
    () => {
      if (
        !form.purchaseOrder
      ) {
        alert(
          "Select a Purchase Order"
        );

        return false;
      }

      if (
        !form.receivedDate
      ) {
        alert(
          "Received date is required"
        );

        return false;
      }

      const rows =
        form.items.filter(
          (item) =>
            numberValue(
              item.receivedQty
            ) > 0
        );

      if (
        !rows.length
      ) {
        alert(
          "Receive at least one item"
        );

        return false;
      }

      for (
        const item of
        rows
      ) {
        const receivedQty =
          numberValue(
            item.receivedQty
          );

        const rejectedQty =
          numberValue(
            item.rejectedQty
          );

        const acceptedQty =
          Math.max(
            receivedQty -
              rejectedQty,
            0
          );

        const pendingBefore =
          Math.max(
            numberValue(
              item.orderedQty
            ) -
              numberValue(
                item.previousReceivedQty
              ),
            0
          );

        if (
          rejectedQty >
          receivedQty
        ) {
          alert(
            `${item.itemName}: rejected quantity cannot exceed received quantity`
          );

          return false;
        }

        if (
          acceptedQty >
          pendingBefore
        ) {
          alert(
            `${item.itemName}: accepted quantity cannot exceed pending quantity ${quantity(
              pendingBefore
            )} ${item.unit}`
          );

          return false;
        }
      }

      if (
        form.status !==
        "Draft"
      ) {
        if (
          form.inspectionStatus ===
          "Pending"
        ) {
          alert(
            "Complete inspection before posting stock"
          );

          return false;
        }

        if (
          form.inspectionStatus ===
          "Rejected"
        ) {
          alert(
            "A rejected GRN cannot post stock"
          );

          return false;
        }

        if (
          totals.accepted <=
          0
        ) {
          alert(
            "Accepted quantity is required to post stock"
          );

          return false;
        }
      }

      return true;
    };

  const buildPayload =
    () => ({
      grnNo:
        form.grnNo.trim(),

      purchaseOrder:
        form.purchaseOrder,

      receivedDate:
        form.receivedDate,

      challanNo:
        form.challanNo.trim(),

      invoiceNo:
        form.invoiceNo.trim(),

      vehicleNo:
        form.vehicleNo.trim(),

      receivedBy:
        form.receivedBy.trim(),

      checkedBy:
        form.checkedBy.trim(),

      inspectionStatus:
        form.inspectionStatus,

      status:
        form.status,

      remarks:
        form.remarks.trim(),

      items:
        form.items
          .filter(
            (item) =>
              numberValue(
                item.receivedQty
              ) > 0
          )
          .map(
            (item) => ({
              purchaseOrderItemId:
                item.purchaseOrderItemId,

              item:
                item.item,

              description:
                item.description.trim(),

              size:
                item.size.trim(),

              receivedQty:
                numberValue(
                  item.receivedQty
                ),

              rejectedQty:
                numberValue(
                  item.rejectedQty
                ),

              unit:
                item.unit,

              remarks:
                item.remarks.trim(),
            })
          ),
    });

  const save =
    async () => {
      if (!validate()) {
        return;
      }

      try {
        setSaving(
          true
        );

        await apiRequest(
          editId
            ? `${API_GRN}/update/${editId}`
            : `${API_GRN}/add`,

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

        await refresh();

        closeForm();
      } catch (error) {
        alert(
          error.message ||
            "Unable to save GRN"
        );
      } finally {
        setSaving(
          false
        );
      }
    };

  const edit =
    async (
      grn
    ) => {
      if (
        grn.status !==
          "Draft" ||
        grn.stockPosted
      ) {
        alert(
          "Only an unposted Draft GRN can be edited"
        );

        return;
      }

      setEditId(
        grn._id
      );

      setForm({
        grnNo:
          grn.grnNo ||
          "",

        purchaseOrder:
          idOf(
            grn.purchaseOrder
          ),

        purchaseOrderNo:
          grn.purchaseOrderNo ||
          "",

        purchaseOrderStatus:
          grn.purchaseOrder?.status ||
          "",

        purchaseOrderDate:
          grn.purchaseOrderDate ||
          grn.purchaseOrder?.orderDate ||
          "",

        expectedDate:
          grn.expectedDate ||
          grn.purchaseOrder?.deliveryDate ||
          "",

        referenceNo:
          grn.referenceNo ||
          grn.purchaseOrder?.referenceNo ||
          "",

        taxType:
          (
            grn.taxType ||
            grn.purchaseOrder?.taxType
          ) ===
          "with-tax"
            ? "with-tax"
            : "without-tax",

        taxRate:
          numberValue(
            grn.taxRate ||
              grn.purchaseOrder?.taxRate
          ),

        vendor:
          idOf(
            grn.vendor
          ),

        vendorName:
          grn.vendorName ||
          "",

        vendorPhone:
          grn.vendorPhone ||
          "",

        vendorEmail:
          grn.vendorEmail ||
          "",

        vendorAddress:
          grn.vendorAddress ||
          "",

        receivedDate:
          grn.receivedDate ||
          todayDate(),

        challanNo:
          grn.challanNo ||
          "",

        invoiceNo:
          grn.invoiceNo ||
          "",

        vehicleNo:
          grn.vehicleNo ||
          "",

        receivedBy:
          grn.receivedBy ||
          "",

        checkedBy:
          grn.checkedBy ||
          "",

        inspectionStatus:
          grn.inspectionStatus ||
          "Pending",

        status:
          "Draft",

        remarks:
          grn.remarks ||
          "",

        items:
          (
            grn.items ||
            []
          ).map(
            (item) => ({
              purchaseOrderItemId:
                idOf(
                  item.purchaseOrderItemId
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

              itemType:
                item.itemType ||
                item.item?.itemType ||
                "",

              warehouseId:
                idOf(
                  item.warehouseId
                ),

              warehouse:
                item.warehouse ||
                "",

              description:
                item.description ||
                "",

              size:
                item.size ||
                "",

              cartons:
                numberValue(
                  item.cartons
                ),

              orderedQty:
                numberValue(
                  item.orderedQty
                ),

              previousReceivedQty:
                numberValue(
                  item.previousReceivedQty
                ),

              pendingBeforeQty:
                Math.max(
                  numberValue(
                    item.orderedQty
                  ) -
                    numberValue(
                      item.previousReceivedQty
                    ),
                  0
                ),

              receivedQty:
                String(
                  item.receivedQty ??
                    ""
                ),

              rejectedQty:
                String(
                  item.rejectedQty ??
                    ""
                ),

              acceptedQty:
                numberValue(
                  item.acceptedQty
                ),

              pendingQty:
                numberValue(
                  item.pendingQty
                ),

              unit:
                item.unit ||
                "Pcs",

              remarks:
                item.remarks ||
                "",
            })
          ),
      });

      setShowForm(
        true
      );
    };

  const postStock =
    async (
      grn
    ) => {
      if (
        grn.inspectionStatus ===
        "Pending"
      ) {
        alert(
          "Edit the GRN and complete inspection first"
        );

        return;
      }

      const nextStatus =
        numberValue(
          grn.totalPendingQty
        ) > 0
          ? "Partially Received"
          : "Completed";

      if (
        !window.confirm(
          `Post ${grn.grnNo} stock now?`
        )
      ) {
        return;
      }

      try {
        setActionId(
          grn._id
        );

        await apiRequest(
          `${API_GRN}/status/${grn._id}`,

          {
            method:
              "PATCH",

            body:
              JSON.stringify({
                status:
                  nextStatus,
              }),
          }
        );

        await refresh();
      } catch (error) {
        alert(
          error.message ||
            "Unable to post GRN stock"
        );
      } finally {
        setActionId(
          ""
        );
      }
    };

  const cancel =
    async (
      grn
    ) => {
      const reason =
        window.prompt(
          "Cancellation reason:",
          ""
        );

      if (
        reason === null
      ) {
        return;
      }

      try {
        setActionId(
          grn._id
        );

        await apiRequest(
          `${API_GRN}/status/${grn._id}`,

          {
            method:
              "PATCH",

            body:
              JSON.stringify({
                status:
                  "Cancelled",

                cancelReason:
                  reason.trim() ||
                  "GRN cancelled",
              }),
          }
        );

        await refresh();
      } catch (error) {
        alert(
          error.message ||
            "Unable to cancel GRN"
        );
      } finally {
        setActionId(
          ""
        );
      }
    };

  const remove =
    async (
      grn
    ) => {
      if (
        !window.confirm(
          `Delete ${grn.grnNo}?`
        )
      ) {
        return;
      }

      try {
        setActionId(
          grn._id
        );

        await apiRequest(
          `${API_GRN}/delete/${grn._id}`,

          {
            method:
              "DELETE",
          }
        );

        await refresh();
      } catch (error) {
        alert(
          error.message ||
            "Unable to delete GRN"
        );
      } finally {
        setActionId(
          ""
        );
      }
    };

  const printGrn = (
    grn
  ) => {
    const printWindow =
      window.open(
        "",
        "_blank",
        "width=1200,height=850"
      );

    if (
      !printWindow
    ) {
      alert(
        "Allow pop-ups and try again"
      );

      return;
    }

    const effectiveTaxType =
      grn.taxType ||
      grn.purchaseOrder?.taxType;

    const effectiveTaxRate =
      numberValue(
        grn.taxRate ||
          grn.purchaseOrder?.taxRate ||
          18
      );

    const taxLabel =
      effectiveTaxType ===
      "with-tax"
        ? `With Sales Tax ${effectiveTaxRate}%`
        : "Without Tax";

    const totalCartons =
      numberValue(
        grn.totalCartons
      ) ||
      (
        grn.items ||
        []
      ).reduce(
        (sum, item) =>
          sum +
          numberValue(
            item.cartons
          ),
        0
      );

    const rows =
      (
        grn.items ||
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
                )}</b>

                ${
                  item.itemCode
                    ? `<div class="muted">${escapeHtml(
                        item.itemCode
                      )}</div>`
                    : ""
                }

                ${
                  item.description &&
                  item.description !==
                    item.itemName
                    ? `<div>${escapeHtml(
                        item.description
                      )}</div>`
                    : ""
                }

                ${
                  item.size
                    ? `<div class="muted">Size: ${escapeHtml(
                        item.size
                      )}</div>`
                    : ""
                }
              </td>

              <td>${escapeHtml(
                item.itemType ||
                  ""
              )}</td>

              <td>${escapeHtml(
                item.warehouse ||
                  ""
              )}</td>

              <td>${quantity(
                item.cartons
              )}</td>

              <td>${quantity(
                item.orderedQty
              )}</td>

              <td>${quantity(
                item.previousReceivedQty
              )}</td>

              <td>${quantity(
                item.receivedQty
              )}</td>

              <td>${quantity(
                item.acceptedQty
              )}</td>

              <td>${quantity(
                item.rejectedQty
              )}</td>

              <td>${quantity(
                item.pendingQty
              )}</td>

              <td>${escapeHtml(
                item.unit ||
                  ""
              )}</td>

              <td>${escapeHtml(
                item.remarks ||
                  ""
              )}</td>
            </tr>
          `
        )
        .join("");

    printWindow.document.write(`
      <!doctype html>

      <html>
        <head>
          <meta charset="utf-8">

          <title>${escapeHtml(
            grn.grnNo
          )}</title>

          <style>
            @page {
              size: A4 landscape;
              margin: 8mm;
            }

            * {
              box-sizing: border-box;
            }

            body {
              font-family: Arial, sans-serif;
              font-size: 11px;
              color: #111827;
              margin: 0;
            }

            h1 {
              margin: 0;
              font-size: 22px;
              letter-spacing: 0.5px;
            }

            .header {
              display: flex;
              justify-content: space-between;
              gap: 24px;
              border-bottom: 2px solid #111827;
              padding-bottom: 10px;
              margin-bottom: 12px;
            }

            .header-right {
              line-height: 1.7;
              text-align: right;
            }

            .details {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 7px;
              margin-bottom: 12px;
            }

            .detail {
              border: 1px solid #d1d5db;
              border-radius: 4px;
              padding: 7px;
              min-height: 42px;
            }

            .detail.wide {
              grid-column: span 2;
            }

            .label {
              display: block;
              color: #4b5563;
              font-size: 9px;
              font-weight: bold;
              text-transform: uppercase;
              margin-bottom: 3px;
            }

            .muted {
              color: #6b7280;
              font-size: 9px;
              margin-top: 2px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
            }

            th,
            td {
              border: 1px solid #111827;
              padding: 6px;
              vertical-align: top;
            }

            th {
              background: #e5e7eb;
              font-size: 9px;
              text-transform: uppercase;
            }

            .summary {
              display: flex;
              justify-content: flex-end;
              gap: 18px;
              margin-top: 12px;
              font-weight: bold;
            }

            .footer {
              margin-top: 18px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 30px;
            }

            .sign {
              margin-top: 32px;
              border-top: 1px solid #111827;
              padding-top: 5px;
              text-align: center;
            }
          </style>
        </head>

        <body>
          <div class="header">
            <div>
              <h1>GOODS RECEIVING NOTE</h1>
              <div class="muted">
                Quantity-based receiving document
              </div>
            </div>

            <div class="header-right">
              <b>GRN:</b>
              ${escapeHtml(
                grn.grnNo
              )}<br>

              <b>PO:</b>
              ${escapeHtml(
                grn.purchaseOrderNo
              )}<br>

              <b>Received Date:</b>
              ${escapeHtml(
                grn.receivedDate
              )}
            </div>
          </div>

          <div class="details">
            <div class="detail">
              <span class="label">PO Date</span>
              ${escapeHtml(
                grn.purchaseOrderDate ||
                  grn.purchaseOrder?.orderDate ||
                  "-"
              )}
            </div>

            <div class="detail">
              <span class="label">Expected Date</span>
              ${escapeHtml(
                grn.expectedDate ||
                  grn.purchaseOrder?.expectedDate ||
                  grn.purchaseOrder?.deliveryDate ||
                  "-"
              )}
            </div>

            <div class="detail">
              <span class="label">Reference No</span>
              ${escapeHtml(
                grn.referenceNo ||
                  grn.purchaseOrder?.referenceNo ||
                  "-"
              )}
            </div>

            <div class="detail">
              <span class="label">Tax Treatment</span>
              ${escapeHtml(
                taxLabel
              )}
            </div>

            <div class="detail">
              <span class="label">Vendor</span>
              ${escapeHtml(
                grn.vendorName ||
                  "-"
              )}
            </div>

            <div class="detail">
              <span class="label">Vendor Phone</span>
              ${escapeHtml(
                grn.vendorPhone ||
                  "-"
              )}
            </div>

            <div class="detail">
              <span class="label">Vendor Email</span>
              ${escapeHtml(
                grn.vendorEmail ||
                  "-"
              )}
            </div>

            <div class="detail">
              <span class="label">Warehouse</span>
              ${escapeHtml(
                grn.warehouse ||
                  "-"
              )}
            </div>

            <div class="detail wide">
              <span class="label">Vendor Address</span>
              ${escapeHtml(
                grn.vendorAddress ||
                  "-"
              )}
            </div>

            <div class="detail">
              <span class="label">Supplier Challan</span>
              ${escapeHtml(
                grn.challanNo ||
                  "-"
              )}
            </div>

            <div class="detail">
              <span class="label">Supplier Invoice</span>
              ${escapeHtml(
                grn.invoiceNo ||
                  "-"
              )}
            </div>

            <div class="detail">
              <span class="label">Vehicle No</span>
              ${escapeHtml(
                grn.vehicleNo ||
                  "-"
              )}
            </div>

            <div class="detail">
              <span class="label">Inspection</span>
              ${escapeHtml(
                grn.inspectionStatus ||
                  "-"
              )}
            </div>

            <div class="detail">
              <span class="label">GRN Status</span>
              ${escapeHtml(
                grn.status ||
                  "-"
              )}
            </div>

            <div class="detail">
              <span class="label">Received By</span>
              ${escapeHtml(
                grn.receivedBy ||
                  "-"
              )}
            </div>

            <div class="detail">
              <span class="label">Checked By</span>
              ${escapeHtml(
                grn.checkedBy ||
                  "-"
              )}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Item Details</th>
                <th>Type</th>
                <th>Warehouse</th>
                <th>Cartons</th>
                <th>Ordered</th>
                <th>Previous</th>
                <th>Received</th>
                <th>Accepted</th>
                <th>Rejected</th>
                <th>Pending</th>
                <th>Unit</th>
                <th>Remarks</th>
              </tr>
            </thead>

            <tbody>
              ${rows}
            </tbody>
          </table>

          <div class="summary">
            <span>
              Cartons:
              ${quantity(
                totalCartons
              )}
            </span>

            <span>
              Received:
              ${quantity(
                grn.totalReceivedQty
              )}
            </span>

            <span>
              Accepted:
              ${quantity(
                grn.totalAcceptedQty
              )}
            </span>

            <span>
              Rejected:
              ${quantity(
                grn.totalRejectedQty
              )}
            </span>

            <span>
              Pending:
              ${quantity(
                grn.totalPendingQty
              )}
            </span>
          </div>

          <p>
            <b>Remarks:</b>
            ${escapeHtml(
              grn.remarks ||
                "-"
            )}
          </p>

          <div class="footer">
            <div class="sign">
              Received By
            </div>

            <div class="sign">
              Checked / Approved By
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
      <div className="w-full space-y-5 p-3 sm:p-5">
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b p-5">
            <div>
              <button
                type="button"
                onClick={
                  closeForm
                }
                className="mb-2 flex items-center gap-2 text-sm text-slate-600"
              >
                <ArrowLeft
                  size={17}
                />

                Back to GRN List
              </button>

              <h1 className="text-2xl font-bold">
                {editId
                  ? "Edit GRN"
                  : "New GRN"}
              </h1>
            </div>

            <button
              type="button"
              onClick={
                closeForm
              }
              className="rounded-lg border p-2"
            >
              <X
                size={18}
              />
            </button>
          </div>

          <div className="space-y-6 p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field
                label="GRN Number"
                required
              >
                <input
                  value={
                    form.grnNo
                  }
                  readOnly
                  className={
                    inputClass
                  }
                />
              </Field>

              <Field
                label="Purchase Order"
                required
              >
                <select
                  value={
                    form.purchaseOrder
                  }
                  disabled={
                    Boolean(
                      editId
                    )
                  }
                  onChange={(
                    event
                  ) =>
                    selectPurchaseOrder(
                      event.target.value
                    )
                  }
                  className={
                    inputClass
                  }
                >
                  <option value="">
                    Select Purchase Order
                  </option>

                  {purchaseOrders.map(
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
                          order.purchaseOrderNo
                        }{" "}
                        —{" "}
                        {
                          order.vendorName
                        }{" "}
                        —{" "}
                        {
                          (
                            order.items ||
                            []
                          ).length
                        }{" "}
                        item(s)
                      </option>
                    )
                  )}
                </select>
              </Field>

              <Field label="PO Status">
                <input
                  value={
                    form.purchaseOrderStatus ||
                    "-"
                  }
                  readOnly
                  className={
                    inputClass
                  }
                />
              </Field>

              <Field label="PO Date">
                <input
                  value={
                    form.purchaseOrderDate ||
                    ""
                  }
                  readOnly
                  className={
                    inputClass
                  }
                />
              </Field>

              <Field label="Expected Date">
                <input
                  value={
                    form.expectedDate ||
                    ""
                  }
                  readOnly
                  className={
                    inputClass
                  }
                />
              </Field>

              <Field label="Reference No">
                <input
                  value={
                    form.referenceNo ||
                    ""
                  }
                  readOnly
                  className={
                    inputClass
                  }
                />
              </Field>

              <Field label="Tax Treatment">
                <input
                  value={
                    form.taxType ===
                    "with-tax"
                      ? `With Sales Tax ${numberValue(
                          form.taxRate ||
                            18
                        )}%`
                      : "Without Tax"
                  }
                  readOnly
                  className={
                    inputClass
                  }
                />
              </Field>

              <Field
                label="Received Date"
                required
              >
                <input
                  type="date"
                  value={
                    form.receivedDate
                  }
                  onChange={(
                    event
                  ) =>
                    updateField(
                      "receivedDate",
                      event.target.value
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </Field>

              <Field label="Warehouse Routing">
                <input
                  value={
                    warehouseSummary
                  }
                  readOnly
                  className={
                    inputClass
                  }
                />
              </Field>

              <Field label="Vendor">
                <input
                  value={
                    form.vendorName
                  }
                  readOnly
                  className={
                    inputClass
                  }
                />
              </Field>

              <Field label="Vendor Phone">
                <input
                  value={
                    form.vendorPhone
                  }
                  readOnly
                  className={
                    inputClass
                  }
                />
              </Field>

              <Field label="Vendor Email">
                <input
                  value={
                    form.vendorEmail
                  }
                  readOnly
                  className={
                    inputClass
                  }
                />
              </Field>

              <Field label="Vendor Address">
                <input
                  value={
                    form.vendorAddress
                  }
                  readOnly
                  className={
                    inputClass
                  }
                />
              </Field>

              <Field label="Supplier Challan">
                <input
                  value={
                    form.challanNo
                  }
                  onChange={(
                    event
                  ) =>
                    updateField(
                      "challanNo",
                      event.target.value
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </Field>

              <Field label="Supplier Invoice">
                <input
                  value={
                    form.invoiceNo
                  }
                  onChange={(
                    event
                  ) =>
                    updateField(
                      "invoiceNo",
                      event.target.value
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </Field>

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

              <Field label="Received By">
                <input
                  value={
                    form.receivedBy
                  }
                  onChange={(
                    event
                  ) =>
                    updateField(
                      "receivedBy",
                      event.target.value
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </Field>

              <Field label="Checked By">
                <input
                  value={
                    form.checkedBy
                  }
                  onChange={(
                    event
                  ) =>
                    updateField(
                      "checkedBy",
                      event.target.value
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </Field>

              <Field
                label="Inspection Status"
                required
              >
                <select
                  value={
                    form.inspectionStatus
                  }
                  onChange={(
                    event
                  ) =>
                    updateField(
                      "inspectionStatus",
                      event.target.value
                    )
                  }
                  className={
                    inputClass
                  }
                >
                  <option value="Pending">
                    Pending
                  </option>

                  <option value="Passed">
                    Passed
                  </option>

                  <option value="Partially Accepted">
                    Partially Accepted
                  </option>

                  <option value="Rejected">
                    Rejected
                  </option>
                </select>
              </Field>

              <Field
                label="GRN Status"
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
                      event.target.value
                    )
                  }
                  className={
                    inputClass
                  }
                >
                  <option value="Draft">
                    Draft
                  </option>

                  <option value="Received">
                    Received and Post Stock
                  </option>

                  <option value="Partially Received">
                    Partially Received and Post Stock
                  </option>

                  <option value="Completed">
                    Completed and Post Stock
                  </option>
                </select>
              </Field>
            </div>

            {form.purchaseOrder && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                Purchase Order details and pending quantities have been loaded automatically.
                Rates, amounts and financial totals are not shown in GRN.
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-bold text-slate-900">
                  Receiving Quantities
                </h2>

                <p className="text-xs text-slate-500">
                  Enter the quantity physically received. Accepted and pending quantities update automatically.
                </p>
              </div>

              {form.items.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={
                      receiveAllPending
                    }
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                  >
                    Receive All Pending
                  </button>

                  <button
                    type="button"
                    onClick={
                      clearReceivedQuantities
                    }
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Clear Quantities
                  </button>
                </div>
              )}
            </div>

            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[1380px] text-left text-xs">
                <thead className="bg-slate-800 text-white">
                  <tr>
                    <th className="p-3">
                      Item
                    </th>

                    <th className="p-3">
                      Type
                    </th>

                    <th className="p-3">
                      Warehouse
                    </th>

                    <th className="p-3">
                      Cartons
                    </th>

                    <th className="p-3">
                      Ordered
                    </th>

                    <th className="p-3">
                      Previous
                    </th>

                    <th className="p-3">
                      Pending Before
                    </th>

                    <th className="p-3">
                      Received
                    </th>

                    <th className="p-3">
                      Rejected
                    </th>

                    <th className="p-3">
                      Accepted
                    </th>

                    <th className="p-3">
                      Pending After
                    </th>

                    <th className="p-3">
                      Unit
                    </th>

                    <th className="p-3">
                      Remarks
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {!form.items.length ? (
                    <tr>
                      <td
                        colSpan="13"
                        className="p-8 text-center text-slate-400"
                      >
                        Select a Purchase Order
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
                            item.purchaseOrderItemId ||
                            index
                          }
                          className="border-t"
                        >
                          <td className="p-3">
                            <b>
                              {
                                item.itemName
                              }
                            </b>

                            <div className="text-[10px] text-blue-600">
                              {
                                item.itemCode
                              }
                            </div>

                            {item.description &&
                              item.description !==
                                item.itemName && (
                                <div className="mt-1 text-[10px] text-slate-600">
                                  {
                                    item.description
                                  }
                                </div>
                              )}

                            {item.size && (
                              <div className="mt-1 text-[10px] font-semibold text-slate-500">
                                Size:{" "}
                                {
                                  item.size
                                }
                              </div>
                            )}
                          </td>

                          <td className="p-3">
                            {
                              item.itemType
                            }
                          </td>

                          <td className="p-3 font-semibold">
                            {
                              item.warehouse
                            }
                          </td>

                          <td className="p-3">
                            {quantity(
                              item.cartons
                            )}
                          </td>

                          <td className="p-3">
                            {quantity(
                              item.orderedQty
                            )}
                          </td>

                          <td className="p-3">
                            {quantity(
                              item.previousReceivedQty
                            )}
                          </td>

                          <td className="p-3 font-bold text-orange-700">
                            {quantity(
                              item.pendingBeforeQty
                            )}
                          </td>

                          <td className="p-3">
                            <input
                              type="number"
                              min="0"
                              max={
                                numberValue(
                                  item.pendingBeforeQty
                                )
                              }
                              step="any"
                              placeholder="0"
                              value={
                                item.receivedQty
                              }
                              onChange={(
                                event
                              ) =>
                                updateItem(
                                  index,
                                  "receivedQty",
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
                              max={
                                numberValue(
                                  item.receivedQty
                                )
                              }
                              step="any"
                              placeholder="0"
                              disabled={
                                numberValue(
                                  item.receivedQty
                                ) <= 0
                              }
                              value={
                                item.rejectedQty
                              }
                              onChange={(
                                event
                              ) =>
                                updateItem(
                                  index,
                                  "rejectedQty",
                                  event.target.value
                                )
                              }
                              className={
                                inputClass
                              }
                            />
                          </td>

                          <td className="p-3 font-bold text-emerald-700">
                            {quantity(
                              item.acceptedQty
                            )}
                          </td>

                          <td className="p-3 font-bold text-orange-700">
                            {quantity(
                              item.pendingQty
                            )}
                          </td>

                          <td className="p-3">
                            {
                              item.unit
                            }
                          </td>

                          <td className="p-3">
                            <input
                              value={
                                item.remarks
                              }
                              onChange={(
                                event
                              ) =>
                                updateItem(
                                  index,
                                  "remarks",
                                  event.target.value
                                )
                              }
                              className={
                                inputClass
                              }
                            />
                          </td>
                        </tr>
                      )
                    )
                  )}
                </tbody>
              </table>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
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
                      event.target.value
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </Field>

              <div className="space-y-2 rounded-xl bg-slate-50 p-5">
                <Total
                  label="Total Cartons"
                  value={quantity(
                    totals.cartons
                  )}
                />

                <Total
                  label="Ordered Quantity"
                  value={quantity(
                    totals.ordered
                  )}
                />

                <Total
                  label="Previously Received"
                  value={quantity(
                    totals.previous
                  )}
                />

                <Total
                  label="Received in this GRN"
                  value={quantity(
                    totals.received
                  )}
                />

                <Total
                  label="Accepted Quantity"
                  value={quantity(
                    totals.accepted
                  )}
                />

                <Total
                  label="Rejected Quantity"
                  value={quantity(
                    totals.rejected
                  )}
                />

                <Total
                  label="Remaining Pending"
                  value={quantity(
                    totals.pending
                  )}
                  strong
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t pt-5">
              <button
                type="button"
                onClick={
                  closeForm
                }
                className="rounded-lg border px-6 py-2.5"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  save
                }
                disabled={
                  saving
                }
                className="flex items-center gap-2 rounded-lg bg-blue-700 px-6 py-2.5 font-bold text-white disabled:opacity-60"
              >
                {saving ? (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <Save
                    size={17}
                  />
                )}

                {editId
                  ? "Update GRN"
                  : form.status ===
                      "Draft"
                    ? "Save Draft"
                    : "Save and Post Stock"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5 p-3 sm:p-5">
      <div className="flex flex-col gap-4 rounded-xl bg-blue-800 p-5 text-white md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <PackageCheck
              size={22}
            />

            Goods Receiving Notes
          </h1>

          <p className="text-sm text-blue-100">
            Raw Material and purchased Finished Good receipts
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={
              refresh
            }
            className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2"
          >
            <RefreshCcw
              size={16}
            />

            Refresh
          </button>

          <button
            type="button"
            onClick={
              openNew
            }
            className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 font-bold text-blue-700"
          >
            <Plus
              size={16}
            />

            New GRN
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center md:justify-between">
          <h2 className="font-bold">
            GRN Register
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
                placeholder="Search GRN, PO, vendor, item..."
                className="rounded-lg border py-2 pl-9 pr-3 text-xs"
              />
            </div>

            <select
              value={
                typeFilter
              }
              onChange={(
                event
              ) =>
                setTypeFilter(
                  event.target.value
                )
              }
              className="rounded-lg border px-3 py-2 text-xs"
            >
              <option value="All">
                All
              </option>

              <option value="Raw Material">
                Raw Material
              </option>

              <option value="Finished Good">
                Finished Good
              </option>

              <option value="Mixed">
                Mixed
              </option>
            </select>

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
                All
              </option>

              <option value="Draft">
                Draft
              </option>

              <option value="Received">
                Received
              </option>

              <option value="Partially Received">
                Partially Received
              </option>

              <option value="Completed">
                Completed
              </option>

              <option value="Posted">
                Posted
              </option>

              <option value="Cancelled">
                Cancelled
              </option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-left text-xs">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className="p-4">
                  GRN
                </th>

                <th className="p-4">
                  PO
                </th>

                <th className="p-4">
                  Vendor
                </th>

                <th className="p-4">
                  Type
                </th>

                <th className="p-4">
                  Warehouse
                </th>

                <th className="p-4">
                  Accepted
                </th>

                <th className="p-4">
                  Rejected
                </th>

                <th className="p-4">
                  Inspection
                </th>

                <th className="p-4">
                  Status
                </th>

                <th className="p-4">
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
                    <Loader2 className="mx-auto animate-spin" />
                  </td>
                </tr>
              ) : !filteredGrns.length ? (
                <tr>
                  <td
                    colSpan="10"
                    className="p-10 text-center text-slate-400"
                  >
                    No GRNs found
                  </td>
                </tr>
              ) : (
                filteredGrns.map(
                  (grn) => {
                    const busy =
                      actionId ===
                      grn._id;

                    const draft =
                      grn.status ===
                        "Draft" &&
                      !grn.stockPosted;

                    const canCancel =
                      ![
                        "Draft",
                        "Cancelled",
                      ].includes(
                        grn.status
                      ) &&
                      grn.purchaseStatus !==
                        "Purchased";

                    return (
                      <tr
                        key={
                          grn._id
                        }
                        className="border-t hover:bg-slate-50"
                      >
                        <td className="p-4">
                          <b className="text-blue-700">
                            {
                              grn.grnNo
                            }
                          </b>

                          <div className="text-[10px]">
                            {
                              grn.receivedDate
                            }
                          </div>
                        </td>

                        <td className="p-4">
                          {
                            grn.purchaseOrderNo
                          }
                        </td>

                        <td className="p-4">
                          {
                            grn.vendorName
                          }
                        </td>

                        <td className="p-4">
                          {
                            grn.receiptType
                          }
                        </td>

                        <td className="p-4">
                          <span className="flex items-center gap-1">
                            <Warehouse
                              size={14}
                            />

                            {
                              grn.warehouse
                            }
                          </span>
                        </td>

                        <td className="p-4 font-bold text-emerald-700">
                          {quantity(
                            grn.totalAcceptedQty
                          )}
                        </td>

                        <td className="p-4 font-bold text-red-600">
                          {quantity(
                            grn.totalRejectedQty
                          )}
                        </td>

                        <td className="p-4">
                          {
                            grn.inspectionStatus
                          }
                        </td>

                        <td className="p-4">
                          <span
                            className={`rounded-full px-2 py-1 font-bold ${statusClass(
                              grn.status
                            )}`}
                          >
                            {
                              grn.status
                            }
                          </span>
                        </td>

                        <td className="p-4">
                          <div className="flex gap-1">
                            <Action
                              title="Print"
                              onClick={() =>
                                printGrn(
                                  grn
                                )
                              }
                            >
                              <Printer
                                size={15}
                              />
                            </Action>

                            {draft && (
                              <Action
                                title="Edit"
                                onClick={() =>
                                  edit(
                                    grn
                                  )
                                }
                              >
                                <Edit2
                                  size={15}
                                />
                              </Action>
                            )}

                            {draft && (
                              <Action
                                title="Post"
                                onClick={() =>
                                  postStock(
                                    grn
                                  )
                                }
                              >
                                <CheckCircle2
                                  size={15}
                                />
                              </Action>
                            )}

                            {draft && (
                              <Action
                                title="Delete"
                                onClick={() =>
                                  remove(
                                    grn
                                  )
                                }
                              >
                                <Trash2
                                  size={15}
                                />
                              </Action>
                            )}

                            {canCancel && (
                              <Action
                                title="Cancel"
                                onClick={() =>
                                  cancel(
                                    grn
                                  )
                                }
                              >
                                <XCircle
                                  size={15}
                                />
                              </Action>
                            )}

                            {busy && (
                              <Loader2
                                size={15}
                                className="animate-spin"
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

const Total = ({
  label,
  value,
  strong = false,
}) => (
  <div
    className={`flex justify-between ${
      strong
        ? "border-t pt-3 text-lg"
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

const Action = ({
  title,
  onClick,
  children,
}) => (
  <button
    type="button"
    title={
      title
    }
    onClick={
      onClick
    }
    className="rounded-lg p-2 text-blue-700 hover:bg-blue-50"
  >
    {children}
  </button>
);

export default GRN;