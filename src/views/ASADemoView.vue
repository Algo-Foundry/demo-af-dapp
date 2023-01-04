<template>
    <div id="sendalgo-app">
        <h3>Select wallet</h3>
        <div class="d-grid gap-2 mb-5">
            <button @click="connectToAlgoSigner()" class="btn btn-primary">
                AlgoSigner (Sandbox)
            </button>
        </div>
        <div v-if="this.account !== ''" class="mb-5">
            <h3>Connected</h3>
            <p>
                Connection: <span>{{ this.connection }}</span>
            </p>
            <p>
                Network: <span>{{ this.network }}</span>
            </p>
            <p>
                Account: <span>{{ this.account }}</span>
            </p>
        </div>
        <send-asset-form
            v-if="this.connection === 'algosigner'"
            :connection="this.connection"
            :network="this.network"
            :receiver="this.account"
        />
    </div>
</template>

<script>
export default {
    data() {
        return {
            connection: "", // myalgo | walletconnect | algosigner
            connector: null, // wallet connector obj
            network: 'SandNet', // network name
            account: "", // connected account
        };
    },
    methods: {
        async connectToAlgoSigner() {
            const algorand = window.algorand;

            if (typeof algorand !== "undefined") {
                const res = await algorand.enable();
                
                // use non-creator address
                this.account = res.accounts[1];

                this.connection = "algosigner";
            }
        },
    },
};
</script>
