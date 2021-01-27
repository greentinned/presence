<script>
    import { createEventDispatcher } from "svelte";
    import DebuggerItem from "./DebuggerItem.svelte";

    // Pros
    export let messages;
    let selectedIndex;

    // Events
    const dispatcher = createEventDispatcher();

    function onMessage(i) {
        selectedIndex = i;
        dispatcher("message", messages[i]);
    }

    function onResolve(i) {
        dispatcher("resolve", messages[i]);
    }
</script>

<div class="Debugger">
    {#each messages as { descr }, i}
        <DebuggerItem
            title={descr}
            selected={selectedIndex === i}
            on:resolve={() => onResolve(i)}
            on:click={() => onMessage(i)}
        />
    {/each}
</div>

<style>
</style>
