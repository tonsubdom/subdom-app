import React from "react";
import { useTonConnectUI, useTonWallet } from "@tonconnect/ui-react";
import TonWeb from "tonweb";
import Button from "@mui/material/Button";
// import { useLanguage } from "../../../components/contexts/LanguageContext";

// Цены для доменных имен разной длины
const mapPrices: Record<number, number> = {
    4: 100,
    5: 50,
    6: 40,
    7: 30,
    8: 20,
    9: 10,
    10: 5,
    11: 1,
};

interface TimeRemaining {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
}

interface AuctionBetButtonProps {
    domainName: string;
    auctionAddress: string;
    timeRemaining: TimeRemaining;
}

export const AuctionBetButton: React.FC<AuctionBetButtonProps> = ({ 
    domainName, 
    auctionAddress, 
    timeRemaining 
}) => {
    const wallet = useTonWallet();
    const [tonConnectUI] = useTonConnectUI();
    const tonWeb = new TonWeb();

    
    const domainLength = domainName.length - 4; // длина домена без '.ton'
    const priceForPay = mapPrices[domainLength] || 1; // цена по длине домена
    const textFeeRenew = 'Domain renew by informer.ton';
    const priceRenew = 0.002;
    
    const isTimerExpired = timeRemaining.days === 0 && 
                           timeRemaining.hours === 0 && 
                           timeRemaining.minutes === 0 && 
                           timeRemaining.seconds === 0;

    const handleSend = async (transactionType: "bet" | "renew") => {
        // Рассчитываем суммы
        const pay = Math.floor(priceForPay * 1000000000).toString();
        const renew = Math.floor(priceRenew * 1000000000).toString();

        if (!wallet) {
            tonConnectUI.openModal();
            return;
        }

        try {
            if (transactionType === "bet") {
                const testUrl = `https://app.tonkeeper.com/transfer/${auctionAddress}?amount=${pay}&bin=te6cckEBAQEADgAAGE7RS2UAAAAAAAAADacdAXI=`;

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
                        address: auctionAddress,
                        payload: payload2,
                    }],
                });

                // Обновление статуса подписки (закомментировано, так как функция не определена)
                // updateSubscriptionStatus(isHasBetSubs, true);
            }
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
        
            <div 
                className="BetBtnBox" 
                style={{ 
                    display: "flex", 
                    color: "white", 
                    marginBottom: '20px', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    gap: '10px' 
                }}
            >
                <div 
                    style={{ 
                        display: "flex", 
                        color: "white", 
                        marginBottom: '20px', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        gap: '10px', 
                        width: '320px', 
                        border: '5px solid white', 
                        borderRadius: '25px' 
                    }}
                >
                    <div 
                        style={{ 
                            display: "flex", 
                            gap: "20px", 
                            width: '300px', 
                            justifyContent: 'center' 
                        }}
                    >
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={() => handleSend("renew")}
                            disabled={isTimerExpired} 
                            style={{ 
                                marginTop: "16px", 
                                border: '2px solid white', 
                                borderRadius: '25px' 
                            }}
                            className="sendBtn"
                        >
                            renew
                        </Button>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={() => handleSend("bet")}
                            disabled={!isTimerExpired} 
                            style={{ 
                                marginTop: "16px", 
                                border: '2px solid white', 
                                borderRadius: '25px' 
                            }}
                            className="sendBtn"
                        >
                            Make bid
                        </Button>
                    </div>
                    
                </div>
            </div>
        </div>
    );
};