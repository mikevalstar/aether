export function ContentView({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="overflow-hidden rounded-md border">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs leading-relaxed font-mono">
          <tbody>
            {lines.map((line, i) => (
              <tr
                // biome-ignore lint/suspicious/noArrayIndexKey: content lines lack stable IDs
                key={i}
                className="hover:bg-muted/40 transition-colors"
              >
                <td className="min-w-[3ch] select-none whitespace-nowrap border-r border-border/30 px-2.5 py-0 text-right text-muted-foreground/50 tabular-nums">
                  {i + 1}
                </td>
                <td className="px-3 py-0 whitespace-pre text-muted-foreground">{line}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
