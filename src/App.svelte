<script>
    import Debugger from "./Debugger.svelte";

    // Callback from figma plugin
    let messages = [];

    onmessage = (event) => {
        messages = event.data.pluginMessage;
    };

    function onMessage(event) {
        parent.postMessage(
            {
                pluginMessage: {
                    type: "debugger",
                    id: event.detail.object.id,
                },
            },
            "*"
        );
    }

    function onResolve(event) {
        messages = messages.filter(
            (elem) => elem.object.id !== event.detail.object.id
        );
    }
</script>

<main>
    <Debugger {messages} on:message={onMessage} on:resolve={onResolve} />
</main>

<style>
</style>
