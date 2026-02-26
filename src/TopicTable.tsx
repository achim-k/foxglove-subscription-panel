import {
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
} from "@mui/material";
import { useMemo, useState } from "react";

export type TopicRow = {
  topic: string;
  datatype: string | undefined;
  received: number;
  receivedBytes: number;
  preloaded: number;
  preloading: boolean;
};

type SortableColumn = "topic" | "datatype" | "received" | "receivedBytes" | "preloaded";
type Order = "asc" | "desc";

type ColumnDef = {
  key: SortableColumn;
  label: string;
  align: "left" | "right";
  width?: string;
};

const columns: ColumnDef[] = [
  { key: "topic", label: "Topic", align: "left", width: "30%" },
  { key: "datatype", label: "Datatype", align: "left", width: "25%" },
  { key: "received", label: "Received", align: "right", width: "12%" },
  { key: "receivedBytes", label: "Bytes", align: "right", width: "13%" },
  { key: "preloaded", label: "Preloaded", align: "right", width: "12%" },
];

const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return "0 B";
  }
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), BYTE_UNITS.length - 1);
  const value = bytes / 1024 ** exp;
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${BYTE_UNITS[exp]!}`;
}

const ellipsisSx = {
  maxWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
} as const;

function compare(a: TopicRow, b: TopicRow, orderBy: SortableColumn): number {
  const av = a[orderBy] ?? "";
  const bv = b[orderBy] ?? "";
  if (av < bv) {
    return -1;
  }
  if (av > bv) {
    return 1;
  }
  return 0;
}

type TopicTableProps = {
  rows: readonly TopicRow[];
  totalReceived: number;
  totalReceivedBytes: number;
  totalPreloaded: number;
};

export function TopicTable({
  rows,
  totalReceived,
  totalReceivedBytes,
  totalPreloaded,
}: TopicTableProps): JSX.Element {
  const [orderBy, setOrderBy] = useState<SortableColumn>("topic");
  const [order, setOrder] = useState<Order>("asc");

  const handleSort = (column: SortableColumn) => {
    if (orderBy === column) {
      setOrder(order === "asc" ? "desc" : "asc");
    } else {
      setOrderBy(column);
      setOrder("asc");
    }
  };

  const sortedRows = useMemo(() => {
    const sorted = [...rows].sort((a, b) => compare(a, b, orderBy));
    return order === "desc" ? sorted.reverse() : sorted;
  }, [rows, order, orderBy]);

  return (
    <TableContainer sx={{ overflow: "auto", height: "100%", padding: "1em" }}>
      <Table size="small" sx={{ tableLayout: "fixed" }}>
        <TableHead>
          <TableRow>
            {columns.map(({ key, label, align, width }) => (
              <TableCell
                key={key}
                align={align}
                sortDirection={orderBy === key ? order : false}
                sx={{ width, fontSize: "0.85rem" }}
              >
                <TableSortLabel
                  active={orderBy === key}
                  direction={orderBy === key ? order : "asc"}
                  onClick={() => {
                    handleSort(key);
                  }}
                >
                  {label}
                </TableSortLabel>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody sx={{ "& td, & th": { fontSize: "0.75rem" } }}>
          {sortedRows.map((row) => (
            <TableRow key={row.topic}>
              <EllipsisCell align="left">{row.topic}</EllipsisCell>
              <EllipsisCell align="left">{row.datatype ?? "<topic not available>"}</EllipsisCell>
              <TableCell align="right">{row.received}</TableCell>
              <TableCell align="right">{formatBytes(row.receivedBytes)}</TableCell>
              <TableCell align="right">
                {row.preloading && <CircularProgress size={12} sx={{ mr: 0.5 }} />}
                {row.preloaded}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter
          sx={{ "& td": { fontSize: "0.75rem", fontWeight: "bold", borderBottom: "none" } }}
        >
          <TableRow>
            <TableCell colSpan={2}>Total</TableCell>
            <TableCell align="right">{totalReceived}</TableCell>
            <TableCell align="right">{formatBytes(totalReceivedBytes)}</TableCell>
            <TableCell align="right">{totalPreloaded}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </TableContainer>
  );
}

function EllipsisCell({
  align,
  children,
}: {
  align: "left" | "right";
  children: string;
}): JSX.Element {
  return (
    <Tooltip title={children} enterDelay={500}>
      <TableCell align={align} sx={ellipsisSx}>
        {children}
      </TableCell>
    </Tooltip>
  );
}
