import { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface ActivityLeaderboardColumn<TRow> {
  header: string;
  className?: string;
  cell: (row: TRow) => ReactNode;
}

interface ActivityLeaderboardProps<TRow> {
  title: string;
  rows: TRow[];
  columns: ActivityLeaderboardColumn<TRow>[];
  isLoading?: boolean;
  error?: unknown;
  emptyMessage?: string;
  getRowKey: (row: TRow) => string;
}

const getRankBadgeClassName = (rank: number) => {
  if (rank === 1) return "bg-primary text-primary-foreground border-0";
  if (rank === 2) return "bg-accent text-accent-foreground border-0";
  if (rank === 3) return "bg-secondary text-secondary-foreground border-0";
  return "bg-muted text-muted-foreground border-0";
};

const getRowHighlightClassName = (rank: number) => {
  if (rank === 1) return "bg-primary/5";
  if (rank === 2) return "bg-accent/5";
  if (rank === 3) return "bg-secondary/30";
  return "";
};

const ActivityLeaderboard = <TRow,>({
  title,
  rows,
  columns,
  isLoading = false,
  error,
  emptyMessage = "No activity data available yet.",
  getRowKey,
}: ActivityLeaderboardProps<TRow>) => (
  <Card className="card-dashboard">
    <CardHeader className="pb-4">
      <CardTitle className="text-lg font-semibold">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="grid grid-cols-5 gap-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        <p className="py-10 text-center text-sm text-destructive">
          Failed to load activity data.
        </p>
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Rank</TableHead>
              {columns.map((column) => (
                <TableHead key={column.header} className={column.className}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.slice(0, 10).map((row, index) => {
              const rank = index + 1;

              return (
                <TableRow key={getRowKey(row)} className={cn(getRowHighlightClassName(rank))}>
                  <TableCell>
                    <Badge className={getRankBadgeClassName(rank)}>#{rank}</Badge>
                  </TableCell>
                  {columns.map((column) => (
                    <TableCell
                      key={`${getRowKey(row)}-${column.header}`}
                      className={cn(rank <= 3 && "font-medium", column.className)}
                    >
                      {column.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </CardContent>
  </Card>
);

export default ActivityLeaderboard;
