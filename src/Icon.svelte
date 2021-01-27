<script>
    export let name;

    $: cn = "Icon" + (name !== undefined ? ` Icon-${name}` : "");
</script>

<div class={cn} />

<style>
    .Icon {
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: default;
        min-width: 32px;
        min-height: 32px;
        user-select: none;
    }

    /* Icons */
    .Icon.Icon-TestBas64 {
        background-color: #333;
        -webkit-mask-image: url("./icons/warning.svg");
        mask-image: url("./icons/warning.svg");
    }
    .Icon.Icon-Warning {
        background-color: #333;
        -webkit-mask-image: url("data:image/svg+xml;base64,PHN2ZyBmaWxsPSJub25lIiBoZWlnaHQ9IjMyIiB2aWV3Qm94PSIwIDAgMzIgMzIiIHdpZHRoPSIzMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Im0xNiA5IDggMTRoLTE2em0tMSA4LjV2LTMuNWgydjMuNXptMCAxLjV2Mmgydi0yeiIgZmlsbD0iIzAwMCIgZmlsbC1ydWxlPSJldmVub2RkIi8+PC9zdmc+");
        mask-image: url("data:image/svg+xml;base64,PHN2ZyBmaWxsPSJub25lIiBoZWlnaHQ9IjMyIiB2aWV3Qm94PSIwIDAgMzIgMzIiIHdpZHRoPSIzMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Im0xNiA5IDggMTRoLTE2em0tMSA4LjV2LTMuNWgydjMuNXptMCAxLjV2Mmgydi0yeiIgZmlsbD0iIzAwMCIgZmlsbC1ydWxlPSJldmVub2RkIi8+PC9zdmc+");
    }

    .Icon.Icon-ResolveFilled {
        background-color: #333;
        -webkit-mask-image: url("data:image/svg+xml;base64,PHN2ZyBmaWxsPSJub25lIiBoZWlnaHQ9IjMyIiB2aWV3Qm94PSIwIDAgMzIgMzIiIHdpZHRoPSIzMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Im0xNiAyMy45OTk5YzQuNDE4MyAwIDgtMy41ODE3IDgtOHMtMy41ODE3LTguMDAwMDItOC04LjAwMDAyLTggMy41ODE3Mi04IDguMDAwMDIgMy41ODE3IDggOCA4em0zLjkxMTEtOS42MzQ1LS44MjIyLS43MzA4LTMuNjEyNSA0LjA2MzktMi41ODc1LTIuNTg3NC0uNzc3OC43Nzc4IDMuNDEyNSAzLjQxMjN6IiBmaWxsPSIjMDAwIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiLz48L3N2Zz4=");
        mask-image: url("data:image/svg+xml;base64,PHN2ZyBmaWxsPSJub25lIiBoZWlnaHQ9IjMyIiB2aWV3Qm94PSIwIDAgMzIgMzIiIHdpZHRoPSIzMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Im0xNiAyMy45OTk5YzQuNDE4MyAwIDgtMy41ODE3IDgtOHMtMy41ODE3LTguMDAwMDItOC04LjAwMDAyLTggMy41ODE3Mi04IDguMDAwMDIgMy41ODE3IDggOCA4em0zLjkxMTEtOS42MzQ1LS44MjIyLS43MzA4LTMuNjEyNSA0LjA2MzktMi41ODc1LTIuNTg3NC0uNzc3OC43Nzc4IDMuNDEyNSAzLjQxMjN6IiBmaWxsPSIjMDAwIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiLz48L3N2Zz4=");
    }
</style>
