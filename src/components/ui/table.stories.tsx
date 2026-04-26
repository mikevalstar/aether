import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "./badge";
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "./table";

const meta = {
  title: "Design System/Data Display/Table",
  tags: ["autodocs"],
  component: Table,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

const rows = [
  { id: "run_01", task: "daily-standup", model: "Haiku 4.5", tokens: "12.4K", cost: "$0.0042", status: "ok" },
  { id: "run_02", task: "pr-review", model: "Sonnet 4.6", tokens: "98.1K", cost: "$0.4710", status: "ok" },
  { id: "run_03", task: "weekly-rollup", model: "Opus 4.6", tokens: "212.0K", cost: "$3.1800", status: "error" },
];

export const Default: Story = {
  render: () => (
    <Table>
      <TableCaption>Recent task runs</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Task</TableHead>
          <TableHead>Model</TableHead>
          <TableHead className="text-right">Tokens</TableHead>
          <TableHead className="text-right">Cost</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="font-medium">{r.task}</TableCell>
            <TableCell>{r.model}</TableCell>
            <TableCell className="text-right font-mono text-xs">{r.tokens}</TableCell>
            <TableCell className="text-right font-mono text-xs">{r.cost}</TableCell>
            <TableCell>
              <Badge variant={r.status === "ok" ? "secondary" : "destructive"}>{r.status}</Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={3}>Total</TableCell>
          <TableCell className="text-right font-mono text-xs">$3.6552</TableCell>
          <TableCell />
        </TableRow>
      </TableFooter>
    </Table>
  ),
};
