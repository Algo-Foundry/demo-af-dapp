<template>
    <div id="receiveasset" class="mb-5">
        <h3>Receive ACS Coins from creator</h3>
        <div
            v-if="this.acsTxId !== ''"
            class="alert alert-success"
            role="alert"
        >
            Txn Ref:
            <a :href="explorerURL" target="_blank">{{ this.acsTxId }}</a>
        </div>
        <form
            v-if="this.selectedAccount !== ''"
            action="#"
            @submit.prevent="handleReceiveTokens"
        >
            <div class="mb-3">
                <label for="amount_acs" class="form-label"
                    >asset to receive</label
                >
                <input
                    type="number"
                    class="form-control"
                    id="amount_acs"
                    v-model="amount_acs"
                />
            </div>
            <button type="submit" class="btn btn-primary">Receive</button>
        </form>
        <div class="mt-5">
            <h3>Receive NFT</h3>
            <nft-comp
                v-for="nft in nfts" :key="nft.assetIndex"
                :nft="nft"
                @receiveNFT="handleReceiveNFT"
                @returnNFT="handleReturnNFT"
            />
        </div>
    </div>
</template>

<script>
import asa from "../asa.js";
import acsCoinConfig from "../artifacts/0-deploy-assets.js.cp.yaml"; //asc coin
import nftConfig from "../artifacts/1-deploy-nft.js.cp.yaml"; //nft
import axios from "axios";
import WalletConnect from "@walletconnect/client";
import { PeraWalletConnect } from "@perawallet/connect";
import { DeflyWalletConnect } from "@blockshake/defly-connect";

export default {
    props: {
        connection: String,
        network: String,
        walletclient: [WalletConnect, PeraWalletConnect, DeflyWalletConnect],
        selectedAccount: String,
    },
    data() {
        return {
            acsTxId: "",
            amount_acs: 1,
            explorerURL: "",
            acsCoinId: "",
            nfts: [],
            creator: process.env.VUE_APP_CREATOR_ADDR,
        };
    },
    methods: {
        async updateTxn(value) {
            this.acsTxId = value;
            this.setExplorerURL(value);
        },
        async handleReceiveTokens() {
            const hasOptedIn = await this.doAssetOptIn(this.selectedAccount, this.acsCoinId);
            if (hasOptedIn) {
                await this.doAssetTransfer(
                    this.creator,
                    this.selectedAccount,
                    this.acsCoinId,
                    this.amount_acs
                );
            }
        },
        async handleReceiveNFT(thisNFT) {
            const hasOptedIn = await this.doAssetOptIn(this.selectedAccount, thisNFT.assetIndex);
            if (hasOptedIn) {
                await this.doAssetTransfer(
                    this.creator,
                    this.selectedAccount,
                    thisNFT.assetIndex,
                    1
                );
            }
            
        },
        async handleReturnNFT(thisNFT) {
            await this.doAssetTransfer(
                this.selectedAccount,
                this.creator,
                thisNFT.assetIndex,
                1
            );
        },
        async doAssetOptIn(receiver, assetId) {
            // clear notification
            this.acsTxId = "";

            // do asset opt in if receiver hasn't opted in to receive asset
            const receiverInfo = await asa.getAccountInfo(
                receiver,
                this.network
            );
            const optedInAsset = receiverInfo.assets.find((asset) => {
                return asset["asset-id"] === assetId;
            });

            let optedIn = false;
            if (optedInAsset === undefined) {
                const optInResponse = await asa.assetOptIn(
                    receiver,
                    assetId,
                    this.network,
                    this.connection,
                    this.walletclient
                );
                if (optInResponse && optInResponse.txId !== undefined) {
                    optedIn = true;
                }
            } else {
                optedIn = true;
            }

            if (!optedIn) {
                console.error("Receiver hasn't opted in to receive the asset.");
            }

            return optedIn;
        },
        async doAssetTransfer(sender, receiver, assetId, amount) {
            // clear notification
            this.acsTxId = "";

            const response = await asa.transferAsset(
                sender,
                receiver,
                assetId,
                amount,
                this.network,
                this.connection,
                this.walletclient
            );

            if (response !== undefined) {
                this.acsTxId = response.txId;
                this.setExplorerURL(response.txId);
            }
        },
        setExplorerURL(txId) {
            switch (this.network) {
                case "TestNet":
                    this.explorerURL =
                        "https://testnet.algoexplorer.io/tx/" + txId;
                    break;
                default:
                    this.explorerURL =
                        "http://localhost:8980/v2/transactions/" +
                        txId +
                        "?pretty";
                    break;
            }
        },
        setFungibleTokenId() {
            this.acsCoinId = this.network === "SandNet" ? acsCoinConfig.default.asa.acsCoinASA.assetIndex : acsCoinConfig.testnet.asa.acsCoinASA.assetIndex;
        },
        setCreator() {
            this.creator = this.network === "SandNet" ? process.env.VUE_APP_CREATOR_ADDR : process.env.VUE_APP_CREATOR_ADDR_TESTNET;
        },
        async setNFTData() {
            const nftData = this.network === "SandNet" ? nftConfig.default.asa : nftConfig.testnet.asa;

            this.nfts = await Promise.all(nftData.map( async (nft) => {
                let assetName = nft[0];
                let assetData = nft[1];
                
                if (this.network === "SandNet") {
                    assetName = nft[1][0];
                    assetData = nft[1][1];
                }

                const url = assetData.assetDef.url.replace(
                    "ipfs://",
                    "https://cloudflare-ipfs.com/ipfs/"
                );
                
                const response = await axios.get(url);
                const jsonMetadata = response.data;
                
                const imgUrl = jsonMetadata.image.replace(
                    "ipfs://",
                    "https://gateway.pinata.cloud/ipfs/"
                );

                const validHash = asa.checkMetadataHash(
                    assetData.assetDef.metadataHash,
                    assetData.assetDef.url
                );
                
                return {
                    name: assetName,
                    ...assetData.assetDef,
                    assetIndex: assetData.assetIndex,
                    creator: assetData.creator,
                    txId: assetData.txId,
                    jsonMetadata,
                    imgUrl,
                    validHash
                }
            }));
        },
    },
    async mounted() {
        await this.setNFTData();
        this.setFungibleTokenId();
        this.setCreator();
    },
};
</script>
