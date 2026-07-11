
import React, { useEffect, useState } from "react";
import { useTonConnectUI, useTonWallet } from "@tonconnect/ui-react";
import TonWeb from "tonweb";
import Button from "@mui/material/Button";
import { useLanguage } from "../contexts/LanguageContext.jsx";

// Цены для доменных имен разной длины
const mapPrices = {
    4: 100,
    5: 50,
    6: 40,
    7: 30,
    8: 20,
    9: 10,
    10: 5,
    11: 1,
};

export const BetBtn = ({ domainName, domainAddress, timeRemaining }) => {
    const wallet = useTonWallet();
    const [tonConnectUI] = useTonConnectUI();
    const tonWeb = new TonWeb();
    
    const { language, translations } = useLanguage();
    
    const domainLength = domainName.length - 4; // длина домена без '.ton'
    const priceForPay = mapPrices[domainLength] || 1; // цена по длине домена
    const textFeeRenew = 'Domain renew by informer.ton';
    const feeServicePrice = 0.25;
    const priceRenew = 0.002;
    const feeBurnAddress = "UQDZmg4lBYBhTQslgJ-MWg9RKYa2Pjf07ul60OYLrtnfYLHx";
    
    const walletAddress = wallet ? wallet.address : "";
    
    const isTimerExpired = timeRemaining.days === 0 && timeRemaining.hours === 0 && timeRemaining.minutes === 0 && timeRemaining.seconds === 0;

    const handleSend = async (transactionType) => {
        // Рассчитываем суммы
        const pay = Math.floor(priceForPay * 1000000000).toString();
        const fee = Math.floor(feeServicePrice * 1000000000).toString();
        const renew = Math.floor(priceRenew * 1000000000).toString();

        if (!wallet) {
            tonConnectUI.openModal();
            return;
        }

        try {
            if (transactionType === "bet") {

                const testUrl = `https://app.tonkeeper.com/transfer/${domainAddress}?amount=${pay}&bin=te6cckEBAQEADgAAGE7RS2UAAAAAAAAADacdAXI=`;

                // Открываем диплинк для ставки
                window.open(testUrl, '_blank');

            } else if (transactionType === "renew") {
                const cellRenew = new tonWeb.boc.Cell();
                cellRenew.bits.writeUint(0, 32);
                cellRenew.bits.writeString(textFeeRenew);
                const payload2 = TonWeb.utils.bytesToBase64(await cellRenew.toBoc());

                await tonConnectUI.sendTransaction({
                    validUntil: Math.floor(Date.now() / 1000) + 360,
                    messages: [{
                        amount: renew,
                        address: domainAddress,
                        payload: payload2,
                    }],
                });

                // Обновление статуса подписки
                updateSubscriptionStatus(isHasBetSubs, true);
            }
        } catch (error) {
            console.error(error);
        }
    };


    return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', width: '120px', height: '50px' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <h2 style={{ color: 'white', fontSize: '18px', fontWeight: 600 }}>{translations[language].freeoption}</h2>
                    </div>
                    {/* <div className="pay_icon" onClick={() => updateSubscriptionStatus(true)} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderTopRightRadius: '15px', borderTopLeftRadius: '15px', border: '2px solid white', padding: '5px', borderBottom: 'none' }}>
                        <img style={{ width: '40px' }} src="./web3_icon.png" alt="web3icon" />
                    </div>
                    <div className="pay_icon" onClick={() => updateSubscriptionStatus(true)} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderTopRightRadius: '15px', borderTopLeftRadius: '15px', border: '2px solid white', padding: '5px', borderBottom: 'none' }}>
                        <img style={{ width: '40px', borderRadius: '50%' }} src="./toncoin_icon.png" alt="toncoinicon" />
                    </div>
                    <div className="pay_icon" onClick={() => updateSubscriptionStatus(true)} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderTopRightRadius: '15px', borderTopLeftRadius: '15px', border: '2px solid white', padding: '5px', borderBottom: 'none' }}>
                        <img style={{ width: '40px', borderRadius: '50%' }} src="./usdt_icon.png" alt="usdticon" />
                    </div> */}
                </div>
            </div>
            <div className="BetBtnBox" style={{ display: "flex", color: "white", marginBottom: '20px', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <div style={{ display: "flex", color: "white", marginBottom: '20px', flexDirection: 'column', alignItems: 'center', gap: '10px', width: '320px', border: '5px solid white', borderRadius: '25px' }}>
                    <div style={{ display: "flex", gap: "20px", width: '300px', justifyContent: 'center' }}>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={() => handleSend("renew")}
                            disabled={isTimerExpired} 
                            style={{ marginTop: "16px", border: '2px solid white', borderRadius: '25px' }}
                            className="sendBtn"
                        >
                            {translations[language].renew}
                        </Button>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={() => handleSend("bet")}
                            disabled={!isTimerExpired} 
                            style={{ marginTop: "16px", border: '2px solid white', borderRadius: '25px' }}
                            className="sendBtn"
                        >
                            {translations[language].bet}
                        </Button>
                    </div>
                    <p style={{ width: '300px', textWrap: 'wrap' }}>{translations[language].dislamerRenew}</p>
                </div>
            </div>
        </div>
    );
};


