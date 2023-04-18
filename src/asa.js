import algosdk from "algosdk";
import { getAlgodClient } from "./client.js";
import wallets from "./wallets.js";
import { convertByte32ToIpfsCidV0 } from "../scripts/helpers/ipfs2bytes32.js";

const assetOptIn = async (receiverAddr, assetId, network, connection, connector) => {
    if (!(receiverAddr && assetId)) {
        console.error("error", receiverAddr, assetId);
        return;
    }

    const algodClient = getAlgodClient(network);

    // create suggested parameters
    const suggestedParams = await algodClient.getTransactionParams().do();

    let txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: receiverAddr,
        to: receiverAddr,
        assetIndex: assetId,
        suggestedParams
    });

    return await signAndSubmitTxns(connection, connector, txn, network);
};

const transferAsset = async (senderAddr, receiverAddr, assetId, amount, network, connection, connector) => {
    // convert to integer
    const amountParsed = parseInt(amount);
    if (
        !(receiverAddr && assetId && amountParsed && senderAddr) ||
        amountParsed <= 0
    ) {
        console.error("error", receiverAddr, assetId, amount, senderAddr);
        return;
    }

    const algodClient = getAlgodClient(network);

    // create suggested parameters
    const suggestedParams = await algodClient.getTransactionParams().do();

    let txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: senderAddr,
        to: receiverAddr,
        assetIndex: assetId,
        amount: amountParsed,
        suggestedParams
    });

    return await signAndSubmitTxns(connection, connector, txn, network);
};

const getAccountInfo = async (address, network) => {
    const algodClient = getAlgodClient(network);

    return await algodClient.accountInformation(address).do();
};

const checkMetadataHash = (uint8ArrHash, assetURL) => {
    // convert uint8array to hex string
    let metadataHash = Buffer.from(uint8ArrHash).toString("hex");

    // get IPFS cid of json metadata 
    const cid = convertByte32ToIpfsCidV0(metadataHash);
    // console.log(cid);

    // check if cid from assetURL is the same as cid extracted from metadata hash
    let cid_from_assetURL = assetURL.replace("ipfs://", "");
    cid_from_assetURL = cid_from_assetURL.replace("#arc3", "");
    // console.log(cid_from_assetURL);

    return cid_from_assetURL === cid;
}

const signAndSubmitTxns = async (connection, connector, txn, network) => {
    const algodClient = getAlgodClient(network);

    switch (connection) {
        case "perawallet":
            return await wallets.sendPeraWalletTransaction(connector, txn, algodClient);
        case "walletconnect":
            return await wallets.sendWalletConnectTransaction(connector, txn, algodClient);
        case "deflywallet":
            return await wallets.sendDeflyWalletTransaction(connector, txn, algodClient);
        case "sandbox":
            return await wallets.sendSandboxTransaction(txn, algodClient);
        default:
            return;
    }
};

export default {
    assetOptIn,
    transferAsset,
    checkMetadataHash,
    getAccountInfo,
};