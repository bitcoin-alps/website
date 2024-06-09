<script lang="ts">
    import { nanoid } from "nanoid";
	import type { ValidatingStoreItem, ValidatingStore } from "./validating-store";

    export let store: ValidatingStore<any>;
    export let name: string;
    export let label: string;

    export let type: "text" | "email" | "url" | "tel"  = "text";
    export let autocomplete: string | null = null;
    export let placeholder: string | null = null;

    let id = nanoid();
</script>

<div class="field is-floating-in-label">
    <label for={id} class="label">{label}</label>
    <div class="control">
        <input class="input" {id} name={$store[name].name} {...{type}} {autocomplete} {placeholder} bind:value={$store[name].value} on:blur={() => $store[name].touch()} class:is-danger={$store[name].hasErrors} />
    </div>
    {#each $store[name].errors as error}
        <p class="help is-danger">{error}</p>
    {/each}
</div>
