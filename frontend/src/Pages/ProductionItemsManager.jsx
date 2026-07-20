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

const API_CUSTOMERS =
  `${API_BASE_URL}/customers`;

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

  internalReference: "",

  customer: "",

  customerName:
    "Internal Production",

  customerPO: "",

  finishedGoodItem: "",

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
      customers,
      setCustomers,
    ] = useState([]);

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
            customerData,
            stockData,
          ] = await Promise.all([
            apiRequest(
              `${API_JOBS}/all`
            ),

            apiRequest(
              `${API_ITEMS}/all`
            ),

            optionalArrayRequest(
              `${API_SALES_ORDERS}/all`,
              [
                "salesOrders",
                "orders",
              ]
            ),

            optionalArrayRequest(
              `${API_CUSTOMERS}/all`,
              ["customers"]
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

          setCustomers(
            customerData
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

      internalReference:
        job.internalReference ||
        "",

      customer: idOf(
        job.customer
      ),

      customerName:
        job.customerName ||
        "",

      customerPO:
        job.customerPO ||
        "",

      finishedGoodItem:
        idOf(
          job.finishedGoodItem
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

    const openForm =
      async (job = null) => {
        if (job) {
          setEditId(job._id);

          setForm(
            jobToForm(job)
          );
        } else {
          setEditId(null);

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
      setForm((current) => ({
        ...current,

        sourceType,

        salesOrder: "",

        salesOrderNo: "",

        internalReference:
          "",

        customer:
          sourceType ===
          "Internal Requirement"
            ? ""
            : current.customer,

        customerName:
          sourceType ===
          "Internal Requirement"
            ? "Internal Production"
            : current.customerName ===
              "Internal Production"
            ? ""
            : current.customerName,
      }));
    };

    const selectSalesOrder = (
      orderId
    ) => {
      const order =
        salesOrders.find(
          (row) =>
            String(row._id) ===
            String(orderId)
        );

      const customerObject =
        typeof order?.customer ===
        "object"
          ? order.customer
          : null;

      setForm((current) => ({
        ...current,

        salesOrder: orderId,

        salesOrderNo:
          order?.salesOrderNo ||
          order?.orderNo ||
          order?.code ||
          "",

        customer: idOf(
          order?.customer
        ),

        customerName:
          order?.customerName ||
          customerObject
            ?.customerName ||
          customerObject?.name ||
          current.customerName,

        customerPO:
          order?.customerPO ||
          order?.poNo ||
          current.customerPO,
      }));
    };

    const selectCustomer = (
      customerId
    ) => {
      const customer =
        customers.find(
          (row) =>
            String(row._id) ===
            String(customerId)
        );

      setForm((current) => ({
        ...current,

        customer:
          customerId,

        customerName:
          customer
            ?.customerName ||
          customer?.name ||
          current.customerName,
      }));
    };

    const selectFinishedGood =
      (itemId) => {
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
        num(form.targetQty) <=
        0
      ) {
        alert(
          "Target quantity must be greater than zero"
        );

        return false;
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
        form.sourceType ===
          "Sales Order" &&
        !form.salesOrder
      ) {
        alert(
          "Please select a sales order"
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

    const jobPayload = () => ({
      jobNo:
        form.jobNo,

      jobName:
        form.jobName.trim(),

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
          ? form.internalReference.trim()
          : "",

      customer:
        form.customer ||
        null,

      customerName:
        form.customerName.trim(),

      customerPO:
        form.customerPO.trim(),

      finishedGoodItem:
        form.finishedGoodItem,

      targetQty: num(
        form.targetQty
      ),

      unit:
        form.unit,

      jobDate:
        form.jobDate,

      dueDate:
        form.dueDate,

      priority:
        form.priority,

      paperType:
        form.paperType.trim(),

      gsm: num(form.gsm),

      sheetSize:
        form.sheetSize.trim(),

      finishedSize:
        form.finishedSize.trim(),

      totalSheets: num(
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

      materialRequirements:
        form.materialRequirements.map(
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
              num(row.rate),

            remarks:
              String(
                row.remarks ||
                  ""
              ).trim(),
          })
        ),
    });

    const saveJob =
      async (event) => {
        event.preventDefault();

        if (!validateJob()) {
          return;
        }

        try {
          setSaving(true);

          await apiRequest(
            editId
              ? `${API_JOBS}/update/${editId}`
              : `${API_JOBS}/add`,
            {
              method: editId
                ? "PUT"
                : "POST",

              body:
                JSON.stringify(
                  jobPayload()
                ),
            }
          );

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
                                  {job.paperType ||
                                    "-"}

                                  {num(
                                    job.gsm
                                  ) > 0
                                    ? ` · ${job.gsm} GSM`
                                    : ""}
                                </div>
                              </td>

                              <td className="p-4 text-right font-bold text-blue-700">
                                {qty(
                                  job.targetQty ??
                                    job.quantity
                                )}{" "}
                                {job.unit}
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
                        className={
                          inputClass
                        }
                      >
                        <option value="">
                          Select Sales Order
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
                            </option>
                          )
                        )}
                      </select>
                    </Field>
                  ) : (
                    <Field label="Internal Reference">
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

                  <Field label="Customer">
                    <select
                      value={
                        form.customer
                      }
                      onChange={(
                        event
                      ) =>
                        selectCustomer(
                          event
                            .target
                            .value
                        )
                      }
                      disabled={
                        form.sourceType ===
                        "Internal Requirement"
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
                              customer.name ||
                              customer._id}
                          </option>
                        )
                      )}
                    </select>
                  </Field>

                  <Field
                    label="Customer Name"
                    required
                  >
                    <input
                      value={
                        form.customerName
                      }
                      onChange={(
                        event
                      ) =>
                        change(
                          "customerName",
                          event
                            .target
                            .value
                        )
                      }
                      readOnly={
                        form.sourceType ===
                        "Internal Requirement"
                      }
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
                        form.jobName
                      }
                      onChange={(
                        event
                      ) =>
                        change(
                          "jobName",
                          event
                            .target
                            .value
                        )
                      }
                      className={
                        inputClass
                      }
                      placeholder="e.g. Medicine Carton Printing"
                    />
                  </Field>
                </div>
              </Section>

              <Section title="2. Finished Good and Schedule">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Field
                    label="Finished Good Item"
                    required
                    wide
                  >
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
                  </Field>

                  <Field
                    label="Target Quantity"
                    required
                  >
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={
                        form.targetQty
                      }
                      onChange={(
                        event
                      ) =>
                        change(
                          "targetQty",
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
                </div>
              </Section>

              <Section title="3. Printing Specifications">
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

              <Section title="4. Material Requirements">
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

              <Section title="5. Instructions and Remarks">
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
    <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-xl">
      <div className="sticky top-0 flex items-center justify-between bg-blue-700 px-5 py-4 text-white">
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
            label="Customer"
            value={
              job.customerName
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
            label="Target"
            value={`${qty(
              job.targetQty
            )} ${
              job.unit || ""
            }`}
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