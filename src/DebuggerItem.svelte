<script>
    import { createEventDispatcher } from "svelte";
    import Icon from "./Icon.svelte";

    // Props
    export let title;
    export let selected;
    let hovered = false;
    $: cn = `Debugger-Item ${hovered ? "Debugger-Item_Hover" : ""} ${
        selected ? "Debugger-Item_Selected" : ""
    }`;

    // Events
    const dispatcher = createEventDispatcher();

    function onResolve() {
        dispatcher("resolve");
    }

    function onHover(value) {
        hovered = value;
    }
</script>

<div
    class={cn}
    on:mouseover={() => onHover(true)}
    on:mouseout={() => onHover(false)}
    on:click
>
    <Icon name={"Warning"} />
    <div class="Debugger-ItemTitle">{@html title}</div>
    <button on:click={onResolve}>Resolve</button>
</div>

<style>
    .Debugger-Item {
        display: flex;
        align-items: center;
        cursor: default;
        padding: 0 8px 0 2px;
        min-height: 32px;
        user-select: none;
    }
    .Debugger-Item.Debugger-Item_Hover {
        background-color: rgba(0, 0, 0, 0.06);
    }
    .Debugger-Item.Debugger-Item_Selected {
        background-color: #daebf7 !important;
        outline: none;
    }
    .Debugger-ItemTitle {
        padding: 8px 0;
    }
    .Debugger-ItemIcon {
        background: magenta;
        min-width: 32px;
        min-height: 32px;
    }
    .Debugger-ItemTitle {
        margin: 0 8px 0 0;
    }
</style>
