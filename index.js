const path = require("path");
const fs = require("fs");
const {TonClient, abiContract} = require("@tonclient/core");
const {libNode} = require("@tonclient/lib-node");
TonClient.useBinaryLibrary(libNode)

let referralId = "0x0";//нужно для пейлоада
const TonDice = require("./contracts/tondice.abi.json");//аби контракта дайса
const tonDiceAddress = "0:4e36e2e0b74170cea55545b3a31eb8c4e2aa7efa47d6d53c12405ca37d05c454";//адрес контракта дайса
const playerWalletAddress = "0:b3716bf33c3975647102864f12a9161de579588c645f7c5fcea1bbb050ccfa08";//адрес моего кошелька
const MultisigContract = abiContract(require('./contracts/SetcodeMultisigWallet.abi.json'));//аби контракт игрока
const keyPairFile = path.join(__dirname, "keys.json");//ключи от контракта игрока



const number = 16;//номер (вероятность) которую ставим
const client = new TonClient(
    {
        network: {
            server_address: "main.ton.dev",
            message_retries_count: 3,
        },
        abi: {
            message_expiration_timeout: 30000,
        },
    }
);


//кодируем пейлоад
async function encodeMessageBody (abi, function_name, input = {}){
    const signer = {type: "None"};
    const call_set = {function_name, input};
    return await client.abi.encode_message_body({abi, call_set, signer, is_internal: true});
}

async function bet(){
    let payload = (await encodeMessageBody(
        TonDice,
        "bet",
        {
            number: number,
            referralId,
        }
    )).body;

    const keyPair = JSON.parse(fs.readFileSync(keyPairFile, "utf8"));

    const transactionInfo = (await client.processing.process_message(
        {
            send_events: false,
            message_encode_params: {
                address: playerWalletAddress,
                abi: MultisigContract,
                call_set: {
                    function_name: 'sendTransaction',
                    input: {
                        dest: tonDiceAddress,
                        value: 1000000000,
                        flags: 3,
                        bounce: true,
                        payload: payload
                    }
                },
                signer: {
                    type: 'Keys',
                    keys: keyPair
                },
            },
        }).then(success => {
        console.log(success.transaction)
    })
        .catch(error => {
            console.error(error.message)
        }));
    client.close();
}
bet();
