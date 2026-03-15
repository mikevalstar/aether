export function ContentView({ content }: { content: string }) {
	return (
		<pre className="overflow-x-auto rounded-md border bg-muted/30 p-4 text-xs leading-relaxed">
			{content}
		</pre>
	);
}
