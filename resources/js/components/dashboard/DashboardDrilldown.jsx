import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DrilldownDrawer } from "../ui/DrilldownDrawer";
import DataTable from "../ui/DataTable";
import { analyticsApi } from "../../services/api";

const LABELS = {
    event_date: "Date",
    branch: "Branch",
    bill_no: "Bill No.",
    receipt_no: "Receipt No.",
    admission_no: "Admission No.",
    uhid: "UHID",
    patient_name: "Patient",
    visit_id: "Visit ID",
    patient_type: "Patient Type",
    treating_department: "Department",
    treating_doctor: "Doctor",
    service_type: "Service Type",
    service_item_name: "Service",
    payer_name: "Payer",
    net_amount: "Net Amount",
    paid_amount: "Paid Amount",
    admission_type: "Admission Type",
    discharge_type: "Discharge Type",
    ward: "Ward",
    actual_los: "LOS",
    surgery_name: "Surgery",
    surgery_category: "Category",
    surgery_department: "Department",
    performing_surgeon: "Surgeon",
    ot_name: "OT",
    status: "Status",
};

const TYPE_COLUMNS = {
    bills: [
        "event_date",
        "bill_no",
        "uhid",
        "patient_name",
        "patient_type",
        "treating_department",
        "treating_doctor",
        "service_item_name",
        "payer_name",
        "net_amount",
    ],
    admissions: [
        "event_date",
        "admission_no",
        "uhid",
        "patient_name",
        "admission_type",
        "treating_department",
        "treating_doctor",
        "ward",
        "payer_name",
        "actual_los",
    ],
    discharges: [
        "event_date",
        "admission_no",
        "uhid",
        "patient_name",
        "discharge_type",
        "treating_department",
        "treating_doctor",
        "ward",
        "actual_los",
    ],
    collections: [
        "event_date",
        "receipt_no",
        "uhid",
        "patient_name",
        "visit_id",
        "patient_type",
        "payment_mode",
        "payer_name",
        "paid_amount",
    ],
    surgeries: [
        "event_date",
        "admission_no",
        "uhid",
        "patient_name",
        "surgery_name",
        "surgery_category",
        "surgery_department",
        "performing_surgeon",
        "ot_name",
        "status",
    ],
};

const currency = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
});

export const DashboardDrilldown = ({ selection, onClose, params }) => {
    const [page, setPage] = useState(1);
    const type = selection?.type;

    const { data, isLoading, isError } = useQuery({
        queryKey: ["dashboard-drilldown", type, params, page],
        queryFn: () =>
            analyticsApi
                .drilldown(type, { ...params, page, limit: 25 })
                .then((r) => r.data),
        enabled: !!type,
        keepPreviousData: true,
    });

    const pagination = data?.success ? data.data : null;
    const rows = pagination?.data || [];
    const columns = useMemo(
        () =>
            (TYPE_COLUMNS[type] || []).map((key) => ({
                accessorKey: key,
                header: LABELS[key] || key,
                cell: ({ getValue }) => {
                    const value = getValue();
                    if (value == null || value === "") return "—";
                    if (key === "net_amount" || key === "paid_amount")
                        return currency.format(Number(value));
                    return String(value);
                },
                meta:
                    key === "net_amount" || key === "paid_amount"
                        ? { align: "right" }
                        : undefined,
            })),
        [type],
    );

    return (
        <DrilldownDrawer
            open={!!selection}
            title={selection?.label || "Metric details"}
            description="Records use the same branches, dates, and dimensions as the dashboard metric."
            onClose={() => {
                setPage(1);
                onClose();
            }}
        >
            {isError ? (
                <div
                    className="rounded-md border p-4 text-[12px]"
                    role="alert"
                    style={{
                        borderColor: "var(--color-danger)",
                        color: "var(--color-danger)",
                    }}
                >
                    Unable to load these details. Your role may not include
                    drill-down access.
                </div>
            ) : (
                <DataTable
                    data={rows}
                    columns={columns}
                    searchable={false}
                    loading={isLoading}
                    emptyText="No records match the applied filters."
                    server={{
                        total: pagination?.total || 0,
                        pageCount: pagination?.last_page || 1,
                        onPageChange: setPage,
                    }}
                />
            )}
        </DrilldownDrawer>
    );
};
