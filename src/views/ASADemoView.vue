<template>
    <div id="sendalgo-app">
        <h3>Select wallet</h3>
        <div class="d-grid gap-2 mb-5">
            <button @click="connectToWalletConnect" class="btn btn-primary mr-3">WalletConnect</button>
            <button @click="connectToPeraWallet" class="btn btn-primary mr-3">Pera Wallet</button>
            <button @click="connectToDeflyWallet" class="btn btn-primary mr-3">Defly Wallet</button>
            <button @click="connectToSandNet" class="btn btn-primary mr-3">Sandbox (SandNet)</button>
        </div>
        <div v-if="this.accounts.length > 0" class="mb-5">
            <h3>Select Account</h3>
            <select v-model="selectedAccount" class="form-select mb-2" @change="handleChangeAccount">
                <option v-for="(acc, index) in accounts" :value="acc" :key="index">{{ acc }}</option>
            </select>
            <p>
                Connection: <span>{{ this.connection }}</span>
            </p>
            <p>
                Network: <span>{{ this.network }}</span>
            </p>
            <button @click="disconnect" class="btn btn-primary">Disconnect</button>
        </div>
        <send-asset-form
            v-if="this.connection !== ''"
            :connection="this.connection"
            :network="this.network"
            :walletclient="this.walletclient"
            :selectedAccount="this.selectedAccount"
        />
    </div>
</template>

<script>
import WalletConnect from "@walletconnect/client";
import QRCodeModal from "algorand-walletconnect-qrcode-modal";
import { PeraWalletConnect } from "@perawallet/connect";
import { DeflyWalletConnect } from "@blockshake/defly-connect";
import kmd from "../kmd";

export default {
    data() {
        return {
            connection: "", // walletconnect | perawallet | defly
            walletclient: null, // instance of PeraWalletConnect | DeflyWalletConnect | WalletConnect
            network: "", // network name
            accounts: [],
            selectedAccount: "",
        };
    },
    methods: {
        handleChangeAccount(evt) {
            this.selectedAccount = evt.target.value;
        },
        async connectToSandNet() {
            this.network = "SandNet";
            this.accounts = await kmd.getSandboxAccounts();
            this.selectedAccount = this.accounts[0];
            this.connection = "sandbox";
        },
        async connectToWalletConnect() {
            this.network = "TestNet";

            // Create a connector
            this.walletclient = new WalletConnect({
                bridge: "https://bridge.walletconnect.org", // Required
                qrcodeModal: QRCodeModal,
            });

            // // Kill existing session
            if (this.walletclient.connected) {
                await this.walletclient.killSession();
            }

            this.walletclient.createSession();

            // Subscribe to connection events
            this.walletclient.on("connect", async (error, payload) => {
                if (error) {
                    throw error;
                }

                const { accounts } = payload.params[0];
                this.accounts = accounts;
                this.selectedAccount = accounts[0];
                this.connection = "walletconnect";
            });

            this.walletclient.on("session_update", async (error, payload) => {
                if (error) {
                    throw error;
                }

                const { accounts } = payload.params[0];
                this.accounts = accounts;
                this.selectedAccount = accounts[0];
                this.connection = "walletconnect";
            });

            this.walletclient.on("disconnect", (error) => {
                if (error) {
                    throw error;
                }
            });
        },
        async connectToPeraWallet() {
            this.network = "TestNet";

            try {
                this.walletclient = await new PeraWalletConnect();

                // reconnect session if it exists
                let accounts = await this.walletclient.reconnectSession();

                if (accounts.length <= 0) {
                    accounts = await this.walletclient.connect();
                }

                // disconnect listener
                this.walletclient.connector?.on("disconnect", (error) => {
                    if (error) {
                        throw error;
                    }
                });

                // you will need pera wallet instance to sign transactions
                this.accounts = accounts;
                this.selectedAccount = accounts[0];
                this.connection = "perawallet";
            } catch (error) {
                if (error?.data?.type !== "CONNECT_MODAL_CLOSED") {
                    // log the necessary errors
                }
            }
        },
        async connectToDeflyWallet() {
            this.network = "TestNet";

            try {
                this.walletclient = new DeflyWalletConnect();

                // reconnect session if it exists
                let accounts = await this.walletclient.reconnectSession();

                if (accounts.length <= 0) {
                    accounts = await this.walletclient.connect();
                }

                this.walletclient.connector?.on("disconnect", (error) => {
                    if (error) {
                        throw error;
                    }
                });

                this.accounts = accounts;
                this.selectedAccount = accounts[0];
                this.connection = "deflywallet";
            } catch (error) {
                if (error?.data?.type !== "CONNECT_MODAL_CLOSED") {
                    // log the necessary errors
                }
            }
        },
        async disconnect() {
            switch (this.connection) {
                case "perawallet":
                case "deflywallet":
                    await this.walletclient.disconnect();
                    break;
                case "walletconnect":
                    await this.walletclient.killSession();
                    break;
                default:
                    break;
            }

            this.connection = "";
            this.walletclient = null;
            this.accounts = [];
            this.selectedAccount = "";
        },
    },
};
</script>
