<script lang="ts">
	export let tooltip: string | null = null;
	export let name: string;
	export let size = "";

	$: classNames = `icon ${size}`;
	$: svgHref = `#icon:${name}`;
</script>

<svg class={classNames} aria-label={tooltip ? tooltip : null}>
	<use xlink:href={svgHref} />
</svg>
