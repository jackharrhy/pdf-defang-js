# Walk notes

Close these in the pdf-lib walk. Python pdf-defang has the same holes.

## `/A /Next`

Acrobat runs the whole chain. A first action of `GoTo` or a safe URI whose `/Next` (dict or array) is JavaScript, Launch, or another listed type is still dirty. Treat the whole `/A` as dirty if any step is.

Walk `/Next` with a `seen` set so a cycle does not loop forever.

Do not recurse. A long unique `/Next` list (thousands of distinct hops, not a cycle) blows the JS stack. A fail-open caller then stores the original file, including catalog `OpenAction` already found. Use an explicit stack or queue.

## AcroForm `Kids`

`visitOnce` skipping a repeat is not enough if you still walk `Kids` after that. A cycle overflows. If a field is already in `seen`, stop.

Walk the field tree iteratively too. A deep unique `Kids` list has the same stack problem as a deep `/Next` list.

`countNamedTreeEntries` needs the same `seen` set and an iterative walk.

This library should still fail loudly on unreadable files. The walk itself should not throw on a cycle or a long chain.
