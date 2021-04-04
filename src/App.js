import "./App.scss"

////////////////////////////////////////////////////////////////////////////////

const useIsomorphicLayoutEffect = typeof window === "undefined" ? React.useEffect : React.useLayoutEffect

function truthy(v) {
	return !!v
}

////////////////////////////////////////////////////////////////////////////////

// buildStyleObject builds a style object from a directional object. Properties
// such as 'x', 'y', and 'scale' are transformed to a 'transform' string.
// Transforms concatenate 'translateZ(0)'.
function buildStyleObject(dir) {
	const {
		durMS: _1, // No-op
		func: _2,  // No-op
		x,
		y,
		scale,
		...rest
	} = dir

	const out = { ...rest }
	if (x !== undefined || y !== undefined || scale !== undefined) {
		let transformStr = ""
		if (x !== undefined) {
			if (transformStr !== "") transformStr += " "
			transformStr += `translateX(${typeof x === "string" ? x : `${x}px`})`
		}
		if (y !== undefined) {
			if (transformStr !== "") transformStr += " "
			transformStr += `translateY(${typeof y === "string" ? y : `${y}px`})`
		}
		if (scale !== undefined) {
			if (transformStr !== "") transformStr += " "
			transformStr += `scale(${scale})`
		}
		transformStr += " "
		transformStr += `translateZ(0)`

		out.transform = transformStr
	}
	return out
}

function aliases(arr) {
	const out = arr.map(v => {
		switch (v) {
			case "durMS": // No-op
			case "func":  // No-op
				return undefined
			case "x":
			case "y":
			case "scale":
				return "transform"
		}
		// Convert to kebab-case
		return v.replace(/([A-Z])/g, (_, $1, x) => {
			return (x === 0 ? "" : "-") + $1.toLowerCase()
		})
	})
	return out.filter(v => v !== undefined)
}

// Usage:
//
// <Transition
//   from={{
//     boxShadow: `
//       0 0 1px hsla(0, 0%, 0%, 0.25),
//       0 0 transparent,
//       0 0 transparent
//     `,
//     opacity: 0,
//     y: -20,
//     scale: 0.75,
//     durMS: 1_000,
//   }}
//   to={{
//     boxShadow: `
//       0 0 1px hsla(0, 0%, 0%, 0.25),
//       0 8px 8px hsla(0, 0%, 0%, 0.1),
//       0 2px 8px hsla(0, 0%, 0%, 0.1)
//     `,
//     opacity: 1,
//     y: 0,
//     scale: 1,
//     durMS: 300,
//   }}
//   func="cubic-bezier(0, 0.75, 0.25, 1.1)"
// >
//   {open && (
//     // ...
//   )}
// </Transition>
//
function Transition({
	from,
	to,
	durMS,
	func,
	children,
}) {
	const [computedStyles, setComputedStyles] = React.useState(buildStyleObject(from))
	const [computedDurMS, setComputedDurMS] = React.useState(from.durMS ?? durMS ?? 300)
	const [computedFunc, setComputedFunc] = React.useState(from.func ?? func ?? "ease-out")
	const [computedChildren, setComputedChildren] = React.useState(children)

	// Layout effect to compute 'computedChildren' from 'children'
	useIsomorphicLayoutEffect(
		React.useCallback(() => {
			if (truthy(children)) {
				setComputedChildren(children)
				return
			}
			const timeoutID = setTimeout(() => {
				setComputedChildren(children)
			}, computedDurMS)
			return () => {
				clearTimeout(timeoutID)
			}
		}, [computedDurMS, children]),
		[children],
	)

	// Debounced effect to compute 'computedStyles', 'comptuedDurMS', and
	// 'computedFunc'
	React.useEffect(
		React.useCallback(() => {
			// Debounce by one frame
			const timeoutID = setTimeout(() => {
				let dir = from
				if (truthy(children) && truthy(computedChildren)) {
					dir = to
				}
				setComputedStyles(buildStyleObject(dir))
				setComputedDurMS(dir.durMS ?? durMS ?? 300)
				setComputedFunc(dir.func ?? func ?? "ease-out")
			}, 16.67)
			return () => {
				clearTimeout(timeoutID)
			}
		}, [from, to, durMS, func, children, computedChildren]),
		[children, computedChildren],
	)

	if (!truthy(computedChildren)) {
		return null
	}

	// Compute on every truthy render
	const distinct = [
		...new Set([
			...aliases(Object.keys(from)),
			...aliases(Object.keys(to)),
		]),
	]

	return React.cloneElement(computedChildren, {
		style: {
			...computedStyles,
			willChange: distinct.join(", "),
			transition: distinct.map(v => `${v} ${computedDurMS}ms ${computedFunc} 0ms`).join(", "),
		},
	})
}

export default function App() {
	const [open, setOpen] = React.useState(false)

	return (
		<>
			<button onClick={() => setOpen(!open)}>Press me</button>
			<div className="center">
				<Transition
					from={{
						boxShadow: `
							0 0 1px hsla(0, 0%, 0%, 0.25),
							0 0 transparent,
							0 0 transparent
						`,
						opacity: 0,
						y: -20,
						scale: 0.75,
						durMS: 500,
					}}
					to={{
						boxShadow: `
							0 0 1px hsla(0, 0%, 0%, 0.25),
							0 8px 8px hsla(0, 0%, 0%, 0.1),
							0 2px 8px hsla(0, 0%, 0%, 0.1)
						`,
						opacity: 1,
						y: 0,
						scale: 1,
						durMS: 300,
					}}
					func="cubic-bezier(0, 0.75, 0.25, 1.1)"
				>
					{open && (
						<div className="modal center">
							<h1>Hello, world!</h1>
						</div>
					)}
				</Transition>
			</div>
		</>
	)
}
