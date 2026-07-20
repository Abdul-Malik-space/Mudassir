import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  CheckCircle2,
  Edit3,
  Loader2,
  Plus,
  RefreshCcw,
  Search,
  Send,
  Trash2,
  X,
  XCircle,
} from "lucide-react";

import {
  API_BASE_URL,
} from "../config/api";

const API_READY =
  `${API_BASE_URL}/ready-products`;

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

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";

const emptyForm = () => ({
  readyNo: "",
  printing: "",
  qcDate: todayDate(),
  passedQty: "",
  rejectedQty: "0",
  holdQty: "0",
  unit: "Pcs",
  checkedBy: "",
  packedBy: "",
  packaging: "",
  rate: "0",
  remarks: "",
});

const statusClass = (
  status
) => {
  const classes = {
    Draft:
      "border-slate-200 bg-slate-100 text-slate-700",

    Posted:
      "border-emerald-200 bg-emerald-100 text-emerald-700",

    Cancelled:
      "border-red-200 bg-red-100 text-red-700",
  };

  return (
    classes[status] ||
    classes.Draft
  );
};

const qcClass = (
  status
) => {
  const classes = {
    Passed:
      "bg-emerald-100 text-emerald-700",

    "Partially Passed":
      "bg-amber-100 text-amber-700",

    Rejected:
      "bg-red-100 text-red-700",

    Hold:
      "bg-slate-100 text-slate-700",
  };

  return (
    classes[status] ||
    classes.Hold
  );
};

const ReadyProductEntry =
  () => {
    const [
      entries,
      setEntries,
    ] = useState([]);

    const [
      eligiblePrintings,
      setEligiblePrintings,
    ] = useState([]);

    const [
      formData,
      setFormData,
    ] = useState(
      emptyForm()
    );

    const [
      selectedPrintingData,
      setSelectedPrintingData,
    ] = useState(null);

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
    ] = useState(
      "All"
    );

    const fetchData =
      async () => {
        try {
          setLoading(
            true
          );

          const [
            entryData,
            printingData,
          ] =
            await Promise.all(
              [
                apiRequest(
                  `${API_READY}/all`
                ),

                apiRequest(
                  `${API_READY}/eligible-printings`
                ),
              ]
            );

          setEntries(
            normalizeArray(
              entryData,
              [
                "entries",
                "readyProducts",
              ]
            )
          );

          setEligiblePrintings(
            normalizeArray(
              printingData,
              [
                "printings",
                "entries",
              ]
            )
          );
        } catch (error) {
          console.error(
            "Ready Product Load Error:",
            error
          );

          alert(
            error.message ||
            "Unable to load ready product records."
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

    const selectedPrinting =
      useMemo(
        () => {
          if (
            selectedPrintingData
          ) {
            return selectedPrintingData;
          }

          return eligiblePrintings.find(
            (
              printing
            ) =>
              String(
                printing._id
              ) ===
              String(
                formData.printing
              )
          );
        },
        [
          eligiblePrintings,
          formData.printing,
          selectedPrintingData,
        ]
      );

    const printingGoodQty =
      numberValue(
        selectedPrinting?.goodQty
      );

    const classifiedQty =
      numberValue(
        formData.passedQty
      ) +
      numberValue(
        formData.rejectedQty
      ) +
      numberValue(
        formData.holdQty
      );

    const calculatedAmount =
      numberValue(
        formData.passedQty
      ) *
      numberValue(
        formData.rate
      );

    const openNewForm =
      async () => {
        try {
          const data =
            await apiRequest(
              `${API_READY}/next-no`
            );

          setEditId(
            null
          );

          setSelectedPrintingData(
            null
          );

          setFormData({
            ...emptyForm(),

            readyNo:
              data.readyNo ||
              "",
          });

          setShowForm(
            true
          );
        } catch (error) {
          alert(
            error.message ||
            "Unable to prepare a new ready product entry."
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

        setSelectedPrintingData(
          null
        );

        setFormData(
          emptyForm()
        );
      };

    const updateField = (
      field,
      value
    ) => {
      setFormData(
        (
          current
        ) => ({
          ...current,

          [field]:
            value,
        })
      );
    };

    const handlePrintingChange = (
      printingId
    ) => {
      const printing =
        eligiblePrintings.find(
          (row) =>
            String(
              row._id
            ) ===
            String(
              printingId
            )
        );

      setSelectedPrintingData(
        printing ||
        null
      );

      if (!printing) {
        setFormData(
          (
            current
          ) => ({
            ...current,

            printing:
              "",

            passedQty:
              "",

            rejectedQty:
              "0",

            holdQty:
              "0",
          })
        );

        return;
      }

      const goodQty =
        numberValue(
          printing.goodQty
        );

      setFormData(
        (
          current
        ) => ({
          ...current,

          printing:
            printing._id,

          passedQty:
            String(
              goodQty
            ),

          rejectedQty:
            "0",

          holdQty:
            "0",

          unit:
            printing.unit ||
            "Pcs",

          rate:
            String(
              printing
                .finishedGoodItem
                ?.purchasePrice ||
              0
            ),
        })
      );
    };

    const openEdit = (
      entry
    ) => {
      const printing =
        typeof entry.printing ===
        "object"
          ? entry.printing
          : null;

      setEditId(
        entry._id
      );

      setSelectedPrintingData(
        printing
          ? {
              ...printing,

              productionJob:
                typeof entry.productionJob ===
                "object"
                  ? entry.productionJob
                  : null,

              finishedGoodItem:
                typeof entry.finishedGoodItem ===
                "object"
                  ? entry.finishedGoodItem
                  : null,
            }
          : null
      );

      setFormData({
        readyNo:
          entry.readyNo ||
          "",

        printing:
          idOf(
            entry.printing
          ),

        qcDate:
          String(
            entry.qcDate ||
            ""
          ).slice(
            0,
            10
          ) ||
          todayDate(),

        passedQty:
          String(
            entry.passedQty ??
            ""
          ),

        rejectedQty:
          String(
            entry.rejectedQty ??
            0
          ),

        holdQty:
          String(
            entry.holdQty ??
            0
          ),

        unit:
          entry.unit ||
          "Pcs",

        checkedBy:
          entry.checkedBy ||
          "",

        packedBy:
          entry.packedBy ||
          "",

        packaging:
          entry.packaging ||
          "",

        rate:
          String(
            entry.rate ??
            0
          ),

        remarks:
          entry.remarks ||
          "",
      });

      setShowForm(
        true
      );
    };

    const validateForm = (
      forPosting = false
    ) => {
      if (
        !formData.printing
      ) {
        alert(
          "Please select a completed printing record."
        );

        return false;
      }

      if (
        printingGoodQty <= 0
      ) {
        alert(
          "Printing good quantity must be greater than zero."
        );

        return false;
      }

      if (
        Math.abs(
          classifiedQty -
          printingGoodQty
        ) > 0.000001
      ) {
        alert(
          "Passed, rejected and hold quantities must equal printing good quantity."
        );

        return false;
      }

      if (
        forPosting &&
        numberValue(
          formData.passedQty
        ) <= 0
      ) {
        alert(
          "Passed quantity must be greater than zero before posting."
        );

        return false;
      }

      if (
        !formData.checkedBy.trim()
      ) {
        alert(
          "Quality checker is required."
        );

        return false;
      }

      return true;
    };

    const buildPayload =
      () => ({
        printing:
          formData.printing,

        qcDate:
          formData.qcDate,

        passedQty:
          numberValue(
            formData.passedQty
          ),

        rejectedQty:
          numberValue(
            formData.rejectedQty
          ),

        holdQty:
          numberValue(
            formData.holdQty
          ),

        unit:
          formData.unit,

        checkedBy:
          formData.checkedBy.trim(),

        packedBy:
          formData.packedBy.trim(),

        packaging:
          formData.packaging.trim(),

        rate:
          numberValue(
            formData.rate
          ),

        remarks:
          formData.remarks.trim(),
      });

    const saveDraft =
      async () => {
        if (
          !validateForm(
            false
          )
        ) {
          return;
        }

        try {
          setSaving(
            true
          );

          await apiRequest(
            editId
              ? `${API_READY}/update/${editId}`
              : `${API_READY}/add`,

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
            "Unable to save the ready product draft."
          );
        } finally {
          setSaving(
            false
          );
        }
      };

    const postOutput =
      async () => {
        if (
          !validateForm(
            true
          )
        ) {
          return;
        }

        if (
          !window.confirm(
            `Post ${formatQuantity(
              formData.passedQty
            )} ${formData.unit} to Finished Goods Warehouse?`
          )
        ) {
          return;
        }

        try {
          setSaving(
            true
          );

          if (editId) {
            await apiRequest(
              `${API_READY}/update/${editId}`,

              {
                method:
                  "PUT",

                body:
                  JSON.stringify(
                    buildPayload()
                  ),
              }
            );

            await apiRequest(
              `${API_READY}/post/${editId}`,

              {
                method:
                  "POST",

                body:
                  JSON.stringify(
                    {}
                  ),
              }
            );
          } else {
            await apiRequest(
              `${API_READY}/create-and-post`,

              {
                method:
                  "POST",

                body:
                  JSON.stringify(
                    buildPayload()
                  ),
              }
            );
          }

          await fetchData();

          closeForm();
        } catch (error) {
          alert(
            error.message ||
            "Unable to post production output."
          );
        } finally {
          setSaving(
            false
          );
        }
      };

    const postDraft =
      async (
        entry
      ) => {
        if (
          !window.confirm(
            `Post ${entry.readyNo} to Finished Goods Warehouse?`
          )
        ) {
          return;
        }

        try {
          setActionId(
            entry._id
          );

          await apiRequest(
            `${API_READY}/post/${entry._id}`,

            {
              method:
                "POST",

              body:
                JSON.stringify(
                  {}
                ),
            }
          );

          await fetchData();
        } catch (error) {
          alert(
            error.message ||
            "Unable to post production output."
          );
        } finally {
          setActionId(
            ""
          );
        }
      };

    const cancelPosted =
      async (
        entry
      ) => {
        const cancelReason =
          window.prompt(
            "Enter cancellation reason:",
            ""
          );

        if (
          cancelReason ===
          null
        ) {
          return;
        }

        try {
          setActionId(
            entry._id
          );

          await apiRequest(
            `${API_READY}/cancel/${entry._id}`,

            {
              method:
                "POST",

              body:
                JSON.stringify({
                  cancelReason:
                    cancelReason.trim() ||
                    "Production output cancelled",
                }),
            }
          );

          await fetchData();
        } catch (error) {
          alert(
            error.message ||
            "Unable to cancel production output."
          );
        } finally {
          setActionId(
            ""
          );
        }
      };

    const deleteDraft =
      async (
        entry
      ) => {
        if (
          !window.confirm(
            `Delete ${entry.readyNo}?`
          )
        ) {
          return;
        }

        try {
          setActionId(
            entry._id
          );

          await apiRequest(
            `${API_READY}/delete/${entry._id}`,

            {
              method:
                "DELETE",
            }
          );

          await fetchData();
        } catch (error) {
          alert(
            error.message ||
            "Unable to delete the draft."
          );
        } finally {
          setActionId(
            ""
          );
        }
      };

    const filteredEntries =
      useMemo(
        () => {
          const keyword =
            search
              .trim()
              .toLowerCase();

          return entries.filter(
            (
              entry
            ) => {
              const searchable =
                [
                  entry.readyNo,
                  entry.jobNo,
                  entry.printingNo,
                  entry.finishedGoodCode,
                  entry.finishedGoodName,
                  entry.checkedBy,
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
                  entry.status ===
                  statusFilter)
              );
            }
          );
        },
        [
          entries,
          search,
          statusFilter,
        ]
      );

    const stats =
      useMemo(
        () => ({
          total:
            entries.length,

          draft:
            entries.filter(
              (
                entry
              ) =>
                entry.status ===
                "Draft"
            ).length,

          posted:
            entries.filter(
              (
                entry
              ) =>
                entry.status ===
                "Posted"
            ).length,

          output:
            entries
              .filter(
                (
                  entry
                ) =>
                  entry.status ===
                  "Posted"
              )
              .reduce(
                (
                  sum,
                  entry
                ) =>
                  sum +
                  numberValue(
                    entry.passedQty
                  ),
                0
              ),

          rejected:
            entries
              .filter(
                (
                  entry
                ) =>
                  entry.status ===
                  "Posted"
              )
              .reduce(
                (
                  sum,
                  entry
                ) =>
                  sum +
                  numberValue(
                    entry.rejectedQty
                  ),
                0
              ),

          eligible:
            eligiblePrintings.length,
        }),
        [
          entries,
          eligiblePrintings,
        ]
      );

    if (showForm) {
      const job =
        selectedPrinting
          ?.productionJob;

      const finishedGood =
        selectedPrinting
          ?.finishedGoodItem;

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
                  size={
                    20
                  }
                />
              </button>

              <h1 className="text-lg font-bold">
                {editId
                  ? "Edit Ready Product"
                  : "New Ready Product"}
              </h1>
            </div>

            <button
              type="button"
              onClick={
                closeForm
              }
              className="rounded-lg p-2 hover:bg-blue-700"
            >
              <X
                size={
                  18
                }
              />
            </button>
          </div>

          <div className="space-y-7 rounded-b-xl border-x border-b bg-white p-5 md:p-7">
            <Section title="Completed Printing">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Field label="Ready Number">
                  <input
                    value={
                      formData.readyNo
                    }
                    readOnly
                    className={`${inputClass} font-mono`}
                  />
                </Field>

                <Field
                  label="Completed Printing"
                  required
                  wide
                >
                  <select
                    value={
                      formData.printing
                    }
                    onChange={(
                      event
                    ) =>
                      handlePrintingChange(
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
                    <option value="">
                      Select Completed Printing
                    </option>

                    {eligiblePrintings.map(
                      (
                        printing
                      ) => (
                        <option
                          key={
                            printing._id
                          }
                          value={
                            printing._id
                          }
                        >
                          {
                            printing.printingNo
                          }{" "}
                          —{" "}
                          {
                            printing
                              .productionJob
                              ?.jobNo
                          }{" "}
                          —{" "}
                          {printing
                            .finishedGoodItem
                            ?.name ||
                            printing
                              .productionJob
                              ?.finishedGoodName}
                        </option>
                      )
                    )}

                    {editId &&
                      selectedPrinting && (
                        <option
                          value={
                            selectedPrinting._id
                          }
                        >
                          {
                            selectedPrinting.printingNo
                          }{" "}
                          —{" "}
                          {
                            job?.jobNo
                          }
                        </option>
                      )}
                  </select>
                </Field>

                <Field
                  label="QC Date"
                  required
                >
                  <input
                    type="date"
                    value={
                      formData.qcDate
                    }
                    onChange={(
                      event
                    ) =>
                      updateField(
                        "qcDate",
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

                <Field label="Production Job">
                  <input
                    value={
                      job
                        ? `${job.jobNo} — ${job.jobName}`
                        : ""
                    }
                    readOnly
                    className={
                      inputClass
                    }
                  />
                </Field>

                <Field
                  label="Finished Good"
                  wide
                >
                  <input
                    value={
                      finishedGood
                        ? `${finishedGood.code} — ${finishedGood.name}`
                        : job
                          ? `${job.finishedGoodCode || ""} — ${job.finishedGoodName || ""}`
                          : ""
                    }
                    readOnly
                    className={
                      inputClass
                    }
                  />
                </Field>

                <Field label="Customer">
                  <input
                    value={
                      job
                        ?.customerName ||
                      ""
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

            <Section title="Quality Check">
              <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <SummaryBox
                  label="Printing Good Quantity"
                  value={`${formatQuantity(
                    printingGoodQty
                  )} ${
                    formData.unit
                  }`}
                />

                <SummaryBox
                  label="Classified Quantity"
                  value={`${formatQuantity(
                    classifiedQty
                  )} ${
                    formData.unit
                  }`}
                />

                <SummaryBox
                  label="Output Amount"
                  value={money(
                    calculatedAmount
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Field
                  label="Passed Quantity"
                  required
                >
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={
                      formData.passedQty
                    }
                    onChange={(
                      event
                    ) =>
                      updateField(
                        "passedQty",
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

                <Field label="Rejected Quantity">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={
                      formData.rejectedQty
                    }
                    onChange={(
                      event
                    ) =>
                      updateField(
                        "rejectedQty",
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

                <Field label="Hold Quantity">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={
                      formData.holdQty
                    }
                    onChange={(
                      event
                    ) =>
                      updateField(
                        "holdQty",
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
                      formData.unit
                    }
                    readOnly
                    className={
                      inputClass
                    }
                  />
                </Field>
              </div>
            </Section>

            <Section title="Final Details">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Field
                  label="Quality Checked By"
                  required
                >
                  <input
                    value={
                      formData.checkedBy
                    }
                    onChange={(
                      event
                    ) =>
                      updateField(
                        "checkedBy",
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

                <Field label="Packed By">
                  <input
                    value={
                      formData.packedBy
                    }
                    onChange={(
                      event
                    ) =>
                      updateField(
                        "packedBy",
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

                <Field label="Packaging">
                  <input
                    value={
                      formData.packaging
                    }
                    onChange={(
                      event
                    ) =>
                      updateField(
                        "packaging",
                        event
                          .target
                          .value
                      )
                    }
                    className={
                      inputClass
                    }
                    placeholder="e.g. 1 master carton"
                  />
                </Field>

                <Field label="Cost Rate">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={
                      formData.rate
                    }
                    onChange={(
                      event
                    ) =>
                      updateField(
                        "rate",
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

              <div className="mt-4">
                <Field label="Remarks">
                  <textarea
                    rows="4"
                    value={
                      formData.remarks
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
                    className={`${inputClass} min-h-[105px]`}
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
                className="flex items-center justify-center gap-2 rounded-lg bg-slate-700 px-6 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {saving ? (
                  <Loader2
                    size={
                      17
                    }
                    className="animate-spin"
                  />
                ) : (
                  <CheckCircle2
                    size={
                      17
                    }
                  />
                )}

                Save Draft
              </button>

              <button
                type="button"
                onClick={
                  postOutput
                }
                disabled={
                  saving
                }
                className="flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                {saving ? (
                  <Loader2
                    size={
                      17
                    }
                    className="animate-spin"
                  />
                ) : (
                  <Send
                    size={
                      17
                    }
                  />
                )}

                Post Production Output
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
                size={
                  20
                }
              />
            </button>

            <h1 className="text-xl font-bold">
              Ready Product
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
              className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-bold text-blue-700"
            >
              <Plus
                size={
                  16
                }
              />

              New Ready Product
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          <StatCard
            label="Total"
            value={
              stats.total
            }
          />

          <StatCard
            label="Draft"
            value={
              stats.draft
            }
          />

          <StatCard
            label="Posted"
            value={
              stats.posted
            }
          />

          <StatCard
            label="Output Quantity"
            value={formatQuantity(
              stats.output
            )}
          />

          <StatCard
            label="Rejected"
            value={formatQuantity(
              stats.rejected
            )}
            danger
          />

          <StatCard
            label="Completed Printing"
            value={
              stats.eligible
            }
          />
        </div>

        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center md:justify-between">
            <h2 className="font-bold text-slate-800">
              Ready Product Register
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
                  className="w-full rounded-lg border py-2 pl-9 pr-3 text-xs sm:w-72"
                  placeholder="Search ready, job, printing, product..."
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
            <table className="w-full min-w-[1220px] text-left text-xs">
              <thead className="bg-slate-800 uppercase text-white">
                <tr>
                  <th className="p-4">
                    Ready / Printing
                  </th>

                  <th className="p-4">
                    Job
                  </th>

                  <th className="p-4">
                    Finished Good
                  </th>

                  <th className="p-4 text-right">
                    Printing Good
                  </th>

                  <th className="p-4 text-right">
                    Passed
                  </th>

                  <th className="p-4 text-right">
                    Rejected
                  </th>

                  <th className="p-4 text-right">
                    Hold
                  </th>

                  <th className="p-4">
                    QC
                  </th>

                  <th className="p-4">
                    Warehouse
                  </th>

                  <th className="p-4 text-right">
                    Amount
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
                      colSpan="12"
                      className="p-10 text-center"
                    >
                      <Loader2 className="mx-auto animate-spin text-blue-600" />
                    </td>
                  </tr>
                ) : filteredEntries.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan="12"
                      className="p-10 text-center text-slate-400"
                    >
                      No ready product records found.
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map(
                    (
                      entry
                    ) => {
                      const busy =
                        actionId ===
                        entry._id;

                      return (
                        <tr
                          key={
                            entry._id
                          }
                          className="border-t hover:bg-slate-50"
                        >
                          <td className="p-4">
                            <div className="font-bold text-blue-700">
                              {
                                entry.readyNo
                              }
                            </div>

                            <div className="mt-1 font-semibold">
                              {
                                entry.printingNo
                              }
                            </div>

                            <div className="text-[10px] text-slate-500">
                              {
                                entry.qcDate
                              }
                            </div>
                          </td>

                          <td className="p-4">
                            <div className="font-semibold">
                              {
                                entry.jobNo
                              }
                            </div>

                            <div className="text-[10px] text-slate-500">
                              {entry.customerName ||
                                "-"}
                            </div>
                          </td>

                          <td className="p-4">
                            <div className="font-semibold">
                              {
                                entry.finishedGoodName
                              }
                            </div>

                            <div className="font-mono text-[10px] text-blue-600">
                              {
                                entry.finishedGoodCode
                              }
                            </div>
                          </td>

                          <td className="p-4 text-right">
                            {formatQuantity(
                              entry.printingGoodQty
                            )}{" "}
                            {
                              entry.unit
                            }
                          </td>

                          <td className="p-4 text-right font-bold text-emerald-700">
                            {formatQuantity(
                              entry.passedQty
                            )}
                          </td>

                          <td className="p-4 text-right font-bold text-red-700">
                            {formatQuantity(
                              entry.rejectedQty
                            )}
                          </td>

                          <td className="p-4 text-right font-bold text-amber-700">
                            {formatQuantity(
                              entry.holdQty
                            )}
                          </td>

                          <td className="p-4">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${qcClass(
                                entry.qcStatus
                              )}`}
                            >
                              {
                                entry.qcStatus
                              }
                            </span>

                            <div className="mt-1 text-[10px] text-slate-500">
                              {entry.checkedBy ||
                                "-"}
                            </div>
                          </td>

                          <td className="p-4">
                            Finished Goods Warehouse
                          </td>

                          <td className="p-4 text-right font-bold">
                            {money(
                              entry.totalAmount
                            )}
                          </td>

                          <td className="p-4 text-center">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-bold ${statusClass(
                                entry.status
                              )}`}
                            >
                              {
                                entry.status
                              }
                            </span>
                          </td>

                          <td className="p-4">
                            <div className="flex justify-center gap-1.5">
                              {entry.status ===
                                "Draft" && (
                                <>
                                  <ActionButton
                                    title="Edit"
                                    onClick={() =>
                                      openEdit(
                                        entry
                                      )
                                    }
                                    disabled={
                                      busy
                                    }
                                    color="blue"
                                  >
                                    <Edit3
                                      size={
                                        15
                                      }
                                    />
                                  </ActionButton>

                                  <ActionButton
                                    title="Post Output"
                                    onClick={() =>
                                      postDraft(
                                        entry
                                      )
                                    }
                                    disabled={
                                      busy
                                    }
                                    color="emerald"
                                  >
                                    <Send
                                      size={
                                        15
                                      }
                                    />
                                  </ActionButton>

                                  <ActionButton
                                    title="Delete"
                                    onClick={() =>
                                      deleteDraft(
                                        entry
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
                                </>
                              )}

                              {entry.status ===
                                "Posted" && (
                                <ActionButton
                                  title="Cancel and Reverse"
                                  onClick={() =>
                                    cancelPosted(
                                      entry
                                    )
                                  }
                                  disabled={
                                    busy
                                  }
                                  color="orange"
                                >
                                  <XCircle
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
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg p-2 disabled:cursor-not-allowed disabled:opacity-40 ${colors[color]}`}
    >
      {children}
    </button>
  );
};

export default ReadyProductEntry;